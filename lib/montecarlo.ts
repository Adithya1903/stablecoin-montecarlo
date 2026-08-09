import { ReturnEngine } from "./returns";
import { Rng, randomSeed, wilsonCI } from "./rng";
import { SNAPSHOTS } from "./snapshots";
import type { PathMatrix, SimulationParams, SimulationResult } from "./types";

/** Thrown for parameter values no simulator can run with (e.g. zero paths). */
export class InvalidParamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidParamsError";
  }
}

/**
 * Hooks the simulation worker threads through the path loop. Not part of
 * SimulationParams because callbacks are not structured-cloneable.
 */
export type SimHooks = {
  /**
   * Called every ~batch paths with the matrix being filled and the count
   * of completed paths, so callers can stream partial fans. The final
   * batch is NOT reported — the returned result covers it.
   */
  onBatch?: (
    m: PathMatrix,
    depegDays: (number | null)[],
    done: number
  ) => void;
};

function batchSize(numSimulations: number): number {
  return Math.max(1000, Math.ceil(numSimulations / 20));
}

function assertSimCount(params: SimulationParams): void {
  if (
    !Number.isFinite(params.numSimulations) ||
    params.numSimulations < 1
  ) {
    throw new InvalidParamsError(
      `numSimulations must be at least 1 (got ${params.numSimulations})`
    );
  }
  if (!Number.isFinite(params.days) || params.days < 1) {
    throw new InvalidParamsError(
      `days must be at least 1 (got ${params.days})`
    );
  }
  if (Number.isNaN(params.volatility)) {
    throw new InvalidParamsError("volatility must be a number (got NaN)");
  }
}

/** Linear-interpolation quantile (R type-7 / numpy default) over a sorted array. */
export function quantile(sorted: ArrayLike<number>, q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = lo + 1;
  const frac = pos - lo;
  if (hi >= sorted.length) return sorted[lo];
  return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
}

/** Copy one path out of the matrix as a plain array. */
export function pathRow(m: PathMatrix, i: number): number[] {
  return Array.from(m.data.subarray(i * m.pathLen, (i + 1) * m.pathLen));
}

/**
 * Per-day p5/median/p95 plus the worst path — the one with the deepest
 * intraday minimum. Replaces seven near-identical per-simulator blocks.
 */
function summarize(m: PathMatrix): {
  medianPath: number[];
  percentile5Path: number[];
  percentile95Path: number[];
  worstIdx: number;
} {
  const { data, numPaths, pathLen } = m;
  const medianPath = new Array<number>(pathLen);
  const percentile5Path = new Array<number>(pathLen);
  const percentile95Path = new Array<number>(pathLen);
  const column = new Float64Array(numPaths);
  for (let d = 0; d < pathLen; d++) {
    for (let i = 0; i < numPaths; i++) column[i] = data[i * pathLen + d];
    column.sort();
    percentile5Path[d] = quantile(column, 0.05);
    medianPath[d] = quantile(column, 0.5);
    percentile95Path[d] = quantile(column, 0.95);
  }

  let worstIdx = 0;
  let worstMin = Infinity;
  for (let i = 0; i < numPaths; i++) {
    const base = i * pathLen;
    let mn = Infinity;
    for (let d = 0; d < pathLen; d++) {
      const v = data[base + d];
      if (v < mn) mn = v;
    }
    if (mn < worstMin) {
      worstMin = mn;
      worstIdx = i;
    }
  }
  return { medianPath, percentile5Path, percentile95Path, worstIdx };
}

function buildResult(
  m: PathMatrix,
  depegCount: number,
  depegDays: (number | null)[],
  seed: number
): SimulationResult {
  const s = summarize(m);
  return {
    paths: m,
    depegCount,
    depegProbability: m.numPaths > 0 ? depegCount / m.numPaths : 0,
    depegProbabilityCI: wilsonCI(depegCount, m.numPaths),
    seed,
    depegDays,
    worstPath: pathRow(m, s.worstIdx),
    medianPath: s.medianPath,
    percentile5Path: s.percentile5Path,
    percentile95Path: s.percentile95Path,
  };
}

