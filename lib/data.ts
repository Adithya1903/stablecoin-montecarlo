import type {
  EthMarketData,
  FundingRateStats,
  MarketSnapshot,
  StablecoinId,
  StablecoinsData,
} from "./types";

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

interface LlamaStablecoinsResponse {
  peggedAssets: Array<{
    id: string;
    name: string;
    symbol: string;
    pegType?: string;
    pegMechanism?: string;
    circulating?: Record<string, number | undefined>;
    price?: number | null;
  }>;
}

interface LlamaHistoryEntry {
  date: string | number;
  totalCirculatingUSD?: Record<string, number | undefined>;
}

export async function fetchStablecoinsData(): Promise<StablecoinsData> {
  const [list, history] = await Promise.all([
    fetchJson<LlamaStablecoinsResponse>(
      "https://stablecoins.llama.fi/stablecoins"
    ),
    fetchJson<LlamaHistoryEntry[]>(
      "https://stablecoins.llama.fi/stablecoincharts/all"
    ),
  ]);

  const coins = list.peggedAssets.map((a) => {
    const peggedUsd = a.circulating?.peggedUSD;
    return {
      id: a.id,
      name: a.name,
      symbol: a.symbol,
      pegMechanism: a.pegMechanism ?? a.pegType ?? "unknown",
      circulatingUsd: typeof peggedUsd === "number" ? peggedUsd : 0,
      price: a.price ?? null,
    };
  });

  const normalizedHistory = history.map((h) => {
    const usd = h.totalCirculatingUSD?.peggedUSD;
    return {
      date: typeof h.date === "string" ? Number(h.date) : h.date,
      totalCirculatingUsd: typeof usd === "number" ? usd : 0,
    };
  });

  return { coins, history: normalizedHistory };
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

interface BinanceFundingRateEntry {
  symbol: string;
  fundingTime: number;
  fundingRate: string;
  markPrice?: string;
}

export async function fetchEthFundingRates(): Promise<FundingRateStats> {
  const raw = await fetchJson<BinanceFundingRateEntry[]>(
    "https://fapi.binance.com/fapi/v1/fundingRate?symbol=ETHUSDT&limit=100"
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

const BASE: Record<
  StablecoinId,
  Omit<MarketSnapshot, "priceUsd" | "updatedAt">
> = {
  DAI: {
    id: "DAI",
    name: "Dai Stablecoin",
    symbol: "DAI",
    marketCapUsd: 5_300_000_000,
  },
  USDe: {
    id: "USDe",
    name: "Ethena USDe",
    symbol: "USDe",
    marketCapUsd: 3_100_000_000,
  },
  crvUSD: {
    id: "crvUSD",
    name: "crvUSD",
    symbol: "crvUSD",
    marketCapUsd: 160_000_000,
  },
};

/** Simulated network latency for demo purposes. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches the latest (mock) market snapshot for a stablecoin.
 * Replace the implementation with a real HTTP client when wiring an API.
 */
export async function fetchStablecoinSnapshot(
  id: StablecoinId
): Promise<MarketSnapshot> {
  await delay(180 + Math.floor(Math.random() * 220));
  const row = BASE[id];
  const jitter = 1 + (Math.random() - 0.5) * 0.0006;
  const anchors: Record<StablecoinId, number> = {
    DAI: 0.9998,
    USDe: 1.0001,
    crvUSD: 0.9995,
  };
  return {
    ...row,
    priceUsd: anchors[id] * jitter,
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchAllStablecoinSnapshots(): Promise<MarketSnapshot[]> {
  const ids: StablecoinId[] = ["DAI", "USDe", "crvUSD"];
  return Promise.all(ids.map((id) => fetchStablecoinSnapshot(id)));
}
