# Improvement Plan — Stablecoin Depeg Lab

Self-contained implementation roadmap. Written 2026-08-08 against commit `50b38e6`. An agent
executing this plan needs no other context, but **must re-verify every file:line reference
before editing** — the code may have drifted since this was written.

## How to execute this plan

- Work the phases in order. Tasks within a phase are ordered by dependency; a task lists its
  prerequisites explicitly when they are not simply "the previous task".
- After every task: `npm run lint && npx tsc --noEmit && npm run build` must pass. Once
  Phase 2.2 lands, also `npm test`.
- One commit per task, conventional-commit style (`fix(sim): …`, `feat(ui): …`), message body
  naming the plan task ID (e.g. `Plan task 0.3`).
- Every claim below about current behavior was adversarially fact-checked against source at
  commit `50b38e6` by independent reviewers (~120 claims verified, 20 corrections applied).
  If you find a claim no longer true, skip the task's obsolete part and note it in the commit.
- Do not add dependencies beyond those a task names. The chart stack is deliberately
  dependency-free canvas — keep it that way.

## Current architecture (verified snapshot)

- Next.js 14.2 App Router, React 18, TS strict, Tailwind 3.4. No tests, no CI, no worker.
- `app/page.tsx` (server, `force-dynamic`) fetches CoinGecko ETH/BTC spot + 365d history,
  Binance ETHUSDT funding (500 × 8h points, converted to daily: mean×3, sd×√3), DeFiLlama
  stablecoin summaries; passes numbers to `app/DashboardClient.tsx` (client).
- `lib/montecarlo.ts` (~837 lines): eight simulators — `simulatePaths` (generic collateral),
  `simulateDAI`, `simulateLUSD`, `simulateFiatBacked`, `simulateUSDe`, `simulateGHO`,
  `simulateUST`, `simulateOvercollateralizedBTC` — all daily-timestep, 10,000 paths, run
  **synchronously on the main thread** behind a 300ms debounce in DashboardClient.
- All Gaussian draws flow through `randomNormal` (Box-Muller over `Math.random`, module-level
  `spareNormal` cache at `lib/montecarlo.ts:3`) — but `simulateFiatBacked` draws exclusively
  via raw `Math.random` (lines 344, 353) and `simulateOvercollateralizedBTC` draws jump
  arrivals via raw `Math.random` (line 790). Unseedable, non-reproducible either way.
- `components/SimulationChart.tsx`: hand-rolled Canvas 2D, two stacked canvases (spaghetti +
  overlay), DPR-aware, no chart library. `components/ResultsPanel.tsx`: stats + div-based
  histogram. `components/ScenarioAnalysis.tsx` (902 lines): generated narrative prose.
  `components/SliderPanel.tsx` (491 lines): sliders + 17 presets. UI state lives only in
  `useState` — nothing in the URL, nothing persisted.
- `lib/stablecoins.ts`: 8-coin registry (dai, lusd, gho, usbd, usde, usdc, usdt, ust) with
  hardcoded collateral weights / CRs / reserve splits, no as-of dates.

---

## Phase 0 — Correctness hotfixes and cleanup

Small, independent, high trust-repair value. Do all of them first.

### 0.1 Fix the wrong-baseline results bug

**Problem.** `app/DashboardClient.tsx` passes `currentPrice={underlyingPrice}` (ETH or BTC
spot) to `ResultsPanel` unconditionally. But for USDe the paths are **reserve-fund dollars**,
and for fiat (USDC/USDT) and UST the paths are **peg prices ≈ $1.00** — so the histogram gets
a "start $2,400" marker and median/drawdown stats computed against the wrong baseline.
`ScenarioAnalysis` receives `ethPrice={underlyingPrice}` the same way.

**Fix.** `SimulationChart` already has the right pattern: `thresholdOverride`,
`thresholdLabel`, `formatValue` props set per mechanism. Introduce a per-mechanism display
config (start value, value formatter, axis label) computed once in DashboardClient and pass
it to `ResultsPanel` and `ScenarioAnalysis` too: start = 1.0 for fiat/UST peg paths, start =
reserve fund for USDe, start = spot for collateral models.

**Accept.** Select USDe: histogram start marker and "Median final" are in reserve dollars.
Select USDC: stats are around $1.00. No stat anywhere shows ETH spot for a $1-peg path.

### 0.2 Fix the USDe default funding volatility (20–200× too hot)

