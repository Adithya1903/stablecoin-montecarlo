// All site copy lives here. Edit facts without touching components.

export type SiteLink = {
  label: string;
  href: string;
};

export type Project = {
  /** Anchor id, e.g. "launchpad" -> /#launchpad */
  id: string;
  name: string;
  oneLiner: string;
  /** Single metadata line: attribution, org/year/stack. */
  meta: string;
  paragraphs: string[];
  links: SiteLink[];
};

export type Paper = {
  title: string;
  note: string;
};

export const identity = {
  name: "Adithya Ganesh",
  tagline:
    "I build stablecoin and AI products, and the developer ecosystems around them. Product & Developer Relations at MOI Protocol (Sarva Labs).",
  location: "NYC metro",
};

export const links: SiteLink[] = [
  { label: "GitHub", href: "https://github.com/Adithya1903" },
  { label: "GitHub (work)", href: "https://github.com/Sarvalabs-adithya" },
  { label: "LinkedIn", href: "https://linkedin.com/in/adithya-ganesh1" },
  { label: "X", href: "https://x.com/AdithyaGanesh_" },
  { label: "Email", href: "mailto:adithyaganesh9@gmail.com" },
];

export const nav: SiteLink[] = [
  { label: "Projects", href: "#projects" },
  { label: "Research", href: "#research" },
  { label: "About", href: "#about" },
];

export const projects: Project[] = [
  {
    id: "launchpad",
    name: "MOI Agent Launchpad",
    oneLiner: "Deploy an autonomous AI agent on-chain in under 60 seconds.",
    meta: "Work, Sarva Labs · launched Aug 2026",
    paragraphs: [
      "The problem: getting someone who has never touched a blockchain to deploy an agent with a real on-chain identity in under a minute. Every added onboarding step loses people.",
      "The decisions: 10 pre-built templates (price monitoring, expense tracking, job search, daily briefings) instead of a blank canvas, because “configure anything” is where new users stall. Three setup fields, not thirty. Results delivered on Telegram, because meeting users in an app they already open beats teaching them a dashboard. Free deployment on MOI devnet, and an agent marketplace so the first thing new users see is what’s already running.",
      "My role: end-to-end, from concept through public launch. Why it matters: every deployed agent is a new on-chain identity and a new ecosystem user. “Read the docs” onboarding became a 60-second product experience.",
    ],
    links: [{ label: "launchpad.moi.technology", href: "https://launchpad.moi.technology" }],
  },
  {
    id: "agent-dating",
    name: "agent-dating",
    oneLiner: "Two AI agents with on-chain identities, autonomously dating each other. Yes, really.",
    meta: "Work, Sarva Labs · 2026, open source, TypeScript",
    paragraphs: [
      "An OpenClaw plugin where each dater is a genuinely independent agent: its own model, its own wallet, its own identity on MOI’s on-chain agent registry. Agents discover peers and message over a real A2A transport (direct HTTP with an SSE relay fallback so agents behind NAT stay reachable), rendered in a live WhatsApp-style spectator view.",
      "Incoming messages route into the agent’s real LLM session (it knows it’s on a date and answers as itself), with a free offline persona mode as fallback. Deterministic date scoring. A wingman mode where owners text as their agent, sender-signed with a wallet-derived key, with a global leaderboard. Per-peer reply caps and block controls, 9 tools, a one-command installer.",
      "A ridiculous demo built on serious infrastructure: shipped to prove MOI’s agent registry with something people actually want to watch. Published on ClawHub.",
    ],
    links: [
      { label: "github.com/sarvalabs-adithya/agent-dating", href: "https://github.com/sarvalabs-adithya/agent-dating" },
    ],
  },
  {
    id: "stablecoin-tools",
    name: "Stablecoin Tools",
    oneLiner:
      "Most dashboards tell you the price is $1.00. Stablecoin Tools asks what has to break before it isn’t.",
    meta: "Personal, ongoing · Next.js, TypeScript",
    paragraphs: [
      "Mechanism-specific Monte Carlo stress tests across 8 stablecoins, on live market data from DeFiLlama and CoinGecko. Overcollateralized, delta-neutral, and fiat-backed designs each get their own failure model, because they fail differently.",
      "The models come from my five published papers on stablecoin collateral risk and options-based hedging, turned into software anyone can run. In active development: liquidation calculators, safe-borrow estimators, and risk-adjusted yield comparisons.",
    ],
    links: [{ label: "stablecointools.org", href: "https://stablecointools.org" }],
  },
  {
    id: "verde",
    name: "Verde",
    oneLiner:
      "A USD neobank for Argentine freelancers: get paid in dollars, spend in pesos, earn yield while you sleep.",
    meta: "Personal, in active development · React Native (Expo), TypeScript, Zustand",
    paragraphs: [
      "“Verdes” is what Argentine freelancers actually call dollars. Verde runs on stablecoin rails, but the word “crypto” appears nowhere in the product: users see “your dollars,” the infrastructure sees USDC. Every function maps 1:1 to a real integration: virtual US bank accounts on-ramping ACH and wire to USDC (Bridge), embedded wallets and auth (Privy), LATAM virtual card issuing with point-of-sale FX (Pomelo), and yield from tokenized T-bills (BlackRock BUIDL via Securitize).",
      "The interactive app is complete: onboarding, balance and activity feed, send flow, a virtual card with freeze, and live yield accruing in real time. I’m now swapping the mocked layer for live integrations, starting with auth and the on-ramp.",
      "The question underneath it: what does stablecoin infrastructure look like when the user never has to know it’s there?",
    ],
    links: [],
  },
  {
    id: "sprint",
    name: "MOI Sprint",
    oneLiner: "A speedrun-style learning platform for MOI development, modeled on SpeedRunEthereum.",
    meta: "Work, Sarva Labs · 2025-2026",
    paragraphs: [
      "Developers level up through hands-on challenges instead of reading docs cover to cover.",
      "Built alongside the ~50 pages of core documentation I authored for Coco, MOI’s smart contract language, and for MOI protocol architecture. Sprint is the on-ramp from “curious” to “shipping on MOI.”",
    ],
    links: [
      { label: "cocolang.dev", href: "https://cocolang.dev" },
      { label: "docs.moi.technology", href: "https://docs.moi.technology" },
    ],
  },
  {
    id: "liquidease",
    name: "LiquidEase",
    oneLiner: "Single-sided liquidity provision. Built and won at ETH Denver 2023.",
    meta: "Personal · ETH Denver 2023, 0x bounty winner, Solidity, Next.js",
    paragraphs: [
      "A smart contract routes optimal swaps through the 0x aggregator so LPs enter positions with one asset.",
      "OpenZeppelin Defender autotasks and sentinels handle automated rebalancing on volume- and time-based triggers, for example auto-exit if LP trading volume drops more than 15% in 24 hours.",
    ],
    links: [],
  },
];

