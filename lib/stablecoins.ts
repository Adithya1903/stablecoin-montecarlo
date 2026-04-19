export type StablecoinMechanism =
  | "overcollateralized"
  | "delta-neutral"
  | "fiat-backed"
  | "algorithmic";

export type StablecoinStatus = "active" | "deprecated" | "collapsed";

export type CollateralAsset = { asset: string; weight: number };
export type ReserveComponent = { type: string; percentage: number };

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
    collateralAssets: [
      { asset: "ETH", weight: 0.4 },
      { asset: "wstETH", weight: 0.25 },
      { asset: "USDC", weight: 0.35 },
    ],
    defaultCR: 1.5,
    defaultLiqThreshold: 1.45,
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
    collateralAssets: [{ asset: "ETH", weight: 1.0 }],
    defaultCR: 1.1,
    defaultLiqThreshold: 1.1,
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
      "Aave's native stablecoin, minted against any supported Aave collateral with asset-specific CRs.",
    status: "active",
    collateralAssets: [
      { asset: "ETH", weight: 0.45 },
      { asset: "wstETH", weight: 0.25 },
      { asset: "USDC", weight: 0.15 },
      { asset: "other", weight: 0.15 },
    ],
    defaultCR: 1.5,
    defaultLiqThreshold: 1.4,
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
    collateralAssets: [
      { asset: "BTC", weight: 0.6 },
      { asset: "stBTC", weight: 0.4 },
    ],
    defaultCR: 2.25,
    defaultLiqThreshold: 1.6,
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
    reserveFund: 50_000_000,
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
    reserveComposition: [
      { type: "T-bills", percentage: 80 },
      { type: "Bank deposits", percentage: 20 },
    ],
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
    reserveComposition: [
      { type: "T-bills", percentage: 75 },
      { type: "Cash & equivalents", percentage: 10 },
      { type: "Other", percentage: 15 },
    ],
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