**Problem.** `simulateUSDe` defaults `fundingRateVol` to `0.02`/day
(`lib/montecarlo.ts:413–417`). That is a daily funding σ of 2% of notional; real perp funding
daily σ is on the order of 0.01–0.1%. At default supply $3B this gives daily reserve P&L σ of
$60M against a $50M reserve → near-certain depeg within days. The **live** path is fine
(DashboardClient seeds USDe params from fetched Binance stats), but the broken magnitude
exists in three places that all serve as defaults when live data is absent:
the `simulateUSDe` model default (`lib/montecarlo.ts:413–417`), the `app/page.tsx` fallback
constant used when the Binance funding fetch fails (page.tsx line ~39), and the
`fundingVolDaily = 0.02` prop default in `app/DashboardClient.tsx` (line ~84).

**Fix.** Change all three to a realistic magnitude (≈ `0.0005`/day, i.e. 0.05%). Full AR(1)
calibration from the fetched series lands in task 1.3 — this is just the hotfix.

**Accept.** Calling `simulateUSDe` with `fundingRateVol` omitted (e.g. from the `app/test`
page, or in the browser with network blocked so the Binance fetch fails) yields a small —
not ~100% — 30-day depeg probability. (Note: `?fallback=1` only substitutes spot prices; it
does not exercise the funding fallback, so it is not a valid test of this fix.)

### 0.3 Scope presets to the selected coin

**Problem.** `components/SliderPanel.tsx` renders all 17 `PRESETS` regardless of selected
coin — "May 7, 2022 (Actual Collapse)" (UST) and "SVB Scenario" (fiat) are clickable while
viewing DAI, where they patch params that model ignores.

**Fix.** Tag each preset with the mechanism(s)/coin ids it applies to; filter the grid by
selection; highlight the active preset (params deep-equal match) with the existing accent
style.

**Accept.** Viewing DAI shows only collateral-model presets; the applied preset is visually
marked; switching coins never leaves a stale highlight.

### 0.4 Purge confirmed dead weight

All verified unused at `50b38e6`:

- `recharts` in `package.json` — imported nowhere (charts are hand-rolled canvas). Remove.
- `lib/data.ts`: remove `fetchStablecoinsData`, plus the mock bottom half —
  `fetchStablecoinSnapshot`, `fetchAllStablecoinSnapshots`, `MarketSnapshot` usage, the
  `delay()`/jitter mock machinery, and the `BASE` 3-coin table.
- `lib/stablecoinData.ts`: remove `fetchStablecoinLiveData` and `fetchAllStablecoinLiveData`
  (the only two functions touching `history30d`; removing both also orphans the private
  `fetchHistory` helper — remove it too). Keep `fetchStablecoinSummaries`. The four fetchers
  actually consumed by the app are `fetchStablecoinSummaries`, `fetchEthMarketData`,
  `fetchBtcMarketData`, `fetchEthFundingRates`.
- Legacy 3-coin types in `lib/types.ts`: `Stablecoin` (id `"dai"|"usde"|"crvusd"`, line ~1)
  and `StablecoinId` (`"DAI"|"USDe"|"crvUSD"`, line ~94) plus its dependent `MarketSnapshot`
  — superseded by the `lib/stablecoins.ts` registry. Remove and fix fallout.
- `app/layout.tsx` metadata description mentions crvUSD, which is not in the UI. Reword.
- `README.md` is untouched create-next-app boilerplate. Replace with a real README: what the
  app is, the seven models in one line each, dev commands, honest disclaimer (educational
  tool, not risk advice).

**Accept.** `npm run build` passes; `grep -r recharts` returns nothing; bundle has no unused
fetch layer.

### 0.5 Chart resize handling + degenerate-input guard

- `components/SimulationChart.tsx` reads `wrap.clientWidth` once per effect run; window
  resizes leave a stale-sized canvas until the next param change. Add a `ResizeObserver` on
  the wrapper that re-runs the draw.
- `lib/montecarlo.ts`: `numSimulations = 0` makes `paths[worstIdx]` `undefined` (the
  `depegProbability` division is guarded at line 99 but the worst-path lookup is not). Throw
  a typed error (e.g. `InvalidParamsError`) for `numSimulations < 1` at every simulator
  entry — DashboardClient's existing try/catch renders it in the red error box. Do NOT
  silently clamp: task 2.2's test 6 pins the typed-error behavior.

**Accept.** Resizing the window redraws the chart at the new width; `numSimulations: 0` shows
the error box instead of crashing.

---

## Phase 1 — Statistical foundation

Makes the numbers defensible. Everything later builds on this.

### 1.1 Seeded RNG, confidence intervals, re-roll

