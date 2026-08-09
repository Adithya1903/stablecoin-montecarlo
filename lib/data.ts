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

async function fetchFundingRates(symbol: string): Promise<FundingRateStats> {
  const raw = await fetchJson<BinanceFundingRateEntry[]>(
    `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=500`
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

export async function fetchEthFundingRates(): Promise<FundingRateStats> {
  return fetchFundingRates("ETHUSDT");
}

export async function fetchBtcFundingRates(): Promise<FundingRateStats> {
  return fetchFundingRates("BTCUSDT");
}

/**
 * Fit an AR(1) — f_t = μ + φ(f_{t−1} − μ) + ε — to a daily funding series
 * blended across the hedge legs. 8h points are summed into daily fundings
 * first; φ is the lag-1 autocorrelation, and the returned sd is the
 * STATIONARY daily σ (what `SimulationParams.fundingRateVol` expects).
 */
export function fitBlendedFundingAR1(
  legs: Array<{ stats: FundingRateStats; weight: number }>
): { meanDaily: number; sdDaily: number; phi: number } | null {
  const usable = legs.filter((l) => l.stats.rates.length > 6);
  if (usable.length === 0) return null;
  const totalW = usable.reduce((s, l) => s + l.weight, 0);

  // Blend pointwise from the end (series are aligned 8h grids; the tail
  // is the most recent shared window).
  const minLen = Math.min(...usable.map((l) => l.stats.rates.length));
  const blended8h: number[] = [];
  for (let i = 0; i < minLen; i++) {
    let v = 0;
    for (const l of usable) {
      const arr = l.stats.rates;
      v += (l.weight / totalW) * arr[arr.length - minLen + i].fundingRate;
    }
    blended8h.push(v);
  }

  // Aggregate 3×8h → daily.
  const daily: number[] = [];
  for (let i = 0; i + 2 < blended8h.length; i += 3) {
    daily.push(blended8h[i] + blended8h[i + 1] + blended8h[i + 2]);
  }
  const n = daily.length;
  if (n < 5) return null;

  const mean = daily.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const d = daily[i] - mean;
    den += d * d;
    if (i > 0) num += d * (daily[i - 1] - mean);
  }
  const phi = den > 0 ? Math.max(0, Math.min(0.99, num / den)) : 0;
  const sdDaily = Math.sqrt(den / Math.max(1, n - 1));
  return { meanDaily: mean, sdDaily, phi };
}
