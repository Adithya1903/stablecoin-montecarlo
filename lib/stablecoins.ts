export type StablecoinMechanism =
  | "overcollateralized"
  | "delta-neutral"
  | "fiat-backed"
  | "algorithmic";

export type StablecoinStatus = "active" | "deprecated" | "collapsed";

export type CollateralAsset = { asset: string; weight: number };
export type ReserveComponent = { type: string; percentage: number };

import { SNAPSHOTS } from "./snapshots";

export type StablecoinConfig = {
  id: string;
  name: string;
  symbol: string;
  /** Logo URL. Empty string → UI should render `fallbackEmoji` instead. */
  logoUrl: string;
  /** Emoji fallback if the icon fails to load or logoUrl is empty. */
  fallbackEmoji: string;
  mechanism: StablecoinMechanism;
  chain: string;
  description: string;
  status: StablecoinStatus;

  collateralAssets?: CollateralAsset[];
  defaultCR?: number;
  defaultLiqThreshold?: number;

  reserveFund?: number;
  underlyingAsset?: string;

  reserveComposition?: ReserveComponent[];
  regulated?: boolean;

  /** DeFiLlama pegged-asset ID for live data fetching. */
  defillamaId?: string;
};

const TOKEN_ICON = (address: string) =>
  `https://token-icons.llamao.fi/icons/tokens/1/${address}?w=48&h=48`;

export const STABLECOINS: StablecoinConfig[] = [
  // ── Overcollateralized ────────────────────────────────────────────────────
  {
    id: "dai",
    name: "Dai",
    symbol: "DAI",
    logoUrl: TOKEN_ICON("0x6b175474e89094c44da98b954eedeac495271d0f"),
    fallbackEmoji: "🟡",
    mechanism: "overcollateralized",
    chain: "multi-chain",
    description:
      "MakerDAO's multi-collateral stablecoin. ~65% ETH/stETH, ~35% USDC via the Peg Stability Module.",
    status: "active",
    collateralAssets: [...SNAPSHOTS.dai.collateral.value],
    defaultCR: SNAPSHOTS.dai.defaultCR.value,
    defaultLiqThreshold: SNAPSHOTS.dai.defaultLiqThreshold.value,
    defillamaId: "5",
  },
  {
    id: "lusd",
    name: "Liquity USD",
    symbol: "LUSD",
    logoUrl: TOKEN_ICON("0x5f98805a4e8be255a32880fdec7f6728c6568ba0"),
    fallbackEmoji: "🔷",
    mechanism: "overcollateralized",
    chain: "ethereum",
    description:
      "Liquity v1 — ETH-only collateral, 110% minimum CR, no governance, immutable contracts.",
    status: "active",
    collateralAssets: [...SNAPSHOTS.lusd.collateral.value],
    defaultCR: SNAPSHOTS.lusd.minCR.value,
    defaultLiqThreshold: SNAPSHOTS.lusd.minCR.value,
    defillamaId: "8",
  },
  {
    id: "gho",
    name: "Aave GHO",
    symbol: "GHO",
    logoUrl: TOKEN_ICON("0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f"),
    fallbackEmoji: "👻",
    mechanism: "overcollateralized",
    chain: "ethereum",
    description:
      "Aave's native stablecoin, minted against any supported Aave collateral with asset-specific CRs. (Simulated as a simplified ETH/BTC/LINK basket — see lib/snapshots.ts.)",
    status: "active",
    collateralAssets: [...SNAPSHOTS.gho.collateral.value],
    defaultCR: SNAPSHOTS.gho.defaultCR.value,
    defaultLiqThreshold: SNAPSHOTS.gho.defaultLiqThreshold.value,
    defillamaId: "118",
  },
  {
    id: "usbd",
    name: "USBD",
    symbol: "USBD",
    logoUrl: "",
    fallbackEmoji: "₿",
    mechanism: "overcollateralized",
    chain: "multi-chain (EVMs, Bitcoin L2s, Solana)",
    description:
      "BIMA Labs' Bitcoin-backed stablecoin collateralized by BTC and Babylon-staked BTC (stBTC).",
    status: "active",
    collateralAssets: [...SNAPSHOTS.usbd.collateral.value],
    defaultCR: SNAPSHOTS.usbd.defaultCR.value,
    defaultLiqThreshold: SNAPSHOTS.usbd.defaultLiqThreshold.value,
    defillamaId: "253",
  },

  // ── Delta-neutral ────────────────────────────────────────────────────────
  {
    id: "usde",
    name: "Ethena USDe",
    symbol: "USDe",
    logoUrl: TOKEN_ICON("0x4c9edd5852cd905f086c759e8383e09bff1e68b3"),
    fallbackEmoji: "⚡",
    mechanism: "delta-neutral",
    chain: "ethereum",
    description:
      "Delta-neutral synthetic dollar: long ETH/BTC spot hedged by equivalent short perp positions.",
    status: "active",
    underlyingAsset: "ETH",
    reserveFund: SNAPSHOTS.usde.reserveFund.value,
    defillamaId: "146",
  },

  // ── Fiat-backed ──────────────────────────────────────────────────────────
  {
    id: "usdc",
    name: "USD Coin",
    symbol: "USDC",
    logoUrl: TOKEN_ICON("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"),
    fallbackEmoji: "🔵",
    mechanism: "fiat-backed",
    chain: "multi-chain",
    description:
      "Circle's regulated USD-backed stablecoin, reserves held in T-bills and bank deposits.",
    status: "active",
    reserveComposition: [...SNAPSHOTS.usdc.reserveComposition.value],
    regulated: true,
    defillamaId: "2",
  },
  {
    id: "usdt",
    name: "Tether",
    symbol: "USDT",
    logoUrl: TOKEN_ICON("0xdac17f958d2ee523a2206206994597c13d831ec7"),
    fallbackEmoji: "🟢",
    mechanism: "fiat-backed",
    chain: "multi-chain",
    description:
      "Largest stablecoin by market cap; reserve composition has historically been debated.",
    status: "active",
    reserveComposition: [...SNAPSHOTS.usdt.reserveComposition.value],
    regulated: false,
    defillamaId: "1",
  },

  // ── Algorithmic ──────────────────────────────────────────────────────────
  {
    id: "ust",
    name: "TerraUSD",
    symbol: "UST",
    logoUrl: "",
    fallbackEmoji: "💀",
    mechanism: "algorithmic",
    chain: "terra",
    description:
      "Algorithmic stablecoin minted/burned against LUNA. Collapsed in May 2022 in a ~$40B death spiral.",
    status: "collapsed",
    underlyingAsset: "LUNA",
  },
];

export const STABLECOINS_BY_ID: Record<string, StablecoinConfig> =
  Object.fromEntries(STABLECOINS.map((s) => [s.id, s]));

export function getStablecoin(id: string): StablecoinConfig | undefined {
  return STABLECOINS_BY_ID[id];
}

export function stablecoinsByMechanism(
  mechanism: StablecoinMechanism
): StablecoinConfig[] {
  return STABLECOINS.filter((s) => s.mechanism === mechanism);
}