**Current.** All Gaussian draws in the eight simulators go through `randomNormal`
(`lib/montecarlo.ts:5–22`), Box-Muller over `Math.random` with a module-level `spareNormal`
(line 3) that leaks state across runs. Two simulators ALSO draw raw `Math.random` directly:
`simulateFiatBacked` for event arrival and recovery duration (lines 344, 353 — it never
calls `randomNormal` at all) and `simulateOvercollateralizedBTC` for jump arrival (line
790). `depegProbability` is a bare point estimate (SE ≈ 0.5pp at N=10k for mid-range p;
~30% relative error for rare events). No re-run control exists anywhere in the UI.

**Build.**
1. `lib/rng.ts`: `mulberry32(seed)` (or xoshiro128**) returning a `Rng` object with
   `next()`, `normal()` (Box-Muller with the spare stored **on the object**, not
   module-level), and the seed retained for display.
2. Thread `rng` through every simulator: add `seed?: number` to `SimulationParams`; each
   `simulate*` creates its own `Rng` from it. Delete module-level `spareNormal`. Replace
   **every** direct `Math.random()` call site (montecarlo.ts:344, 353, 790) with
   `rng.next()`, not just the `randomNormal` calls — otherwise fiat stays entirely and USBD
   partially non-reproducible. Grep for `Math.random` in `lib/` afterwards; it must return
   nothing. Same seed + same params ⇒ bit-identical `SimulationResult`.
3. Wilson 95% interval on `depegProbability`; add `depegProbabilityCI: [number, number]` and
   `seed: number` to `SimulationResult` (`lib/types.ts`).
4. UI: show `12.4% ± 0.6%` in `ChartFooter` and `ResultsPanel`; add a re-roll button (🎲) in
   ChartFooter that bumps the seed; display the seed subtly (it becomes part of permalinks in
   task 3.1).

**Accept.** Two runs with the same seed produce identical results (assert in the /test page
for now; becomes a unit test in 2.2). Re-roll visibly resamples. CI shown next to the
headline number.

### 1.2 Shared fat-tailed, correlated return engine

**Current.** The universal price process is `price *= 1 + N(0, σ)` — arithmetic, driftless,
constant-vol, Gaussian, **no floor** (price can go negative for large σ): `simulatePaths`
line 63, and clones at 153–154 (DAI ETH leg), 244–245 (LUSD), 553–555 (GHO), 771–773 (USBD).
Consequences, all verified:
- Gaussian tails systematically understate depeg probabilities — in a tool whose entire
  output is tail probabilities. `ScenarioAnalysis` literally prints a "no fat tails" apology.
- DAI's ETH and USDC legs are independent (`montecarlo.ts:153–158`) — SVB week was a joint
  event.
- GHO's day-1 `initialCrash` is applied identically to all three assets, bypassing the
  correlation machinery entirely (implicit ρ=1) at lines 543–546; the ρ clamp at line 500 is
  `[0,1]`, making negative correlation inexpressible.
- The only jump process in the codebase (stBTC ratio, lines 777–791) has deterministic jump
  magnitudes.
- GHO's 3-asset Cholesky (`applyCorr`, 513–524) is **mathematically correct** (verified) —
  promote it, don't rewrite it.

**Build.** `lib/returns.ts`, one shared generator used by all five collateral models:
1. Log-space returns: `price *= exp(μ + σ·z)` — price strictly positive, compounding correct.
2. `z` from Student-t (ν ≈ 4–6, variance-normalized) by default, optional Gaussian for
   comparison; optional Merton jump overlay (Poisson arrival, lognormal jump size) — make the
   stBTC jump table a special case with randomized magnitudes.
3. Optional EWMA volatility (λ ≈ 0.94) so crash days raise subsequent vol.
4. N-asset correlated draws: generalize GHO's Cholesky to an N×N equicorrelation (valid range
   ρ ∈ (−1/(N−1), 1], widen the clamp accordingly) with per-asset σ. Route DAI's ETH+USDC
   legs and GHO's three assets (and the day-1 crash — draw it **through** the correlation,
   e.g. as a large common shock) through it.
5. Keep every model's mechanism logic (thresholds, Recovery Mode, reserve drain) unchanged —
   this task only replaces the *return generator* underneath.
6. Update `ScenarioAnalysis`'s "Real-world context" caveats: delete the no-fat-tails apology,
   state the new process honestly (Student-t ν, EWMA λ as configured).

**Accept.** All models produce strictly positive prices at extreme σ (that IS the fix — the
old arithmetic process diverges from the new one most exactly there, which is expected). With
ν→∞, EWMA off, and drift set to μ = −σ²/2, summary statistics (median path, depeg
probability) agree with the pre-1.2 Gaussian engine within Monte-Carlo confidence bounds at
moderate σ (≲ 5%/day) — do NOT expect bit-identical paths; arithmetic `1+σz` and log-space
`exp(μ+σz)` are different processes and only agree statistically. GHO with `initialCrash`
set and ρ=0.2 shows visibly different asset dispersion than ρ=0.95. DAI usdcShock now
co-moves with ETH stress.