export function simulatePaths(
  currentPrice: number,
  params: SimulationParams,
  hooks?: SimHooks
): SimulationResult {
  assertSimCount(params);
  const seed = params.seed ?? randomSeed();
  const rng = new Rng(seed);
  const {
    volatility,
    days,
    numSimulations,
    initialCrash,
    collateralRatio,
    liquidationThreshold,
  } = params;

  const pathLen = days + 1;
  const m: PathMatrix = {
    data: new Float64Array(numSimulations * pathLen),
    numPaths: numSimulations,
    pathLen,
  };
  const depegDays: (number | null)[] = new Array(numSimulations);
  const batch = batchSize(numSimulations);
  let depegCount = 0;

  for (let i = 0; i < numSimulations; i++) {
    const base = i * pathLen;
    m.data[base] = currentPrice;
    let price = currentPrice;
    let firstDepegDay: number | null = null;
    const engine = new ReturnEngine(rng, [volatility], {
      nu: params.nu,
      ewmaLambda: params.ewmaLambda,
    });

    for (let d = 1; d <= days; d++) {
      if (d === 1 && initialCrash !== 0) {
        price = price * engine.crashStep(0, initialCrash)[0];
      } else {
        price = price * engine.step().factors[0];
      }
      m.data[base + d] = price;

      if (firstDepegDay === null) {
        const ratio = (price / currentPrice) * collateralRatio;
        if (ratio < liquidationThreshold) firstDepegDay = d;
      }
    }

    depegDays[i] = firstDepegDay;
    if (firstDepegDay !== null) depegCount++;
    if (hooks?.onBatch && (i + 1) % batch === 0 && i + 1 < numSimulations)
      hooks.onBatch(m, depegDays, i + 1);
  }

  return buildResult(m, depegCount, depegDays, seed);
}

/**
 * DAI sim with USDC PSM dependency. ~35% of DAI's backing sits in the Peg
 * Stability Module as USDC, so a USDC depeg reduces DAI's effective
 * collateral even if ETH is fine (see SVB, March 2023). When `usdcShock`
 * is 0 this degrades to `simulatePaths` (ETH-only) for parity.
 */
