import type { EthMarketData, FundingRateStats } from "./types";

const REVALIDATE_SECONDS = 300;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(
      `Fetch failed (${res.status} ${res.statusText}): ${url}`
    );
  }
  return (await res.json()) as T;
}

interface CgSimplePriceResponse {
  ethereum: { usd: number };
}

interface CgMarketChartResponse {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export async function fetchEthMarketData(): Promise<EthMarketData> {
  const [simple, chart] = await Promise.all([
    fetchJson<CgSimplePriceResponse>(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    ),
    fetchJson<CgMarketChartResponse>(
      "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=365"
    ),
  ]);

  const prices = chart.prices;
  const dailyReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1][1];
    const curr = prices[i][1];
    if (prev > 0) dailyReturns.push((curr - prev) / prev);
  }

  const n = dailyReturns.length;
  const meanReturn =
    n > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / n : 0;
  const variance =
    n > 1
      ? dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (n - 1)
      : 0;
  const volatility = Math.sqrt(variance);

  return {
    spotUsd: simple.ethereum.usd,
    prices,
    dailyReturns,
    meanReturn,
    volatility,
  };
}

export async function fetchBtcMarketData(): Promise<EthMarketData> {
  const [simple, chart] = await Promise.all([
    fetchJson<{ bitcoin: { usd: number } }>(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    ),
    fetchJson<CgMarketChartResponse>(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365"
    ),
  ]);
  const prices = chart.prices;
  const dailyReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1][1];
    const curr = prices[i][1];
    if (prev > 0) dailyReturns.push((curr - prev) / prev);
  }
  const n = dailyReturns.length;
  const meanReturn = n > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / n : 0;
  const variance =
    n > 1
      ? dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (n - 1)
      : 0;
  return {
    spotUsd: simple.bitcoin.usd,
    prices,
    dailyReturns,
    meanReturn,
    volatility: Math.sqrt(variance),
  };
}

interface BinanceFundingRateEntry {
  symbol: string;
  fundingTime: number;
  fundingRate: string;
  markPrice?: string;
}

export async function fetchEthFundingRates(): Promise<FundingRateStats> {
  const raw = await fetchJson<BinanceFundingRateEntry[]>(
    "https://fapi.binance.com/fapi/v1/fundingRate?symbol=ETHUSDT&limit=500"
  );
  const rates = raw.map((r) => ({
    fundingTime: r.fundingTime,
    fundingRate: parseFloat(r.fundingRate),
  }));
  const n = rates.length;
  const mean = n > 0 ? rates.reduce((s, r) => s + r.fundingRate, 0) / n : 0;
  const variance =
    n > 1
      ? rates.reduce((s, r) => s + (r.fundingRate - mean) ** 2, 0) / (n - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  return { rates, mean, stdDev };
}