### 1.3 Close the calibration loop

**Current.** The app already fetches 365 days of ETH/BTC daily prices (CoinGecko, mean/stdDev
computed on fetch) and 500 ETHUSDT funding points (Binance). But `lib/types.ts` declares
`EthMarketData` (129–137) and `FundingRateStats` (144–148) and **no model in
`lib/montecarlo.ts` consumes them** — live values only reach the sim indirectly where
DashboardClient happens to seed a param (USDe funding; spot prices). Every mechanism constant
(collateral weights, CRs, reserve splits) is an unsourced, undated hardcode; Ethena's
`reserveFund: 50_000_000` is duplicated as a literal in **at least ten places**:
`app/DashboardClient.tsx` lines 123, 368, 428; `components/SliderPanel.tsx` lines 59, 67,
273, 277; `components/ScenarioAnalysis.tsx` lines 258, 752; `lib/stablecoins.ts` line 134;
plus the `simulateUSDe` default in `lib/montecarlo.ts`. There is no BTCUSDT funding fetch
even though USDe is BTC-hedged too and `fetchBtcMarketData` already exists. The
`EthMarketData.volatility` doc comment (`lib/types.ts` line ~135) says annualize with √252 —
crypto trades 365 days.

**Build.**
1. `lib/snapshots.ts`: move every hardcoded protocol constant here — collateral weights, CRs,
   liquidation thresholds, reserve splits, reserve fund, DAI PSM weights (0.65/0.35 at
   montecarlo.ts:130–131), GHO basket (vol multiples 0.75/1.5 at 502–506), UST constants —
   each as `{ value, asOf: "YYYY-MM", source: "<url>" }`. Replace **all** `50_000_000`
   reserve-fund literals (full location list above) with one snapshot import. Where the
   simulator and the `lib/stablecoins.ts` registry disagree — the known case is GHO: the
   simulator uses an ETH/BTC/LINK 50/30/20 basket (montecarlo.ts:504–507) while the registry
   lists ETH 45 / wstETH 25 / USDC 15 / other 15 with no BTC or LINK — the snapshot records
   the real protocol composition with source, the simulator's simplified basket is declared
   explicitly as a modeling approximation (a `modeledAs` field on the snapshot entry), and
   the registry display is reconciled to the sourced values.
2. Seed the volatility slider default from fetched realized vol (ETH or BTC per coin) instead
   of the hardcoded default; show "live 365d realized vol: X%" as a hint next to the slider.
3. USDe funding as an AR(1) (or two-regime Markov) process fit from the fetched Binance
   series: estimate φ and σ_ε from the 500 points server-side in `page.tsx`, pass down, use
   in `simulateUSDe` instead of i.i.d. draws. Make the funding shock a sustained regime (a
   negative-mean spell with persistence), not a one-day blip (current: montecarlo.ts:433–435).
4. Add `fetchBtcFundingRates` (Binance `BTCUSDT`), blend per USDe's hedge mix.
5. UI staleness labels: wherever a snapshot constant is displayed (header strip, selector,
   ScenarioAnalysis), show its as-of date; add a small "data sources" footnote panel.
6. Fix the √252→√365 annualization doc comment on `EthMarketData.volatility` in
   `lib/types.ts` (line ~135). `lib/data.ts` itself computes plain daily stddev and contains
   no annualization logic to change.

**Accept.** Deleting a snapshot's `asOf` fails tsc. USDe defaults reproduce a plausible
funding path (autocorrelated, mean near the fetched mean). Volatility slider defaults track
live realized vol. Every displayed constant carries a date.

---

## Phase 2 — Engine infrastructure

### 2.1 Web Worker engine with typed arrays, streaming, cancellation

**Current.** The 10k-path loop runs synchronously on the main thread (300ms debounce in
DashboardClient) — sliders jank during runs; on re-run the stale chart stays with a tiny
"Running…" line. Paths are `number[][]` in React state (~310k boxed numbers at 31 steps,
~910k at 90 days; UST holds 2×). Percentiles do a fresh `slice()` + full sort per day (~90
sorts of 10k per run: montecarlo.ts:85 and clones). The percentile/worst-path block is
copy-pasted seven times (79–94, 175–190, 272–287, 373–389, 450–465, 572–587, 809–823) with
one behavioral divergence: six models pick `worstPath` by lowest **final** value, the fiat
model by deepest **intraday minimum** (385–389). `lib/montecarlo.ts` imports nothing but
`./types`, so it moves into a worker unchanged.