export function simulateDAI(
  ethPrice: number,
  params: SimulationParams,
  hooks?: SimHooks
): SimulationResult {
  assertSimCount(params);
  const shock = params.usdcShock ?? 0;
  const seed = params.seed ?? randomSeed();
  if (shock === 0) return simulatePaths(ethPrice, { ...params, seed }, hooks);
  const rng = new Rng(seed);

  const {
    volatility,
    days,
    numSimulations,
    initialCrash,
    collateralRatio,
    liquidationThreshold,
  } = params;

  const ETH_WEIGHT = SNAPSHOTS.dai.psmWeights.value.eth;
  const USDC_WEIGHT = SNAPSHOTS.dai.psmWeights.value.usdc;
  const USDC_NOISE = 0.001;
  const USDC_REVERT = 1 / 7; // ~7-day mean reversion toward $1
  // ETH and the USDC peg are correlated (SVB week was a joint event):
  // daily draws share this equicorrelation, and a forced day-1 USDC
  // shock drags ETH by (1+shock)^β as a common-stress co-move.
  const ETH_USDC_RHO = 0.3;
  const STRESS_BETA = 0.3;

  const pathLen = days + 1;
  const m: PathMatrix = {
    data: new Float64Array(numSimulations * pathLen),
    numPaths: numSimulations,
    pathLen,
  };
  const depegDays: (number | null)[] = new Array(numSimulations);
  const batch = batchSize(numSimulations);
  let depegCount = 0;

  const startEff = ETH_WEIGHT * ethPrice + USDC_WEIGHT * ethPrice;
  // Effective-collateral path is reported in ETH-denominated units (same base
  // as startEff) so downstream UI keeps a single numeric scale.

  for (let i = 0; i < numSimulations; i++) {
    const base = i * pathLen;
    m.data[base] = startEff;
    let eth = ethPrice;
    let usdc = 1.0;
    let firstDepeg: number | null = null;
    const engine = new ReturnEngine(rng, [volatility, USDC_NOISE], {
      rho: ETH_USDC_RHO,
      nu: params.nu,
      ewmaLambda: params.ewmaLambda,
    });

    for (let d = 1; d <= days; d++) {
      if (d === 1) {
        usdc = 1.0 + shock;
        if (initialCrash !== 0) {
          eth = eth * engine.crashStep(0, initialCrash)[0];
        } else {
          eth =
            eth *
            engine.step().factors[0] *
            Math.pow(1 + shock, STRESS_BETA);
        }
      } else {
        const { z, factors } = engine.step();
        eth = eth * factors[0];
        usdc = usdc + USDC_REVERT * (1.0 - usdc) + USDC_NOISE * z[1];
      }
      if (usdc < 0) usdc = 0;

      const eff = ETH_WEIGHT * eth + USDC_WEIGHT * ethPrice * usdc;
      m.data[base + d] = eff;

      if (firstDepeg === null) {
        const ratio = (eff / startEff) * collateralRatio;
        if (ratio < liquidationThreshold) firstDepeg = d;
      }
    }

    depegDays[i] = firstDepeg;
    if (firstDepeg !== null) depegCount++;
    if (hooks?.onBatch && (i + 1) % batch === 0 && i + 1 < numSimulations)
      hooks.onBatch(m, depegDays, i + 1);
  }

  return buildResult(m, depegCount, depegDays, seed);
}

/**
 * LUSD sim. ETH-only collateral with a two-tier liquidation rule:
 *
 *  - Normal mode: user liquidated if their ratio < 1.10
 *  - Recovery mode: if system-wide ratio drops below 1.50, ANY user below
 *    1.50 is liquidatable — the protocol's stress-time safety valve.
 *
 * Both ratios move proportionally with ETH price from their starting values
 * (`userCR` and `systemCR`). Liquidation is triggered on a path if EITHER
 * rule fires on any day.
 */
export function simulateLUSD(
  ethPrice: number,
  params: SimulationParams,
  hooks?: SimHooks
): SimulationResult {
  assertSimCount(params);
  const seed = params.seed ?? randomSeed();
  const rng = new Rng(seed);
  const {
    volatility,
    days,
    numSimulations,
    initialCrash,
  } = params;
  const userCR0 = params.userCR ?? 1.5;
  const systemCR0 = params.systemCR ?? 2.5;

  const pathLen = days + 1;
  const m: PathMatrix = {
    data: new Float64Array(numSimulations * pathLen),
    numPaths: numSimulations,
    pathLen,
  };
  const depegDays: (number | null)[] = new Array(numSimulations);
  const batch = batchSize(numSimulations);
  let depegCount = 0;
  let recoveryCount = 0;
  let recoverySum = 0;

  for (let i = 0; i < numSimulations; i++) {
    const base = i * pathLen;
    m.data[base] = ethPrice;
    let price = ethPrice;
    let firstDepeg: number | null = null;
    let firstRecovery: number | null = null;
    const engine = new ReturnEngine(rng, [volatility], {
      nu: params.nu,
      ewmaLambda: params.ewmaLambda,
    });

    for (let d = 1; d <= days; d++) {
      if (d === 1 && initialCrash !== 0)
        price = price * engine.crashStep(0, initialCrash)[0];
      else price = price * engine.step().factors[0];
      m.data[base + d] = price;

      const moveFactor = price / ethPrice;
      const userRatio = moveFactor * userCR0;
      const systemRatio = moveFactor * systemCR0;

      const inRecovery = systemRatio < 1.5;
      if (inRecovery && firstRecovery === null) firstRecovery = d;

      if (firstDepeg === null) {
        const normalLiq = userRatio < 1.1;
        const recoveryLiq = inRecovery && userRatio < 1.5;
        if (normalLiq || recoveryLiq) firstDepeg = d;
      }
    }

    depegDays[i] = firstDepeg;
    if (firstDepeg !== null) depegCount++;
    if (firstRecovery !== null) {
      recoveryCount++;
      recoverySum += firstRecovery;
    }
    if (hooks?.onBatch && (i + 1) % batch === 0 && i + 1 < numSimulations)
      hooks.onBatch(m, depegDays, i + 1);
  }

  return {
    ...buildResult(m, depegCount, depegDays, seed),
    recoveryModeCount: recoveryCount,
    recoveryModeAvgDay: recoveryCount > 0 ? recoverySum / recoveryCount : null,
  };
}

