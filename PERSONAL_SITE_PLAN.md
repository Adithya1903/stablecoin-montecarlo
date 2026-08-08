# Personal Site Build - Handoff Plan

Branch: `claude/adithya-personal-site-6aad18`. Continue the build from this doc.

## Status

- [x] Fetched the `design-taste-frontend` (taste-skill) design skill; committed at `.claude/skills/design-taste-frontend/SKILL.md`. **Read it before writing any UI code.**
- [ ] Everything else. No site code written yet.

## Key decisions already made

1. **Do not touch the simulator app.** This repo's root is the stablecoin-montecarlo app (deployed as Vercel project `scmc`). Build the personal site as a self-contained project in a **`personal-site/` subdirectory** with its own `package.json`. It can later be moved to its own repo, or deployed by pointing a new Vercel project's Root Directory at `personal-site/`.
2. Stack: Next.js (App Router) + Tailwind + TypeScript, single route `/`. All copy in one typed `content.ts`.
3. Static, fast (Lighthouse 95+), responsive, accessible. Dark mode via `prefers-color-scheme` only, no toggle.
4. SEO: title/description, Open Graph + Twitter meta, favicon. `npm run build` (inside `personal-site/`) must pass clean.

## Design spec (from the brief; the taste skill governs everything else)

- Near-monochrome: off-white bg, near-black text (dark mode inverts). ONE accent: deep dollar-green (#2F6B3E family) for links, small labels, one or two moments. No gradients, no glassmorphism, no card-shadow grids.
- Typography-forward, editorial: strong hierarchy, ~70ch measure, generous whitespace. One good variable font (system fallbacks fine). Note the taste skill discourages Inter as default.
- Motion: at most a subtle fade-up on section entry. Honor `prefers-reduced-motion`.
- Section anchors (`#launchpad` etc.). Tiny fixed top bar: name + 3-4 anchor links.
- Taste-skill hard rules that bite here: ZERO em-dashes anywhere; eyebrow labels max 1 per 3 sections; no decorative dots; no section-number labels; no scroll cues; one accent locked page-wide; one corner-radius system.

## Page structure

1. **Intro**: name; one line: "I build stablecoin and AI products, and the developer ecosystems around them. Product & Developer Relations at MOI Protocol (Sarva Labs)." Links: GitHub (github.com/Adithya1903 and github.com/Sarvalabs-adithya), LinkedIn (linkedin.com/in/adithya-ganesh1), X (x.com/AdithyaGanesh_), email (adithyaganesh9@gmail.com). NYC metro.
2. **Projects**: six entries, stacked vertically, each a compact case study (~150-250 words): name + one-liner, role/year/stack metadata line, 2-3 short paragraphs (problem, what I built and key decisions, status), plus link. No tabs or modals.
3. **Research**: white paper + five papers, one line each.
4. **Now / About**: three sentences.
5. **Footer**: same links.

## CONTENT (use exactly this; invent nothing)

First person, plain confident prose. Banned words: passionate, results-driven, leverage, seamless, cutting-edge. The only numbers allowed on the site are the ones below.

### MOI Agent Launchpad (#launchpad) - work, Sarva Labs, launched Aug 2026, live: launchpad.moi.technology
Deploy an autonomous AI agent on-chain in under 60 seconds. The problem: getting someone who's never touched a blockchain to deploy an agent with a real on-chain identity in under a minute; every added onboarding step loses people. The decisions: 10 pre-built templates (price monitoring, expense tracking, job search, daily briefings) instead of a blank canvas, because "configure anything" is where new users stall; three setup fields, not thirty; results delivered on Telegram because meeting users in an app they already open beats teaching them a dashboard; free deployment on MOI devnet; an agent marketplace so the first thing new users see is what's already running. My role: end-to-end from concept through public launch. Why it matters: every deployed agent is a new on-chain identity and new ecosystem user; "read the docs" onboarding became a 60-second product experience.

### agent-dating (#agent-dating) - work, Sarva Labs, 2026, open source: github.com/sarvalabs-adithya/agent-dating, published on ClawHub, TypeScript
Two AI agents with on-chain identities, autonomously dating each other. Yes, really. An OpenClaw plugin: each dater is a genuinely independent agent with its own model, own wallet, own identity on MOI's on-chain agent registry, discovering peers and messaging over a real A2A transport (direct HTTP with an SSE relay fallback so agents behind NAT stay reachable), rendered in a live WhatsApp-style spectator view. Incoming messages route into the agent's real LLM session (it knows it's on a date and answers as itself), with a free offline persona mode as fallback. Deterministic date scoring, a wingman mode where owners text as their agent (sender-signed with a wallet-derived key) with a global leaderboard, per-peer reply caps and block controls, 9 tools, one-command installer. A ridiculous demo built on serious infrastructure; shipped to prove MOI's agent registry with something people actually want to watch.

### Stablecoin Tools (#stablecoin-tools) - personal, ongoing, live: stablecointools.org, Next.js, TypeScript
Most dashboards tell you the price is $1.00; Stablecoin Tools asks what has to break before it isn't. Mechanism-specific Monte Carlo stress tests across 8 stablecoins (overcollateralized, delta-neutral, and fiat-backed each get their own failure model, because they fail differently) on live market data from DeFiLlama and CoinGecko. The models come from my five published papers on stablecoin collateral risk and options-based hedging, turned into software anyone can run. In active development: liquidation calculators, safe-borrow estimators, risk-adjusted yield comparisons.

### Verde (#verde) - personal, in active development, React Native (Expo), TypeScript, Zustand
A USD neobank for Argentine freelancers: get paid in dollars, spend in pesos, earn yield while you sleep. "Verdes" is what Argentine freelancers actually call dollars. It runs on stablecoin rails but the word "crypto" appears nowhere in the product; users see "your dollars," the infrastructure sees USDC. Every function maps 1:1 to a real integration: virtual US bank accounts on-ramping ACH/wire to USDC (Bridge), embedded wallets and auth (Privy), LATAM virtual card issuing with point-of-sale FX (Pomelo), yield from tokenized T-bills (BlackRock BUIDL via Securitize). The interactive app is complete (onboarding, balance and activity feed, send flow, virtual card with freeze, live yield accruing in real time) and I'm now swapping the mocked layer for live integrations, starting with auth and the on-ramp. The question underneath it: what does stablecoin infrastructure look like when the user never has to know it's there?

### MOI Sprint (#sprint) - work, Sarva Labs, 2025-2026
A speedrun-style interactive learning platform for MOI development, modeled on SpeedRunEthereum: developers level up through hands-on challenges instead of reading docs cover to cover. Built alongside the ~50 pages of core documentation I authored for Coco, MOI's smart contract language (cocolang.dev), and MOI protocol architecture (docs.moi.technology). Sprint is the on-ramp from "curious" to "shipping on MOI."

### LiquidEase (#liquidease) - personal, ETH Denver 2023, 0x bounty winner, Solidity, Next.js
Single-sided liquidity provision, built and won at ETH Denver 2023. A smart contract routes optimal swaps through the 0x aggregator so LPs enter positions with one asset; OpenZeppelin Defender autotasks and sentinels handle automated rebalancing on volume- and time-based triggers, e.g. auto-exit if LP trading volume drops >15% in 24h.

### Research
White paper (co-author, BIMA Labs, 2024): stablecoin risk mitigation and capital-allocation guidance, built on a framework evaluating 70+ stablecoin, LST, and LRT protocols across collateral, peg mechanics, and liquidation logic; Python/R hedging simulations. Five papers (sole author), one line each: Delta & Gamma Neutral Collar Strategy (downside risk in stablecoin reserves) / Theta & Vega Neutral Butterfly Spread (yield curves under varying volatility) / Rho Neutral Yield Enhancement with Synthetic Positions (rate arbitrage in DeFi) / Gamma Neutral Calendar Spread (long-term volatility in collateralized portfolios) / Theta Neutral Iron Condor (hedging AMM impermanent loss). Leave a `PAPER_LINKS` constant in `content.ts` to fill in later.

### Now / About
BS Applied Mathematics & Economics, CS minor, Purdue (2025), where I taught a 12-week Solidity course and ran ops for Boiler Blockchain. Before MOI: stablecoin research at BIMA Labs. At MOI I also co-authored the STiFF enterprise stablecoin spec (branded stablecoin issuance and settlement at 80-90% lower cost than card networks) and run weekly dev talks, the MOI Forge grant program, and an 11-part community call series (1,500+ cumulative views).

## Hard constraints

- STiFF: the one sentence above, nothing more. No investor-relations or data-room content anywhere. No "open to work" language.
- Personal vs work attribution exactly as labeled per project.
- The only numbers on the site are the ones in this doc.

## Remaining process

1. Read `.claude/skills/design-taste-frontend/SKILL.md`.
2. Scaffold `personal-site/` (create-next-app: TS, Tailwind, App Router, ESLint, no src dir).
3. Write `content.ts` with all content above (typed, plus `PAPER_LINKS`).
4. Build page + components.
5. `cd personal-site && npm run build` until clean.
6. Screenshot desktop + mobile, review against the taste skill's Pre-Flight Check (Section 14), fix failures.
7. Deliver dev-server instructions and a one-paragraph Vercel deploy guide (new Vercel project, Root Directory = `personal-site/`).