**Build.**
1. `lib/simWorker.ts` (module worker) + a small `useSimulation` hook: postMessage
   `{params, coinId, seed}`, receive streamed batches (e.g. every 1,000 paths) so the fan
   visibly converges instead of the stale-chart wait; final message carries the full result.
2. Store paths in one `Float64Array` of shape `[numSims × (days+1)]`, transferred (not
   cloned) to the main thread. Adapt **every** consumer of `paths`: `SimulationChart`,
   `ResultsPanel`, `ScenarioAnalysis`, `validateResult` in DashboardClient (lines ~62–76),
   and the UST dual-chart path — `simulateUST` produces a second full matrix (`luna.paths`,
   montecarlo.ts:707–713) that DashboardClient re-wraps into a synthetic second result
   (lines ~458–477); `luna.paths` gets the same Float64Array layout and is transferred
   alongside the UST matrix.
3. Cancellation: debounce refire terminates the in-flight run (either `worker.terminate()` +
   respawn, or a generation counter the worker checks between batches).
4. While extracting, collapse the copy-pasted percentile/worst-path blocks (seven clones at
   the line ranges above, plus UST's dual-block variant) into one `summarize()` helper. Unify
   `worstPath` semantics on **deepest intraday minimum** (the fiat variant — a path that
   crashed to 0.90 and recovered is worse than one that drifted to 0.97), and note the
   change in `types.ts` docs.
5. Raise the path-count ceiling: with typed arrays, offer 10k default / 50k "high precision"
   toggle (worker keeps UI responsive either way).

**Accept.** Sliders stay 60fps during a run; a rapid slider drag never queues more than one
in-flight run; the chart shows paths accumulating in batches; 50k paths completes without
main-thread jank; all eight models emit identical statistics to pre-refactor under a fixed
seed (except the documented worstPath unification).

### 2.2 Statistical test suite + CI

**Current.** Zero tests, no CI, no `.github/`. The only harness is `app/test/` — a manual
page that runs `simulateDAI` with `usdcShock: 0`, which degenerates to `simulatePaths`
(montecarlo.ts:119), i.e. it eyeballs one of eight code paths.

**Build.** Vitest + GitHub Actions (`lint`, `tsc --noEmit`, `test`, `build`).
Tests, all under fixed seeds (needs 1.1):
1. `quantile()` against R type-7 / numpy reference values, including edge cases.
2. RNG: same seed ⇒ identical path matrix; different seeds ⇒ different; distribution moments
   (mean≈0, var≈1 within tolerance at N=100k) for `normal()` and Student-t.
3. GHO/correlation engine: empirical pairwise correlation of generated returns within ±0.02
   of requested ρ; negative-ρ validity bound enforced.
4. Closed-form anchor against the engine that exists post-1.2: for the plain collateral
   model in log-space Gaussian mode (ν→∞), day-1 breach probability =
   Φ((ln(threshold/CR) − μ)/σ); assert the simulated estimate within CI. (The arithmetic-era
   formula Φ((threshold/CR − 1)/σ) no longer applies once 1.2 lands.)
5. Regression pins of **currently-true** behavior only — the suite must be green at this
   task's commit: fiat model at defaults ⇒ depegProbability exactly 0 (2.3 inverts this pin
   when it lands, adding "defaults ⇒ > 0 with CI" as part of its own task); USDe with
   post-0.2 defaults ⇒ near-zero; UST at `initialSellPressure ≥ 0.1` ⇒ pin its current
   day-1 floor behavior. Future model edits then surface as explicit test diffs.
6. Degenerate inputs: `numSimulations: 0` → typed error; `days: 0`; NaN params rejected.
7. Convert `app/test/` into a dev-only benchmark page or delete it (the suite supersedes it).

**Accept.** `npm test` green locally and in Actions on push/PR; a deliberate off-by-one in
`quantile` fails the suite.

### 2.3 Rebuild the fiat-backed model (it cannot depeg at defaults)