/**
 * Fiat-backed sim (USDC/USDT). Peg sits at $1 until a confidence event
 * forces redemptions that exceed what the reserve basket can liquidate
 * in-cycle. Reserve composition is collapsed to a single weighted
 * liquidity factor (0..1): T-bills ~0.95, bank deposits ~0.50, CP ~0.30,
 * other ~0.20. The UI exposes `reserveLiquidity` as a scalar on top to
 * simulate frozen rails (SVB-style).
 *
 * Event outcome per path:
 *  - liquidity >= demand  → tiny temporary dip (0.5% worst case)
 *  - liquidity <  demand  → peg = liquidity / demand (direct proportional)
 * Peg then linearly recovers to $1 over a random 3–7 days as illiquid
 * assets are sold. Depeg flag fires the first day peg < 0.97.
 */
export function simulateFiatBacked(
  params: SimulationParams,
  hooks?: SimHooks
): SimulationResult {
  assertSimCount(params);
  const seed = params.seed ?? randomSeed();
  const rng = new Rng(seed);
  const days = params.days;
  const numSimulations = params.numSimulations;
  const eventProb = params.eventProbability ?? 0.0001;
  const severity = params.redemptionSeverity ?? 0.1;
  const baseLiq = params.baseLiquidity ?? 0.86;
  const liqScale = params.reserveLiquidity ?? 1.0;
  const effLiq = Math.max(0, Math.min(1, baseLiq * liqScale));
  const forceDay1 = params.forceDay1Event ?? false;
  const DEPEG = 0.97;

  const pathLen = days + 1;
  const m: PathMatrix = {
    data: new Float64Array(numSimulations * pathLen),
    numPaths: numSimulations,
    pathLen,
  };
  const depegDays: (number | null)[] = new Array(numSimulations);
  const batch = batchSize(numSimulations);
  let depegCount = 0;

  for (let i = 0; i < numSimulations; i++) {
    const base = i * pathLen;
    m.data[base] = 1.0;
    let firstDepeg: number | null = null;
    let recoveryDaysLeft = 0;
    let currentPeg = 1.0;

    for (let d = 1; d <= days; d++) {
      const eventToday =
        (d === 1 && forceDay1) || rng.next() < eventProb;

      if (eventToday) {
        if (effLiq >= severity) {
          const stress = Math.max(0, severity / effLiq - 0.5);
          currentPeg = 1.0 - 0.01 * stress;
        } else {
          currentPeg = effLiq / severity;
        }
        recoveryDaysLeft = 3 + Math.floor(rng.next() * 5);
      } else if (recoveryDaysLeft > 0) {
        const step = (1.0 - currentPeg) / recoveryDaysLeft;
        currentPeg = currentPeg + step;
        recoveryDaysLeft--;
      } else {
        currentPeg = 1.0;
      }

      m.data[base + d] = currentPeg;
      if (firstDepeg === null && currentPeg < DEPEG) firstDepeg = d;
    }

    depegDays[i] = firstDepeg;
    if (firstDepeg !== null) depegCount++;
    if (hooks?.onBatch && (i + 1) % batch === 0 && i + 1 < numSimulations)
      hooks.onBatch(m, depegDays, i + 1);
  }

  return buildResult(m, depegCount, depegDays, seed);
}

