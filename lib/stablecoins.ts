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

/**
 * DeFiLlama token-icons CDN — verified live for each address below (HTTP 200).
 * Ethereum mainnet only (chain id 1). UST has no Ethereum contract so it
 * falls back to emoji.
 */
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
      "MakerDAO's multi-collateral stablecoin backed by ETH, staked ETH, USDC via the PSM, and other assets.",
    status: "active",
    collateralAssets: [
      { asset: "ETH", weight: 0.4 },
      { asset: "wstETH", weight: 0.25 },
      { asset: "USDC", weight: 0.25 },
      { asset: "other", weight: 0.1 },
    ],
    defaultCR: 1.5,
    defaultLiqThreshold: 1.45,
    defillamaId: "5",
  },
  {
    id: "usds",
    name: "Sky USDS",
    symbol: "USDS",
    logoUrl: TOKEN_ICON("0xdc035d45d973e3ec169d2276ddab16f1e407384f"),
    fallbackEmoji: "🔵",
    mechanism: "overcollateralized",
    chain: "multi-chain",
    description:
      "Sky (formerly MakerDAO) successor to DAI with similar multi-collateral backing.",
    status: "active",
    collateralAssets: [
      { asset: "ETH", weight: 0.4 },
      { asset: "wstETH", weight: 0.25 },
      { asset: "USDC", weight: 0.25 },
      { asset: "other", weight: 0.1 },
    ],
    defaultCR: 1.5,
    defaultLiqThreshold: 1.45,
    defillamaId: "209",
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
    id: "bold",
    name: "Liquity BOLD",
    symbol: "BOLD",
    logoUrl: TOKEN_ICON("0x6440f144b7e50d6a8439336510312d2f54beb01d"),
    fallbackEmoji: "🟦",
    mechanism: "overcollateralized",
    chain: "ethereum",
    description:
      "Liquity v2 — multi-collateral (ETH, wstETH, rETH) with user-set interest rates, 110% minimum CR.",
    status: "active",
    collateralAssets: [
      { asset: "ETH", weight: 0.5 },
      { asset: "wstETH", weight: 0.3 },
      { asset: "rETH", weight: 0.2 },
    ],
    defaultCR: 1.1,
    defaultLiqThreshold: 1.1,
    defillamaId: "269",
  },
  {
    id: "crvusd",
    name: "Curve USD",
    symbol: "crvUSD",
    logoUrl: TOKEN_ICON("0xf939e0a03fb07f59a73314e73794be0e57ac1b4e"),
    fallbackEmoji: "🌀",
    mechanism: "overcollateralized",
    chain: "ethereum",
    description:
      "Curve's stablecoin using LLAMMA soft-liquidation — collateral is gradually rebalanced rather than force-sold.",
    status: "active",
    collateralAssets: [
      { asset: "ETH", weight: 0.4 },
      { asset: "wstETH", weight: 0.35 },
      { asset: "wBTC", weight: 0.25 },
    ],
    defaultCR: 1.15,
    defaultLiqThreshold: 1.13,
    defillamaId: "110",
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
    id: "dola",
    name: "Dola",
    symbol: "DOLA",
    logoUrl: TOKEN_ICON("0x865377367054516e17014ccded1e7d814edc9ce4"),
    fallbackEmoji: "💵",
    mechanism: "overcollateralized",
    chain: "multi-chain",
    description:
      "Inverse Finance's stablecoin, borrowed via the FiRM fixed-rate market against multiple collaterals.",
    status: "active",
    collateralAssets: [
      { asset: "ETH", weight: 0.4 },
      { asset: "wstETH", weight: 0.3 },
      { asset: "other", weight: 0.3 },
    ],
    defaultCR: 1.5,
    defaultLiqThreshold: 1.4,
    defillamaId: "15",
  },
  {
    id: "susd",
    name: "Synthetix USD",
    symbol: "sUSD",
    logoUrl: TOKEN_ICON("0x57ab1ec28d129707052df4df418d58a2d46d5f51"),
    fallbackEmoji: "⚗️",
    mechanism: "overcollateralized",
    chain: "multi-chain",
    description:
      "Synthetix stablecoin backed by SNX staked at ~400% collateralization.",
    status: "active",
    collateralAssets: [{ asset: "SNX", weight: 1.0 }],
    defaultCR: 4.0,
    defaultLiqThreshold: 1.5,
    defillamaId: "22",
  },
  {
    id: "mim",
    name: "Magic Internet Money",
    symbol: "MIM",
    logoUrl: TOKEN_ICON("0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3"),
    fallbackEmoji: "🪄",
    mechanism: "overcollateralized",
    chain: "multi-chain",
    description:
      "Abracadabra's stablecoin, backed primarily by interest-bearing tokens (yvTokens, stkTokens).",
    status: "active",
    collateralAssets: [
      { asset: "yield-bearing", weight: 0.8 },
      { asset: "other", weight: 0.2 },
    ],
    defaultCR: 1.3,
    defaultLiqThreshold: 1.25,
    defillamaId: "10",
  },
  {
    id: "alusd",
    name: "Alchemix USD",
    symbol: "alUSD",
    logoUrl: TOKEN_ICON("0xbc6da0fe9ad5f3b0d58160288917aa56653660e9"),
    fallbackEmoji: "⚱️",
    mechanism: "overcollateralized",
    chain: "ethereum",
    description:
      "Self-repaying loans against yield-bearing collateral — future yield pays down the debt.",
    status: "active",
    collateralAssets: [{ asset: "yield-bearing", weight: 1.0 }],
    defaultCR: 2.0,
    defaultLiqThreshold: 2.0,
    defillamaId: "20",
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
  {
    id: "eusd",
    name: "Lybra eUSD",
    symbol: "eUSD",
    logoUrl: TOKEN_ICON("0xdf3ac4f479375802a821f7b7b46cd7eb5e4262cc"),
    fallbackEmoji: "🔶",
    mechanism: "overcollateralized",
    chain: "ethereum",
    description:
      "Interest-bearing stablecoin backed by stETH — holders earn a share of Lido staking yield.",
    status: "active",
    collateralAssets: [{ asset: "stETH", weight: 1.0 }],
    defaultCR: 1.5,
    defaultLiqThreshold: 1.5,
    defillamaId: "109",
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
  {
    id: "susde",
    name: "Staked USDe",
    symbol: "sUSDe",
    logoUrl: TOKEN_ICON("0x9d39a5de30e57443bff2a8307a4256c8797a3497"),
    fallbackEmoji: "🔋",
    mechanism: "delta-neutral",
    chain: "ethereum",
    description:
      "Staked version of USDe earning yield from perp funding rates and staked ETH.",
    status: "active",
    underlyingAsset: "ETH",
    reserveFund: 50_000_000,
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
  {
    id: "pyusd",
    name: "PayPal USD",
    symbol: "PYUSD",
    logoUrl: TOKEN_ICON("0x6c3ea9036406852006290770bedfcaba0e23a0e8"),
    fallbackEmoji: "🅿️",
    mechanism: "fiat-backed",
    chain: "multi-chain",
    description:
      "PayPal's regulated USD-backed stablecoin issued by Paxos.",
    status: "active",
    reserveComposition: [
      { type: "T-bills", percentage: 90 },
      { type: "Cash", percentage: 10 },
    ],
    regulated: true,
    defillamaId: "120",
  },
  {
    id: "tusd",
    name: "TrueUSD",
    symbol: "TUSD",
    logoUrl: TOKEN_ICON("0x0000000000085d4780b73119b644ae5ecd22b376"),
    fallbackEmoji: "🔹",
    mechanism: "fiat-backed",
    chain: "multi-chain",
    description: "USD-backed stablecoin with on-chain attestations of reserves.",
    status: "active",
    reserveComposition: [{ type: "USD reserves", percentage: 100 }],
    regulated: false,
    defillamaId: "7",
  },
  {
    id: "usdp",
    name: "Pax Dollar",
    symbol: "USDP",
    logoUrl: TOKEN_ICON("0x8e870d67f660d95d5be530380d0ec0bd388289e1"),
    fallbackEmoji: "⚪",
    mechanism: "fiat-backed",
    chain: "multi-chain",
    description: "Paxos-issued regulated USD-backed stablecoin.",
    status: "active",
    reserveComposition: [
      { type: "T-bills", percentage: 95 },
      { type: "Cash", percentage: 5 },
    ],
    regulated: true,
    defillamaId: "11",
  },
  {
    id: "fdusd",
    name: "First Digital USD",
    symbol: "FDUSD",
    logoUrl: TOKEN_ICON("0xc5f0f7b66764f6ec8c8dff7ba683102295e16409"),
    fallbackEmoji: "🟣",
    mechanism: "fiat-backed",
    chain: "multi-chain",
    description: "First Digital Labs' USD-backed stablecoin (Hong Kong).",
    status: "active",
    reserveComposition: [
      { type: "T-bills", percentage: 85 },
      { type: "Cash", percentage: 15 },
    ],
    regulated: false,
    defillamaId: "119",
  },
  {
    id: "gusd",
    name: "Gemini Dollar",
    symbol: "GUSD",
    logoUrl: TOKEN_ICON("0x056fd409e1d7a124bd7017459dfea2f387b6d5cd"),
    fallbackEmoji: "💎",
    mechanism: "fiat-backed",
    chain: "ethereum",
    description:
      "Gemini-issued regulated USD-backed stablecoin under NYDFS oversight.",
    status: "active",
    reserveComposition: [
      { type: "T-bills", percentage: 90 },
      { type: "Cash", percentage: 10 },
    ],
    regulated: true,
    defillamaId: "19",
  },

  // ── Algorithmic ──────────────────────────────────────────────────────────
  {
    id: "ust",
    name: "TerraUSD",
    symbol: "UST",
    logoUrl: "", // No Ethereum contract — renders via fallbackEmoji.
    fallbackEmoji: "💀",
    mechanism: "algorithmic",
    chain: "terra",
    description:
      "Algorithmic stablecoin minted/burned against LUNA. Collapsed in May 2022 in a ~$40B death spiral.",
    status: "collapsed",
    underlyingAsset: "LUNA",
  },
  {
    id: "frax",
    name: "Frax",
    symbol: "FRAX",
    logoUrl: TOKEN_ICON("0x853d955acef822db058eb8505911ed77f175b99e"),
    fallbackEmoji: "🧊",
    mechanism: "algorithmic",
    chain: "multi-chain",
    description:
      "Originally fractional-algorithmic (partly USDC-backed, partly FXS-stabilized). Now fully collateralized.",
    status: "active",
    reserveComposition: [
      { type: "USDC", percentage: 92 },
      { type: "Other", percentage: 8 },
    ],
    defillamaId: "6",
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