**Current (verified in source, `lib/montecarlo.ts:317–401`).** With defaults
(`baseLiquidity 0.86 × reserveLiquidity 1.0 = effLiq 0.86 ≥ severity 0.1`), the dip branch
caps the peg dip at 0.5% (lines 347–349: `1 − 0.01·max(0, severity/effLiq − 0.5)`) against a
depeg threshold of 0.97 (`DEPEG`, line 326) — so `depegProbability` is **identically zero**
and the SVB scenario this model exists for is unreachable unless `reserveLiquidity <
~0.113` (= 0.97 × severity / baseLiquidity; the branch switch itself occurs at ~0.116, but
between 0.113 and 0.116 the second branch still yields peg ≥ 0.97). The two-branch map has
a discontinuity at `effLiq = severity` (peg jumps from ≥0.995 to `effLiq/severity`). The peg has zero noise outside events (line 359); a new event
during recovery overwrites the in-progress one; recovery is a fixed linear 3–7 day ramp; the
reserve-tier haircuts quoted in the comment at 306–308 (T-bills 0.95, deposits 0.50, CP 0.30,
other 0.20) are baked into the single 0.86 scalar.

**Build.** Replace with a continuous run model:
1. Daily redemption demand: baseline small noise + **self-exciting** intensity — a peg dip
   raises next-day redemption demand (Hawkes-lite: intensity decays geometrically, kicks up
   on dips). This is what makes runs *runs*.
2. Liquidity waterfall: serve redemptions from the reserve tiers already in
   `lib/stablecoins.ts` (USDC 80/20 T-bills/deposits; USDT 75/10/15) in liquidity order,
   each tier with a haircut-under-fire and a daily liquidation capacity; peg discount is a
   function of unmet same-day redemptions.
3. Small always-on peg noise (±5–10bp) so quiet paths look like real USDC.
4. Importance sampling for rare-event mode: tilt event probability upward, reweight, so
   ~1e-4/day events yield tight estimates at 10k paths (report effective sample size).
5. Keep parameters: event probability, redemption severity, reserve liquidity; add tier
   composition (from snapshots, task 1.3).

**Accept.** Defaults yield small-but-nonzero depeg probability with CI. An SVB-like preset
(deposit tier impaired, severity high) reproduces a multi-day sub-$0.97 excursion with
recovery, qualitatively matching March 2023 (calibration target lands with task 3.2's
replay data). Discontinuity gone: peg dip is continuous in `severity` and `reserveLiquidity`.

---

## Phase 3 — Product surface

### 3.1 Scenario permalinks + PNG export + OG cards

**Current.** Selection and params live only in `useState`; the only URL param is the
server-side `?fallback=1` (`app/page.tsx`). Refresh destroys every configured scenario.
There is no export or sharing surface of any kind. The chart is a dependency-free canvas —
`canvas.toDataURL` is available for free.

**Build.**
1. Serialize `selectedId` + full `SimulationParams` + `seed` into the URL (compact
   `?s=dai&p=<base64url JSON>` is fine; keep it stable across versions with a version tag).
   Hydrate on load; `router.replace` (shallow) on change, debounced.
2. "Copy link" button in `ChartFooter` with a copied-state microinteraction.
3. "Export PNG": compose the two canvases + a small title/params/seed caption onto an
   offscreen canvas, `toDataURL`, download. 
4. Dynamic OG image via `next/og` `ImageResponse` (`app/og/route.tsx`): fan silhouette,
   coin name, depeg probability ± CI, seed. Wire `generateMetadata` on the main page to emit
   it for permalink URLs.

**Accept.** Paste a permalink in a fresh browser: identical coin, params, **and** (via seed)
identical simulation. PNG downloads and is legible. A permalink pasted into a social-card
debugger renders the OG card.

*Prereq: 1.1 (seed). Registry dispatch (3.4) makes param serialization cleaner but is not
required.*

### 3.2 Historical replay: real crisis paths over the simulated fan

**Current.** `SimulationChart`'s overlay already draws median/percentile lines
(`drawOverlay`) — adding one more series is small. `SliderPanel` presets already encode
"May 7, 2022 (Actual Collapse)" and "SVB Scenario" parameter sets. There is **no historical
price data anywhere**: DeFiLlama's `/stablecoinprices` endpoint is unused, UST has no
`defillamaId` in `lib/stablecoins.ts` at all.

**Build.**
1. `lib/replays/` static JSON (committed, no runtime dependency): daily series for
   UST + LUNA May 2022, USDC March 2023 (SVB weekend), ETH March 2020 (Black Thursday, as a
   collateral-model scenario). Source from DeFiLlama `/stablecoinprices` + CoinGecko history
   at build/authoring time; cite source + retrieval date in a `meta` field of each file.
2. Each replay declares its day-0 conditions (spot, vol, supply, reserve) and maps to a
   preset: selecting the preset applies those params AND overlays the realized path as one
   bold line (new `replaySeries` prop on `SimulationChart`, drawn on the overlay canvas with
   a legend chip "actual").