/**
 * USDe sim. Ethena's delta-neutral model cancels price moves out — the
 * risk is funding rates. When funding is positive, shorts earn; when
 * negative, shorts PAY and the reserve fund drains. Reserve hitting 0
 * is the depeg event. Paths record reserve balance over time (USD), so
 * downstream UI treats the "price" axis as dollars of reserve.
 *
 * Funding follows an AR(1): f_t = μ + φ(f_{t−1} − μ) + ε_t, fit from
 * live Binance data when available — negative-funding spells persist for
 * ~1/(1−φ) days instead of being i.i.d. blips. `fundingRateVol` is the
 * STATIONARY daily σ; the innovation σ is derived as σ·√(1−φ²). A
 * `fundingRateShock` (APR) forces day 1 to that level, after which the
 * spell decays through the same persistence.
 */
export function simulateUSDe(
  params: SimulationParams,
  hooks?: SimHooks
): SimulationResult {
  assertSimCount(params);
  const seed = params.seed ?? randomSeed();
  const rng = new Rng(seed);
  const days = params.days;
  const numSimulations = params.numSimulations;
  const fallback = SNAPSHOTS.usde.fundingFallback.value;
  // Stationary daily funding σ as a fraction of notional. Real perp
  // funding daily σ is on the order of 0.01–0.1%. (An earlier 0.02
  // default meant 2%/day — $60M daily P&L σ on a $3B supply — which made
  // depeg near-certain regardless of other settings.)
  const fundingVol = params.fundingRateVol ?? fallback.sdDaily;
  const phi = Math.max(0, Math.min(0.99, params.fundingPhi ?? fallback.phi));
  const sigmaEps = fundingVol * Math.sqrt(1 - phi * phi);
  const shockApr = params.fundingRateShock ?? 0;
  const startReserve = params.reserveFund ?? SNAPSHOTS.usde.reserveFund.value;
  const totalSupply = params.totalSupply ?? SNAPSHOTS.usde.totalSupply.value;
  const meanDaily = params.fundingMeanDaily ?? fallback.meanDaily;

  const pathLen = days + 1;
  const m: PathMatrix = {
    data: new Float64Array(numSimulations * pathLen),
    numPaths: numSimulations,
    pathLen,
  };
  const depegDays: (number | null)[] = new Array(numSimulations);
  const batch = batchSize(numSimulations);
  let depegCount = 0;

  for (let i = 0; i < numSimulations; i++) {
    const base = i * pathLen;
    m.data[base] = startReserve;
    let reserve = startReserve;
    let firstDepeg: number | null = null;
    let funding = shockApr !== 0 ? shockApr / 365 : meanDaily;

    for (let d = 1; d <= days; d++) {
      if (d > 1 || shockApr === 0) {
        funding =
          meanDaily + phi * (funding - meanDaily) + rng.normal(0, sigmaEps);
      }
      reserve += totalSupply * funding;
      if (reserve <= 0) {
        if (firstDepeg === null) firstDepeg = d;
        reserve = 0;
      }
      m.data[base + d] = reserve;
    }

    depegDays[i] = firstDepeg;
    if (firstDepeg !== null) depegCount++;
    if (hooks?.onBatch && (i + 1) % batch === 0 && i + 1 < numSimulations)
      hooks.onBatch(m, depegDays, i + 1);
  }

  return buildResult(m, depegCount, depegDays, seed);
}

/**
 * GHO sim. Multi-collateral basket (50% ETH, 30% BTC, 20% LINK) driven by
 * the shared ReturnEngine: log-space Student-t returns with a pairwise
 * equicorrelation set by the correlation slider (valid range −0.5 < ρ ≤ 1
 * for three assets — negative ρ expresses hedged baskets). A forced day-1
 * crash hits ETH exactly and transmits to BTC/LINK through the
 * correlation instead of being applied identically to all three.
 */
