/**
 * Sourced protocol constants. Every hardcoded number the simulators or UI
 * rely on lives here as a dated snapshot, so staleness is visible and a
 * skeptic can trace each figure. Where a simulator deliberately
 * simplifies reality, the snapshot records the real composition and the
 * `modeledAs` field states the approximation in force.
 *
 * These values were inherited from the app's original hardcodes and dated
 * to the best information available when this file was written — update
 * the `value` AND the `asOf` together when refreshing.
 */

export type Snapshot<T> = {
  value: T;
  /** When the value was observed (YYYY-MM). */
  asOf: string;
  /** Where the figure comes from. */
  source: string;
  /** How the simulator approximates this, when it deviates from reality. */
  modeledAs?: string;
};

const snap = <T>(
  value: T,
  asOf: string,
  source: string,
  modeledAs?: string
): Snapshot<T> => ({ value, asOf, source, ...(modeledAs && { modeledAs }) });

export const SNAPSHOTS = {
  dai: {
    /** Simulator's two-leg split: ETH-like collateral vs USDC via the PSM. */
    psmWeights: snap(
      { eth: 0.65, usdc: 0.35 },
      "2025-06",
      "https://daistats.com — collateral breakdown",
      "Two legs: 65% ETH-beta collateral (ETH+wstETH), 35% USDC (PSM)"
    ),
    collateral: snap(
      [
        { asset: "ETH", weight: 0.4 },
        { asset: "wstETH", weight: 0.25 },
        { asset: "USDC", weight: 0.35 },
      ],
      "2025-06",
      "https://daistats.com"
    ),
    defaultCR: snap(
      1.5,
      "2025-06",
      "https://docs.makerdao.com — ETH-A liquidation ratio ~145%; 150% typical vault posture"
    ),
    defaultLiqThreshold: snap(1.45, "2025-06", "https://docs.makerdao.com"),
  },

  lusd: {
    collateral: snap(
      [{ asset: "ETH", weight: 1.0 }],
      "2025-06",
      "https://docs.liquity.org — Liquity v1 is ETH-only by construction"
    ),
    minCR: snap(1.1, "2025-06", "https://docs.liquity.org — 110% minimum"),
    recoveryModeCR: snap(
      1.5,
      "2025-06",
      "https://docs.liquity.org — Recovery Mode below 150% TCR"
    ),
  },

  gho: {
    collateral: snap(
      [
        { asset: "ETH", weight: 0.45 },
        { asset: "wstETH", weight: 0.25 },
        { asset: "USDC", weight: 0.15 },
        { asset: "other", weight: 0.15 },
      ],
      "2025-06",
      "https://aavescan.com/gho — GHO minting collateral on Aave v3",
      "Simplified to a 50/30/20 ETH/BTC/LINK basket with vol multiples 0.75× (BTC) and 1.5× (LINK)"
    ),
    /** The simulator's simplified basket (see collateral.modeledAs). */
    modelBasket: snap(
      { wEth: 0.5, wBtc: 0.3, wLink: 0.2, btcVolMult: 0.75, linkVolMult: 1.5 },
      "2025-06",
      "Modeling approximation — see gho.collateral for the real composition"
    ),
    defaultCR: snap(1.5, "2025-06", "https://app.aave.com — asset LTVs"),
    defaultLiqThreshold: snap(1.4, "2025-06", "https://app.aave.com"),
  },

  usbd: {
    collateral: snap(
      [
        { asset: "BTC", weight: 0.6 },
        { asset: "stBTC", weight: 0.4 },
      ],
      "2025-06",
      "https://bima.money — BIMA docs"
    ),
    defaultCR: snap(2.25, "2025-06", "https://bima.money"),
    defaultLiqThreshold: snap(1.6, "2025-06", "https://bima.money"),
  },

  usde: {
    reserveFund: snap(
      50_000_000,
      "2025-06",
      "https://app.ethena.fi/dashboards/transparency — reserve fund"
    ),
    totalSupply: snap(
      3_000_000_000,
      "2025-06",
      "https://app.ethena.fi/dashboards/transparency — USDe supply"
    ),
    /** Share of the delta-neutral hedge on ETH vs BTC perps. */
    hedgeMix: snap(
      { eth: 0.6, btc: 0.4 },
      "2025-06",
      "https://app.ethena.fi/dashboards/positions"
    ),
    /** Fallback funding stats when the Binance fetch fails (daily units). */
    fundingFallback: snap(
      { meanDaily: 0.0001, sdDaily: 0.0005, phi: 0.6 },
      "2025-06",
      "Long-run ETHUSDT funding history (Binance) — order-of-magnitude fallback"
    ),
  },

  /** Per-tier liquidation behavior for the fiat run model (modeling assumptions). */
  fiatTierProfiles: snap(
    {
      "T-bills": { capacityPerDay: 0.05, haircut: 0.002, bankRail: false },
      "Bank deposits": { capacityPerDay: 0.25, haircut: 0, bankRail: true },
      "Cash & equivalents": {
        capacityPerDay: 0.25,
        haircut: 0,
        bankRail: true,
      },
      Other: { capacityPerDay: 0.02, haircut: 0.03, bankRail: false },
    },
    "2026-08",
    "Modeling assumptions: T-bill sales settle T+1 and absorb ~5%/day; bank wires clear same-day but depend on rails; 'other' (secured loans, corporate bonds) is slow and sells at a discount under fire"
  ),

  usdc: {
    reserveComposition: snap(
      [
        { type: "T-bills", percentage: 80 },
        { type: "Bank deposits", percentage: 20 },
      ],
      "2025-06",
      "https://www.circle.com/en/transparency — monthly attestations"
    ),
    totalSupply: snap(
      35_000_000_000,
      "2025-06",
      "https://defillama.com/stablecoin/usd-coin"
    ),
    eventProbability: snap(
      0.0001,
      "2025-06",
      "Modeling assumption: ~1 confidence event per ~27 years of trading days"
    ),
    redemptionSeverity: snap(
      0.1,
      "2023-03",
      "SVB weekend: ~$10B of ~$43B redeemed ≈ 10–25% attempted"
    ),
  },

  usdt: {
    reserveComposition: snap(
      [
        { type: "T-bills", percentage: 75 },
        { type: "Cash & equivalents", percentage: 10 },
        { type: "Other", percentage: 15 },
      ],
      "2025-06",
      "https://tether.to/en/transparency — quarterly attestations"
    ),
    totalSupply: snap(
      120_000_000_000,
      "2025-06",
      "https://defillama.com/stablecoin/tether"
    ),
    eventProbability: snap(
      0.0005,
      "2025-06",
      "Modeling assumption: higher than USDC for reserve-opacity history"
    ),
    redemptionSeverity: snap(
      0.15,
      "2022-05",
      "May 2022: ~$10B of ~$83B redeemed in days without breaking the peg"
    ),
  },

  ust: {
    supplyUsd: snap(
      18_000_000_000,
      "2022-05",
      "https://defillama.com/stablecoin/terrausd — pre-collapse supply"
    ),
    lunaMarketCap: snap(
      30_000_000_000,
      "2022-05",
      "CoinGecko LUNA — early-May 2022 market cap"
    ),
    lunaSupply: snap(
      350_000_000,
      "2022-05",
      "Terra chain data — pre-collapse LUNA circulating supply"
    ),
  },
} as const;

/**
 * Ordered liquidity waterfall for a fiat coin: bank-rail tiers first
 * (same-day when rails are open), then T-bills, then everything else.
 * Shares are fractions of total reserves.
 */
export function reserveTiersFor(
  coinId: "usdc" | "usdt"
): Array<{
  type: string;
  share: number;
  capacityPerDay: number;
  haircut: number;
  bankRail: boolean;
}> {
  const comp = SNAPSHOTS[coinId].reserveComposition.value;
  const profiles = SNAPSHOTS.fiatTierProfiles.value as Record<
    string,
    { capacityPerDay: number; haircut: number; bankRail: boolean }
  >;
  const tiers = comp.map((c) => {
    const p = profiles[c.type] ?? profiles["Other"];
    return {
      type: c.type,
      share: c.percentage / 100,
      capacityPerDay: p.capacityPerDay,
      haircut: p.haircut,
      bankRail: p.bankRail,
    };
  });
  tiers.sort((a, b) => {
    if (a.bankRail !== b.bankRail) return a.bankRail ? -1 : 1;
    return b.capacityPerDay - a.capacityPerDay;
  });
  return tiers;
}