3. A small verdict line under the chart: "% of simulated paths at or below the realized path's
   worst day" — an honest calibration statement, favorable or not.
4. The JSON doubles as regression fixtures (extend the 2.2 suite: model-vs-replay summary
   statistics snapshot).

**Accept.** SVB preset on USDC shows the simulated fan with the real March 2023 excursion
overlaid; UST preset shows the real collapse against the simulated spiral; the verdict line
renders. No network fetch at runtime for replay data.

### 3.3 Crosshair inspection + per-day survival curve

**Current.** Per-day p5/median/p95 and per-path first-passage days (`depegDays`, recorded in
all eight simulators: montecarlo.ts:67, 163, 255, 364, 438, 560, 665, 797) are already
computed and sitting in every result —
the chart just isn't touchable: the overlay canvas is `pointer-events-none`; no tooltip,
hover, or crosshair exists.

**Build.**
1. Enable pointer events on the overlay canvas; on mousemove draw a vertical crosshair at
   day N with a compact readout: day, p5/median/p95, and "X% of paths depegged by day N"
   (cumulative distribution of `depegDays`).
2. A small survival-curve sparkline (share of paths still ≥ threshold per day) under the
   chart or in `ResultsPanel` — reveals whether risk front-loads (UST) or accrues (DAI).
3. Touch: tap-and-hold equivalent on mobile; crosshair dismisses on leave.
4. Keep it dependency-free canvas; respect the existing cream/muted palette.

**Accept.** Hovering shows day-indexed stats matching `ResultsPanel` aggregates; survival
curve for UST defaults shows a cliff in days 1–3, DAI shows gradual accrual; no interaction
jank at 10k paths (worker from 2.1 keeps redraws cheap).

### 3.4 Registry-driven dispatch + params cleanup

**Current.** Per-coin behavior is smeared across: a nested ternary keyed off `selectedId` in
DashboardClient choosing the simulator; an `isBtcBacked` regex over `collateralAssets`; a
large id-conditional `handleSelect` that manually `undefined`s cross-coin params;
`SimulationParams` as a ~20-optional-field grab-bag (`lib/types.ts:12–59`); 491-line
SliderPanel and 902-line ScenarioAnalysis with per-coin branches.

**Build.**
1. Extend each `lib/stablecoins.ts` entry with `{ simulate, defaultParams, paramSchema,
   displayConfig }`: the simulator function, its typed default params, which sliders/presets
   apply (SliderPanel renders from this), and the display config from task 0.1.
2. DashboardClient dispatch becomes `coin.simulate(params)`; `handleSelect` becomes
   `setParams(coin.defaultParams)` — delete the ternary, the regex, and the manual
   `undefined` dance.
3. Split `SimulationParams` into a small common core + per-mechanism param types (a
   discriminated union keyed by mechanism).
4. Leave ScenarioAnalysis's prose branches as-is (they're content, not dispatch) but key them
   off `coin.mechanism` instead of raw ids where trivial.
5. **Permalink migration** (3.1 lands before this task and serializes the old flat params):
   bump the permalink param-schema version and keep a v1 decoder that maps old flat params
   onto the new discriminated union — otherwise every permalink and OG-card URL minted
   between 3.1 and this task silently stops hydrating.

**Accept.** Adding a hypothetical 9th coin touches only `lib/stablecoins.ts` (+ its simulator
+ prose). tsc catches a fiat param passed to a collateral model. No behavior change under
fixed seed for all 8 coins. A permalink minted before this task still hydrates to the
identical simulation.

*Do before Phase 4 — the matrix and comparison dispatch from this registry.*

---

## Phase 4 — The flagship and beyond

### 4.1 Peg Fragility Index (flagship)

**The one idea that changes what the product is** — from a single-coin slider toy into a
comparative, quotable, auditable risk index. Nobody publishes a stablecoin score derived from
an open, seeded, re-runnable Monte Carlo; existing ratings (Bluechip, S&P) are analyst
judgment.

**Prereq honesty.** "Depeg" currently means four different things: collateral-threshold
breach (`simulatePaths`/DAI/GHO/USBD, montecarlo.ts:67–70), user liquidation (LUSD, 256–258),
price depeg (fiat/UST, 364/665), reserve exhaustion (USDe, 437–440). A cross-coin score is
meaningless until this is normalized.

**Build.**
1. `lib/severity.ts`: one normalized severity metric per path, defined for every mechanism —
   recommended: map each model's state to an implied peg-deviation severity in [0,1]
   (0 = never stressed, 1 = full failure), with mechanism-specific mappings documented inline
   (collateral breach depth → severity via liquidation-loss proxy; reserve drawdown fraction;
   actual peg deviation where the model prices the peg). Publish the mapping in the UI.