export function simulateGHO(
  ethPrice: number,
  btcPrice: number,
  params: SimulationParams,
  hooks?: SimHooks
): SimulationResult {
  assertSimCount(params);
  const seed = params.seed ?? randomSeed();
  const rng = new Rng(seed);
  const {
    volatility,
    days,
    numSimulations,
    initialCrash,
    collateralRatio,
    liquidationThreshold,
  } = params;
  const rho = params.correlation ?? 0.7; // engine clamps to (−1/2, 1]

  const basket = SNAPSHOTS.gho.modelBasket.value;
  const btcVol = basket.btcVolMult * volatility;
  const linkVol = basket.linkVolMult * volatility;
  const wEth = basket.wEth;
  const wBtc = basket.wBtc;
  const wLink = basket.wLink;
  const linkPrice = 15; // notional LINK start price; cancels out of ratio

  const pathLen = days + 1;
  const m: PathMatrix = {
    data: new Float64Array(numSimulations * pathLen),
    numPaths: numSimulations,
    pathLen,
  };
  const depegDays: (number | null)[] = new Array(numSimulations);
  const batch = batchSize(numSimulations);
  let depegCount = 0;

  const startEff = wEth * ethPrice + wBtc * btcPrice + wLink * linkPrice;

  for (let i = 0; i < numSimulations; i++) {
    const base = i * pathLen;
    m.data[base] = startEff;
    let eth = ethPrice;
    let btc = btcPrice;
    let link = linkPrice;
    let firstDepeg: number | null = null;
    const engine = new ReturnEngine(rng, [volatility, btcVol, linkVol], {
      rho,
      nu: params.nu,
      ewmaLambda: params.ewmaLambda,
    });

    for (let d = 1; d <= days; d++) {
      let f: number[];
      if (d === 1 && initialCrash !== 0) {
        f = engine.crashStep(0, initialCrash);
      } else {
        f = engine.step().factors;
      }
      eth = eth * f[0];
      btc = btc * f[1];
      link = link * f[2];
      const eff = wEth * eth + wBtc * btc + wLink * link;
      m.data[base + d] = eff;

      if (firstDepeg === null) {
        const ratio = (eff / startEff) * collateralRatio;
        if (ratio < liquidationThreshold) firstDepeg = d;
      }
    }

    depegDays[i] = firstDepeg;
    if (firstDepeg !== null) depegCount++;
    if (hooks?.onBatch && (i + 1) % batch === 0 && i + 1 < numSimulations)
      hooks.onBatch(m, depegDays, i + 1);
  }

  return buildResult(m, depegCount, depegDays, seed);
}

/**
 * UST algorithmic death-spiral sim (EDUCATIONAL ONLY — collapsed May 2022).
 *
 * Reflexive mint/burn between UST and LUNA with no external collateral.
 * Day 1: initial sell pressure drops UST. Subsequent days: arbitrageurs
 * redeem cheap UST for $1 of LUNA, minting new LUNA. Dilution drops LUNA
 * price, panic (reflexivity) amplifies the drop, and UST's backing
 * shrinks — a self-reinforcing loop. Paths return UST price; `luna.paths`
 * contains LUNA price normalized to its starting value.
 */
