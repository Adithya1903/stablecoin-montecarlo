# Stablecoin Depeg Lab

A Monte Carlo stress dashboard for stablecoin depeg risk. Pick one of eight
stablecoins, drag sliders (volatility, forced crashes, collateral ratios,
funding shocks, redemption runs), and watch 10,000 simulated paths — with
depeg probability, percentile fans, and a generated scenario narrative —
update live.

Built with Next.js 14 (App Router), React 18, TypeScript, and Tailwind.
Charts are hand-rolled Canvas 2D — no chart library.

## The models

Each stablecoin runs a mechanism-specific simulator (`lib/montecarlo.ts`):

- **DAI** — ETH collateral plus a USDC Peg Stability Module leg; a USDC
  depeg shock erodes DAI backing even when ETH holds (SVB, March 2023).
- **LUSD** — ETH-only, 110% minimum CR, with Liquity's Recovery Mode:
  below 150% system CR, any position under 150% becomes liquidatable.
- **GHO** — three-asset collateral basket (ETH/BTC/LINK) with a
  Cholesky-correlated returns engine and a correlation slider.
- **USBD** — overcollateralized BTC/stBTC; optional LST basis risk with
  jump-to-depeg dynamics conditioned on BTC drawdowns.
- **USDe** — delta-neutral: price moves cancel, the risk is negative perp
  funding draining the insurance reserve. Seeded from live Binance funding.
- **USDC / USDT** — fiat-backed redemption-pressure model: confidence
  events trigger redemptions against a reserve basket's effective liquidity.
- **UST** — the algorithmic death spiral (educational; collapsed May 2022):
  reflexive mint/burn against LUNA with no external collateral.

Live inputs: CoinGecko ETH/BTC spot + 365d history, Binance ETHUSDT
funding rates, DeFiLlama stablecoin supplies.

## Development

```bash
npm install
npm run dev    # http://localhost:3000
npm run lint
npx tsc --noEmit
npm run build
```

`app/test` is a manual sanity-check page for the DAI simulator.

See `IMPROVEMENT_PLAN.md` for the verified improvement roadmap.

## Disclaimer

This is an educational tool, not risk advice. The models are deliberate
simplifications (Gaussian returns, stylized mechanisms, hardcoded protocol
constants) and understate tail risk. Do not use it to make financial
decisions.