export const research = {
  whitePaper:
    "White paper (co-author, BIMA Labs, 2024): stablecoin risk mitigation and capital-allocation guidance, built on a framework evaluating 70+ stablecoin, LST, and LRT protocols across collateral, peg mechanics, and liquidation logic, with Python and R hedging simulations.",
  papersIntro: "Five papers, sole author:",
  papers: [
    { title: "Delta & Gamma Neutral Collar Strategy", note: "downside risk in stablecoin reserves" },
    { title: "Theta & Vega Neutral Butterfly Spread", note: "yield curves under varying volatility" },
    { title: "Rho Neutral Yield Enhancement with Synthetic Positions", note: "rate arbitrage in DeFi" },
    { title: "Gamma Neutral Calendar Spread", note: "long-term volatility in collateralized portfolios" },
    { title: "Theta Neutral Iron Condor", note: "hedging AMM impermanent loss" },
  ] satisfies Paper[],
};

// Fill these in when the papers have public links; keys match paper titles.
export const PAPER_LINKS: Record<string, string | null> = {
  "Delta & Gamma Neutral Collar Strategy": null,
  "Theta & Vega Neutral Butterfly Spread": null,
  "Rho Neutral Yield Enhancement with Synthetic Positions": null,
  "Gamma Neutral Calendar Spread": null,
  "Theta Neutral Iron Condor": null,
};

export const about: string[] = [
  "BS in Applied Mathematics & Economics with a CS minor from Purdue (2025), where I taught a 12-week Solidity course and ran ops for Boiler Blockchain.",
  "Before MOI, I did stablecoin research at BIMA Labs.",
  "At MOI I also co-authored the STiFF enterprise stablecoin spec, branded stablecoin issuance and settlement at 80-90% lower cost than card networks, and I run weekly dev talks, the MOI Forge grant program, and an 11-part community call series with 1,500+ cumulative views.",
];