export function simulateUST(
  params: SimulationParams,
  hooks?: SimHooks
): SimulationResult {
  assertSimCount(params);
  const seed = params.seed ?? randomSeed();
  const rng = new Rng(seed);
  const days = params.days;
  const numSimulations = params.numSimulations;
  const initialSellPressure = params.initialSellPressure ?? 0.05;
  const reflexivity = params.reflexivityFactor ?? 3.0;
  const lunaMarketCap =
    params.lunaStartMarketCap ?? SNAPSHOTS.ust.lunaMarketCap.value;
  const ustSupply = params.ustSupplyUsd ?? SNAPSHOTS.ust.supplyUsd.value;
  const FULL_COLLAPSE = 0.5;

  // Pre-collapse LUNA supply; the absolute value cancels out for the
  // normalized luna chart but drives the dilution dynamic in absolute terms.
  const lunaSupply0 = SNAPSHOTS.ust.lunaSupply.value;
  const lunaPrice0 = lunaMarketCap / lunaSupply0;

  const pathLen = days + 1;
  const ustM: PathMatrix = {
    data: new Float64Array(numSimulations * pathLen),
    numPaths: numSimulations,
    pathLen,
  };
  const lunaM: PathMatrix = {
    data: new Float64Array(numSimulations * pathLen),
    numPaths: numSimulations,
    pathLen,
  };
  const depegDays: (number | null)[] = new Array(numSimulations);
  const batch = batchSize(numSimulations);
  let depegCount = 0;

  for (let i = 0; i < numSimulations; i++) {
    const base = i * pathLen;
    ustM.data[base] = 1.0;
    lunaM.data[base] = 1.0;
    let ustPrice = 1.0;
    let lunaPrice = lunaPrice0;
    let lunaSupply = lunaSupply0;
    let firstDepeg: number | null = null;

    for (let d = 1; d <= days; d++) {
      if (d === 1) {
        const sellAmount = ustSupply * initialSellPressure;
        const impact = sellAmount / (ustSupply * 0.1); // 10% depth
        ustPrice = Math.max(0.01, 1.0 - impact + rng.normal(0, 0.02));
      } else {
        if (ustPrice < 1.0) {
          const redeemAmount = (1.0 - ustPrice) * ustSupply * 0.05;
          const newLunaMinted = redeemAmount / Math.max(0.001, lunaPrice);
          lunaSupply += newLunaMinted;
          lunaPrice = lunaMarketCap / lunaSupply;
          lunaPrice *= 1 - reflexivity * (1.0 - ustPrice);
          if (lunaPrice < 0.001) lunaPrice = 0.001;
        }
        const ustBacking = lunaPrice * lunaSupply;
        ustPrice = Math.min(
          1.0,
          ustBacking / ustSupply + rng.normal(0, 0.01)
        );
        if (ustPrice < 0.001) ustPrice = 0.001;
      }

      ustM.data[base + d] = ustPrice;
      lunaM.data[base + d] = lunaPrice / lunaPrice0;
      if (firstDepeg === null && ustPrice < FULL_COLLAPSE) firstDepeg = d;
    }

    depegDays[i] = firstDepeg;
    if (firstDepeg !== null) depegCount++;
    if (hooks?.onBatch && (i + 1) % batch === 0 && i + 1 < numSimulations)
      hooks.onBatch(ustM, depegDays, i + 1);
  }

  const ustS = summarize(ustM);
  const lunaS = summarize(lunaM);

  return {
    paths: ustM,
    depegCount,
    depegProbability: numSimulations > 0 ? depegCount / numSimulations : 0,
    depegProbabilityCI: wilsonCI(depegCount, numSimulations),
    seed,
    depegDays,
    worstPath: pathRow(ustM, ustS.worstIdx),
    medianPath: ustS.medianPath,
    percentile5Path: ustS.percentile5Path,
    percentile95Path: ustS.percentile95Path,
    luna: {
      paths: lunaM,
      // Same index as the worst UST path for cross-chart coherence.
      worstPath: pathRow(lunaM, ustS.worstIdx),
      medianPath: lunaS.medianPath,
      percentile5Path: lunaS.percentile5Path,
      percentile95Path: lunaS.percentile95Path,
    },
  };
}

