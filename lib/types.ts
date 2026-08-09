export type SimulationParams = {
  /** RNG seed — same seed + same params reproduces identical results. Omit for a random run. */
  seed?: number;
  /** Student-t degrees of freedom for return draws (integer ≥ 3). Default 5; ≥ 100 → Gaussian. */
  nu?: number;
  /** EWMA λ for volatility clustering (e.g. 0.94). Omit for constant volatility. */
  ewmaLambda?: number;
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
  /** DAI-only: day-1 USDC depeg shock (e.g., -0.10 = USDC drops to $0.90). 0 = no shock. */
  usdcShock?: number;
  /** LUSD-only: user's personal collateralization ratio. */
  userCR?: number;
  /** LUSD-only: system-wide starting CR. Below 1.5 → Recovery Mode. */
  systemCR?: number;
  /** GHO-only: pairwise correlation between ETH/BTC/LINK returns (0..1). */
  correlation?: number;
  /** USDe-only: stationary daily funding-rate σ (e.g., 0.0005 = 0.05%). */
  fundingRateVol?: number;
  /** USDe-only: AR(1) persistence of daily funding (0..0.99). Fit from live data when available. */
  fundingPhi?: number;
  /** USDe-only: forced funding level on day 1, annualized (e.g., -0.3 = -30% APR). Decays via fundingPhi — a sustained spell, not a one-day blip. */
  fundingRateShock?: number;
  /** USDe-only: starting reserve fund in USD. */
  reserveFund?: number;
  /** USDe-only: USDe outstanding in USD. */
  totalSupply?: number;
  /** USDe-only: mean daily funding rate (e.g., 0.0001). Usually derived from history. */
  fundingMeanDaily?: number;
  /** Fiat-only: daily prob of a confidence event (bank/reg/audit). */
  eventProbability?: number;
  /** Fiat-only: fraction of supply that redeems during an event. */
  redemptionSeverity?: number;
  /** Fiat-only: weighted-avg liquidity factor of the reserve basket (0..1). */
  baseLiquidity?: number;
  /** Fiat-only: scalar multiplier on baseLiquidity (stress of banking rails). */
  reserveLiquidity?: number;
  /** Fiat-only: force a confidence event on day 1 regardless of eventProbability. */
  forceDay1Event?: boolean;
  /** UST-only: fraction of UST supply dumped on day 1 (e.g., 0.05 = 5%). */
  initialSellPressure?: number;
  /** UST-only: amplifier — a 1% UST depeg causes this × 1% drop in LUNA price. */
  reflexivityFactor?: number;
  /** UST-only: starting LUNA market cap in USD. */
  lunaStartMarketCap?: number;
  /** UST-only: UST outstanding in USD. */
  ustSupplyUsd?: number;
};

/**
 * Flat row-major path matrix: the value of path `i` on day `d` is
 * `data[i * pathLen + d]`. One typed array per run — transferable to and
 * from the simulation worker without cloning ~300k boxed numbers.
 */
export type PathMatrix = {
  data: Float64Array;
  numPaths: number;
  pathLen: number;
};

export type SimulationResult = {
  paths: PathMatrix;
  depegCount: number;
  depegProbability: number;
  /** Wilson 95% interval on depegProbability. */
  depegProbabilityCI: [number, number];
  /** Seed the run actually used (either params.seed or a fresh random one). */
  seed: number;
  /** Per-path day-of-first-breach; null if the path never depegged. */
  depegDays: (number | null)[];
  /**
   * The path with the deepest intraday minimum (unified across models —
   * a path that crashed to 0.90 and recovered is worse than one that
   * drifted to 0.97; six models previously ranked by lowest final value).
   */
  worstPath: number[];
  /** Per-day median across all paths — synthetic, not a sample path. */
  medianPath: number[];
  /** Per-day 5th percentile — synthetic, not a sample path. */
  percentile5Path: number[];
  /** Per-day 95th percentile — synthetic, not a sample path. */
  percentile95Path: number[];
  /** LUSD-only: count of paths that entered Recovery Mode at any point. */
  recoveryModeCount?: number;
  /** LUSD-only: mean day of first Recovery Mode entry across paths that entered. */
  recoveryModeAvgDay?: number | null;
  /** UST-only: parallel LUNA paths (normalized to starting price) + derived paths. */
  luna?: {
    paths: PathMatrix;
    worstPath: number[];
    medianPath: number[];
    percentile5Path: number[];
    percentile95Path: number[];
  };
};

// ---------------------------------------------------------------------------
// Live market-data types (lib/data.ts fetchers).
// ---------------------------------------------------------------------------

export interface EthMarketData {
  spotUsd: number;
  /** [ms timestamp, price] from CoinGecko. */
  prices: [number, number][];
  dailyReturns: number[];
  meanReturn: number;
  /** Daily stddev of returns. Crypto trades every day — annualize with √365, not √252. */
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