2. `lib/battery.ts`: a fixed, versioned scenario battery — mild/moderate/severe crash,
   correlated crash, liquidity crunch, funding inversion — each defined as param overrides
   per mechanism, all seeded (battery version + seed printed with every score).
3. Run all 8 coins × battery in the worker (batch API from 2.1). Budget mechanism: battery
   cells run at a **reduced path count** (e.g. 2,000 paths/cell, CI reported per score)
   and/or a pool of 2–4 workers — 8 coins × ~6 scenarios ≈ 48 runs would take 5–15s
   sequentially at 10k paths; cell click-through re-runs at the full 10k via the permalink.
   Compose per-coin 0–100 fragility score (weighted severity across scenarios) + sub-scores:
   tail risk (CVaR of severity), time-to-failure (median first-passage among failing paths),
   recovery (share of stressed paths that re-peg).
4. New landing view: coins × scenarios heatmap (canvas or CSS grid), each cell click-through
   to the full single-coin view with those params via permalink (3.1). Score chip on each
   selector tile.
5. Methodology page: the severity mapping, battery definition, seed, and every snapshot's
   as-of date (1.3) — the auditability is the product.

**Accept.** Heatmap renders all 8 coins in < 3s on a mid laptop at the reduced-path battery
configuration above. Scores are
reproducible bit-for-bit from the printed battery version + seed. UST scores ~catastrophic,
USDC/USDT low, and the ordering is defensible from the sub-scores. Methodology page explains
every number a skeptic would poke at.

### 4.2 Pin-and-compare (two coins or two param sets, same shock)

Dual-chart layout is already proven: UST mode renders two `SimulationChart`s (`result.luna`,
`thresholdOverride={0.01}`). Add "pin" on the current run; second pane with condensed
ResultsPanel. Noise control: **common random numbers (same seed) are only valid for A/B of
two param sets on the same model** — different models consume different draw counts per day,
so their streams desynchronize immediately. For cross-coin comparison, drive both models
from a shared underlying market-shock stream generated once by the 1.2 return engine (same
z-sequence per day per asset), not merely the same seed. Normalize both panes on the 4.1
severity metric for fair cross-coin comparison. *Large; do after 4.1.*

### 4.3 Guided story mode: "How stablecoins die"

Sequence existing capabilities into a linear tour — fiat → overcollateralized → delta-neutral
→ algorithmic — with next/prev controls, an escalating preset per beat, ScenarioAnalysis
prose as the narration (its `animKey` fade system already exists), closing on the UST-vs-USDC
comparative autopsy with the 3.2 replay overlays. The missing work is sequencing, not
capability. *Do after 3.2 so the UST beat is calibrated against reality.*

### 4.4 Peg-level dynamics with feedback loops (stretch / end-state)

Except fiat and UST, no model prices the stablecoin itself; no feedback loops exist outside
UST (LUSD ignores its stability pool and redemption arbitrage — Liquity's entire design
(montecarlo.ts:248–258); UST redemptions never burn supply — `ustSupply` never decremented
after line 648). Model the secondary-market peg as an arbitrage band with depth-limited flows
(square-root price impact per coin) plus liquidation-sale impact, unifying all mechanisms
under one observable: the coin's own price crossing a band. This subsumes and refines the
4.1 severity metric. Needs liquidity-depth data (Curve/Uniswap pools) the app doesn't fetch
yet. *Deepest lift; only after everything above.*

---

## Dependency graph

```
Phase 0 (all independent) ──────────────┐
1.1 seed ─┬─ 2.2 tests ── 2.3 fiat rebuild
          ├─ 3.1 permalinks ── 4.1 heatmap links
          └─ 4.2 compare (CRN)
1.2 returns engine ── 2.3, 4.1 (defensible tails)
1.3 calibration ── 2.3 (tiers), 4.1 (methodology)
2.1 worker ── 4.1 (battery batch), 3.3 (cheap redraws)
3.2 replay ── 4.3 story mode
3.4 registry ── 4.1, 4.2 (dispatch)
```

## Verification protocol (every phase)

1. `npm run lint && npx tsc --noEmit && npm run build` (+ `npm test` once 2.2 exists).
2. Fixed-seed statistical invariance: any refactor that claims "no behavior change" must
   demonstrate identical summary stats under the same seed before/after.
3. Manual smoke: select each of the 8 coins, drag a slider, confirm chart + stats + prose all
   update and no red error box appears.
4. Honest reporting: if a task's acceptance criteria cannot be met, say so in the commit body
   and stop rather than papering over it.