/**
 * Overcollateralized BTC-backed sim. When `lstBasisRisk` is false this is
 * identical to `simulatePaths`. When true, a second correlated RV is
 * simulated: the stBTC/BTC exchange rate. Effective collateral per day is
 *
 *   (wBtc * btcPrice) + (wStBtc * btcPrice * ratio)
 *
 * Jump probability is conditioned on the day's BTC move — LST depegs
 * historically happen *because* of underlying crashes (see stETH during
 * 3AC, June 2022). At 2%/day baseline over 30 days, ~45% of paths
 * experience ≥1 LST shock; over 90 days, ~84%. Conditioned BTC-drop
 * branches push those rates materially higher.
 */
export function simulateOvercollateralizedBTC(
  btcPrice: number,
  params: SimulationParams,
  hooks?: SimHooks
): SimulationResult {
  assertSimCount(params);
  const seed = params.seed ?? randomSeed();
  const {
    volatility,
    days,
    numSimulations,
    initialCrash,
    collateralRatio,
    liquidationThreshold,
    lstBasisRisk,
    lstWeights,
  } = params;

  if (!lstBasisRisk)
    return simulatePaths(btcPrice, { ...params, seed }, hooks);
  const rng = new Rng(seed);

  const wBtc = lstWeights?.btc ?? 0.6;
  const wStBtc = lstWeights?.stBtc ?? 0.4;

  // stBTC/BTC process
  const MEAN_REV = 0.02;
  const NOISE_SD = 0.005;
  const FLOOR = 0.01; // Babylon-exploit scenarios must be representable

  const pathLen = days + 1;
  const m: PathMatrix = {
    data: new Float64Array(numSimulations * pathLen),
    numPaths: numSimulations,
    pathLen,
  };
  const depegDays: (number | null)[] = new Array(numSimulations);
  const batch = batchSize(numSimulations);
  let depegCount = 0;

  const startEff = btcPrice; // ratio starts at 1, so effective == btcPrice
  for (let i = 0; i < numSimulations; i++) {
    const base = i * pathLen;
    m.data[base] = startEff;
    let btc = btcPrice;
    let ratio = 1.0;
    let firstDepeg: number | null = null;
    const engine = new ReturnEngine(rng, [volatility], {
      nu: params.nu,
      ewmaLambda: params.ewmaLambda,
    });

    for (let d = 1; d <= days; d++) {
      // BTC step
      const btcPrev = btc;
      if (d === 1 && initialCrash !== 0)
        btc = btc * engine.crashStep(0, initialCrash)[0];
      else btc = btc * engine.step().factors[0];
      const btcDayReturn = (btc - btcPrev) / btcPrev;

      // Jump probability/magnitude conditioned on BTC drop
      let jumpProb = 0.02;
      let jumpMag = -0.03;
      if (btcDayReturn < -0.1) {
        jumpProb = 0.3;
        jumpMag = -0.08;
      } else if (btcDayReturn < -0.05) {
        jumpProb = 0.15;
        jumpMag = -0.05;
      }

      const meanReversion = MEAN_REV * (1.0 - ratio);
      const shock = rng.normal(0, NOISE_SD);
      let nextRatio = ratio + meanReversion + shock;
      // Randomized jump magnitude (σ = 40% of the mean) instead of a
      // deterministic table value.
      if (rng.next() < jumpProb)
        nextRatio += rng.normal(jumpMag, 0.4 * Math.abs(jumpMag));
      if (nextRatio < FLOOR) nextRatio = FLOOR;
      ratio = nextRatio;

      const eff = wBtc * btc + wStBtc * btc * ratio;
      m.data[base + d] = eff;

      if (firstDepeg === null) {
        const currentRatio = (eff / startEff) * collateralRatio;
        if (currentRatio < liquidationThreshold) firstDepeg = d;
      }
    }

    depegDays[i] = firstDepeg;
    if (firstDepeg !== null) depegCount++;
    if (hooks?.onBatch && (i + 1) % batch === 0 && i + 1 < numSimulations)
      hooks.onBatch(m, depegDays, i + 1);
  }

  return buildResult(m, depegCount, depegDays, seed);
}
