export type Stablecoin = {
  id: "dai" | "usde" | "crvusd";
  name: string;
  mechanism: string; // 'crypto-collateralized' | 'delta-neutral' | 'soft-liquidation'
  currentCollateralRatio: number;
  liquidationThreshold: number;
  circulatingSupply: number;
  pegPrice: number; // should be ~1.00
  collateralAssets: string[];
};

export type SimulationParams = {
  volatility: number; // daily std dev (e.g., 0.04 = 4%)
  days: number; // simulation horizon (7-90)
  numSimulations: number; // 10000
  initialCrash: number; // forced day-1 drop (0 to -0.6)
  collateralRatio: number; // current CR (e.g., 1.5 = 150%)
  liquidationThreshold: number; // e.g., 1.45 = 145%
  /** USBD-only: simulate stBTC/BTC basis risk alongside BTC price. */
  lstBasisRisk?: boolean;
  /** Optional weights of BTC vs stBTC leg (must sum to 1). Only read when lstBasisRisk is true. */
  lstWeights?: { btc: number; stBtc: number };
};

export type SimulationResult = {
  paths: number[][]; // [simulation][day] = price
  depegCount: number;
  depegProbability: number;
  /** Per-path day-of-first-breach; null if the path never depegged. */
  depegDays: (number | null)[];
  worstPath: number[];
  /** Per-day median across all paths — synthetic, not a sample path. */
  medianPath: number[];
  /** Per-day 5th percentile — synthetic, not a sample path. */
  percentile5Path: number[];
  /** Per-day 95th percentile — synthetic, not a sample path. */
  percentile95Path: number[];
};

// ---------------------------------------------------------------------------
// Legacy client-facing types (still referenced by app/page.tsx and the mock
// snapshot helpers in lib/data.ts). Safe to delete once the page is migrated
// to the new Stablecoin model.
// ---------------------------------------------------------------------------

export type StablecoinId = "DAI" | "USDe" | "crvUSD";

export interface MarketSnapshot {
  id: StablecoinId;
  name: string;
  symbol: string;
  priceUsd: number;
  marketCapUsd?: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Data-layer types (from Prompt 2).
// ---------------------------------------------------------------------------

export interface StablecoinMetadata {
  id: string;
  name: string;
  symbol: string;
  pegMechanism: string;
  circulatingUsd: number;
  price: number | null;
}

export interface StablecoinHistoryPoint {
  /** Unix seconds. */
  date: number;
  totalCirculatingUsd: number;
}

export interface StablecoinsData {
  coins: StablecoinMetadata[];
  history: StablecoinHistoryPoint[];
}

export interface EthMarketData {
  spotUsd: number;
  /** [ms timestamp, price] from CoinGecko. */
  prices: [number, number][];
  dailyReturns: number[];
  meanReturn: number;
  /** Daily stddev of returns — feed as sqrt(252) * volatility for annualized. */
  volatility: number;
}

export interface FundingRatePoint {
  fundingTime: number;
  fundingRate: number;
}

export interface FundingRateStats {
  rates: FundingRatePoint[];
  mean: number;
  stdDev: number;
}
