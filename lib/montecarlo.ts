import type { SimulationParams, SimulationResult } from "./types";

let spareNormal: number | null = null;

export function randomNormal(mean = 0, stdDev = 1): number {
  if (spareNormal !== null) {
    const z = spareNormal;
    spareNormal = null;
    return mean + stdDev * z;
  }
  let u = 0;
  do {
    u = Math.random();
  } while (u === 0);
  const v = Math.random();
  const mag = Math.sqrt(-2 * Math.log(u));
  const theta = 2 * Math.PI * v;
  const z0 = mag * Math.cos(theta);
  const z1 = mag * Math.sin(theta);
  spareNormal = z1;
  return mean + stdDev * z0;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = lo + 1;
  const frac = pos - lo;
  if (hi >= sorted.length) return sorted[lo];
  return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
}

export function simulatePaths(
  currentPrice: number,
  params: SimulationParams
): SimulationResult {
  const {
    volatility,
    days,
    numSimulations,
    initialCrash,
    collateralRatio,
    liquidationThreshold,
  } = params;

  const pathLen = days + 1;
  const paths: number[][] = new Array(numSimulations);
  const depegDays: (number | null)[] = new Array(numSimulations);
  const finalPrices = new Float64Array(numSimulations);
  let depegCount = 0;

  for (let i = 0; i < numSimulations; i++) {
    const path = new Array<number>(pathLen);
    path[0] = currentPrice;
    let price = currentPrice;
    let firstDepegDay: number | null = null;

    for (let d = 1; d <= days; d++) {
      if (d === 1 && initialCrash !== 0) {
        price = price * (1 + initialCrash);
      } else {
        price = price * (1 + randomNormal(0, volatility));
      }
      path[d] = price;

      if (firstDepegDay === null) {
        const ratio = (price / currentPrice) * collateralRatio;
        if (ratio < liquidationThreshold) firstDepegDay = d;
      }
    }

    paths[i] = path;
    depegDays[i] = firstDepegDay;
    finalPrices[i] = price;
    if (firstDepegDay !== null) depegCount++;
  }

  const medianPath = new Array<number>(pathLen);
  const percentile5Path = new Array<number>(pathLen);
  const percentile95Path = new Array<number>(pathLen);
  const column = new Array<number>(numSimulations);
  for (let d = 0; d < pathLen; d++) {
    for (let i = 0; i < numSimulations; i++) column[i] = paths[i][d];
    const sorted = column.slice().sort((a, b) => a - b);
    percentile5Path[d] = quantile(sorted, 0.05);
    medianPath[d] = quantile(sorted, 0.5);
    percentile95Path[d] = quantile(sorted, 0.95);
  }

  let worstIdx = 0;
  for (let i = 1; i < numSimulations; i++) {
    if (finalPrices[i] < finalPrices[worstIdx]) worstIdx = i;
  }

  return {
    paths,
    depegCount,
    depegProbability: numSimulations > 0 ? depegCount / numSimulations : 0,
    depegDays,
    worstPath: paths[worstIdx],
    medianPath,
    percentile5Path,
    percentile95Path,
  };
}

/**
 * DAI sim with USDC PSM dependency. ~35% of DAI's backing sits in the Peg
 * Stability Module as USDC, so a USDC depeg reduces DAI's effective
 * collateral even if ETH is fine (see SVB, March 2023). When `usdcShock`
 * is 0 this degrades to `simulatePaths` (ETH-only) for parity.
 */
export function simulateDAI(
  ethPrice: number,
  params: SimulationParams
): SimulationResult {
  const shock = params.usdcShock ?? 0;
  if (shock === 0) return simulatePaths(ethPrice, params);

  const {
    volatility,
    days,
    numSimulations,
    initialCrash,
    collateralRatio,
    liquidationThreshold,
  } = params;

  const ETH_WEIGHT = 0.65;
  const USDC_WEIGHT = 0.35;
  const USDC_NOISE = 0.001;
  const USDC_REVERT = 1 / 7; // ~7-day mean reversion toward $1

  const pathLen = days + 1;
  const paths: number[][] = new Array(numSimulations);
  const depegDays: (number | null)[] = new Array(numSimulations);
  const finalEff = new Float64Array(numSimulations);
  let depegCount = 0;

  const startEff = ETH_WEIGHT * ethPrice + USDC_WEIGHT * ethPrice;
  // Effective-collateral path is reported in ETH-denominated units (same base
  // as startEff) so downstream UI keeps a single numeric scale.

  for (let i = 0; i < numSimulations; i++) {
    const path = new Array<number>(pathLen);
    path[0] = startEff;
    let eth = ethPrice;
    let usdc = 1.0;
    let firstDepeg: number | null = null;

    for (let d = 1; d <= days; d++) {
      if (d === 1 && initialCrash !== 0) eth = eth * (1 + initialCrash);
      else eth = eth * (1 + randomNormal(0, volatility));

      if (d === 1) usdc = 1.0 + shock;
      else usdc = usdc + USDC_REVERT * (1.0 - usdc) + randomNormal(0, USDC_NOISE);
      if (usdc < 0) usdc = 0;

      const eff = ETH_WEIGHT * eth + USDC_WEIGHT * ethPrice * usdc;
      path[d] = eff;

      if (firstDepeg === null) {
        const ratio = (eff / startEff) * collateralRatio;
        if (ratio < liquidationThreshold) firstDepeg = d;
      }
    }

    paths[i] = path;
    depegDays[i] = firstDepeg;
    finalEff[i] = path[days];
    if (firstDepeg !== null) depegCount++;
  }

  const medianPath = new Array<number>(pathLen);
  const percentile5Path = new Array<number>(pathLen);
  const percentile95Path = new Array<number>(pathLen);
  const column = new Array<number>(numSimulations);
  for (let d = 0; d < pathLen; d++) {
    for (let i = 0; i < numSimulations; i++) column[i] = paths[i][d];
    const sorted = column.slice().sort((a, b) => a - b);
    percentile5Path[d] = quantile(sorted, 0.05);
    medianPath[d] = quantile(sorted, 0.5);
    percentile95Path[d] = quantile(sorted, 0.95);
  }

  let worstIdx = 0;
  for (let i = 1; i < numSimulations; i++) {
    if (finalEff[i] < finalEff[worstIdx]) worstIdx = i;
  }

  return {
    paths,
    depegCount,
    depegProbability: numSimulations > 0 ? depegCount / numSimulations : 0,
    depegDays,
    worstPath: paths[worstIdx],
    medianPath,
    percentile5Path,
    percentile95Path,
  };
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
  params: SimulationParams
): SimulationResult {
  const {
    volatility,
    days,
    numSimulations,
    initialCrash,
  } = params;
  const userCR0 = params.userCR ?? 1.5;
  const systemCR0 = params.systemCR ?? 2.5;

  const pathLen = days + 1;
  const paths: number[][] = new Array(numSimulations);
  const depegDays: (number | null)[] = new Array(numSimulations);
  const finalPrices = new Float64Array(numSimulations);
  let depegCount = 0;
  let recoveryCount = 0;
  let recoverySum = 0;

  for (let i = 0; i < numSimulations; i++) {
    const path = new Array<number>(pathLen);
    path[0] = ethPrice;
    let price = ethPrice;
    let firstDepeg: number | null = null;
    let firstRecovery: number | null = null;

    for (let d = 1; d <= days; d++) {
      if (d === 1 && initialCrash !== 0) price = price * (1 + initialCrash);
      else price = price * (1 + randomNormal(0, volatility));
      path[d] = price;

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

    paths[i] = path;
    depegDays[i] = firstDepeg;
    finalPrices[i] = price;
    if (firstDepeg !== null) depegCount++;
    if (firstRecovery !== null) {
      recoveryCount++;
      recoverySum += firstRecovery;
    }
  }

  const medianPath = new Array<number>(pathLen);
  const percentile5Path = new Array<number>(pathLen);
  const percentile95Path = new Array<number>(pathLen);
  const column = new Array<number>(numSimulations);
  for (let d = 0; d < pathLen; d++) {
    for (let i = 0; i < numSimulations; i++) column[i] = paths[i][d];
    const sorted = column.slice().sort((a, b) => a - b);
    percentile5Path[d] = quantile(sorted, 0.05);
    medianPath[d] = quantile(sorted, 0.5);
    percentile95Path[d] = quantile(sorted, 0.95);
  }

  let worstIdx = 0;
  for (let i = 1; i < numSimulations; i++) {
    if (finalPrices[i] < finalPrices[worstIdx]) worstIdx = i;
  }

  return {
    paths,
    depegCount,
    depegProbability: numSimulations > 0 ? depegCount / numSimulations : 0,
    depegDays,
    worstPath: paths[worstIdx],
    medianPath,
    percentile5Path,
    percentile95Path,
    recoveryModeCount: recoveryCount,
    recoveryModeAvgDay: recoveryCount > 0 ? recoverySum / recoveryCount : null,
  };
}

/**
 * USDe sim. Ethena's delta-neutral model cancels price moves out — the
 * risk is funding rates. When funding is positive, shorts earn; when
 * negative, shorts PAY and the reserve fund drains. Reserve hitting 0
 * is the depeg event. Paths record reserve balance over time (USD), so
 * downstream UI treats the "price" axis as dollars of reserve.
 */
export function simulateUSDe(params: SimulationParams): SimulationResult {
  const days = params.days;
  const numSimulations = params.numSimulations;
  const fundingVol = params.fundingRateVol ?? 0.02;
  const shockApr = params.fundingRateShock ?? 0;
  const startReserve = params.reserveFund ?? 50_000_000;
  const totalSupply = params.totalSupply ?? 3_000_000_000;
  const meanDaily = params.fundingMeanDaily ?? 0.0001;

  const pathLen = days + 1;
  const paths: number[][] = new Array(numSimulations);
  const depegDays: (number | null)[] = new Array(numSimulations);
  const finalReserve = new Float64Array(numSimulations);
  let depegCount = 0;

  for (let i = 0; i < numSimulations; i++) {
    const path = new Array<number>(pathLen);
    path[0] = startReserve;
    let reserve = startReserve;
    let firstDepeg: number | null = null;

    for (let d = 1; d <= days; d++) {
      const dailyRate =
        d === 1 && shockApr !== 0
          ? shockApr / 365
          : randomNormal(meanDaily, fundingVol);
      reserve += totalSupply * dailyRate;
      if (reserve <= 0) {
        if (firstDepeg === null) firstDepeg = d;
        reserve = 0;
      }
      path[d] = reserve;
    }

    paths[i] = path;
    depegDays[i] = firstDepeg;
    finalReserve[i] = path[days];
    if (firstDepeg !== null) depegCount++;
  }

  const medianPath = new Array<number>(pathLen);
  const percentile5Path = new Array<number>(pathLen);
  const percentile95Path = new Array<number>(pathLen);
  const column = new Array<number>(numSimulations);
  for (let d = 0; d < pathLen; d++) {
    for (let i = 0; i < numSimulations; i++) column[i] = paths[i][d];
    const sorted = column.slice().sort((a, b) => a - b);
    percentile5Path[d] = quantile(sorted, 0.05);
    medianPath[d] = quantile(sorted, 0.5);
    percentile95Path[d] = quantile(sorted, 0.95);
  }

  let worstIdx = 0;
  for (let i = 1; i < numSimulations; i++) {
    if (finalReserve[i] < finalReserve[worstIdx]) worstIdx = i;
  }

  return {
    paths,
    depegCount,
    depegProbability: numSimulations > 0 ? depegCount / numSimulations : 0,
    depegDays,
    worstPath: paths[worstIdx],
    medianPath,
    percentile5Path,
    percentile95Path,
  };
}

/**
 * GHO sim. Multi-collateral basket (50% ETH, 30% BTC, 20% LINK) with a
 * correlated-returns engine. The correlation slider sets the pairwise
 * correlation for a 3×3 matrix with 1s on the diagonal; we take the
 * Cholesky factor L and produce correlated daily returns as `L · z` for
 * i.i.d. standard-normal z. Edge cases rho=0 and rho=1 are handled
 * directly to avoid numeric blow-ups in L.
 */
export function simulateGHO(
  ethPrice: number,
  btcPrice: number,
  params: SimulationParams
): SimulationResult {
  const {
    volatility,
    days,
    numSimulations,
    initialCrash,
    collateralRatio,
    liquidationThreshold,
  } = params;
  const rho = Math.max(0, Math.min(1, params.correlation ?? 0.7));

  const btcVol = 0.75 * volatility;
  const linkVol = 1.5 * volatility;
  const wEth = 0.5;
  const wBtc = 0.3;
  const wLink = 0.2;
  const linkPrice = 15; // notional LINK start price; cancels out of ratio

  // Cholesky of [[1,r,r],[r,1,r],[r,r,1]]
  //   L11 = sqrt(1-r²), L21 = r, L22 = r(1-r)/L11, L33 = sqrt(1-r²-L22²)
  // Special-case r=1 (perfectly correlated) and r=0 (independent) so the
  // division by L11 stays well-conditioned.
  const applyCorr = (z0: number, z1: number, z2: number): [number, number, number] => {
    if (rho >= 0.999) return [z0, z0, z0];
    if (rho <= 0.001) return [z0, z1, z2];
    const L11 = Math.sqrt(1 - rho * rho);
    const L22 = (rho * (1 - rho)) / L11;
    const L33 = Math.sqrt(Math.max(0, 1 - rho * rho - L22 * L22));
    return [
      z0,
      rho * z0 + L11 * z1,
      rho * z0 + L22 * z1 + L33 * z2,
    ];
  };

  const pathLen = days + 1;
  const paths: number[][] = new Array(numSimulations);
  const depegDays: (number | null)[] = new Array(numSimulations);
  const finalEff = new Float64Array(numSimulations);
  let depegCount = 0;

  const startEff = wEth * ethPrice + wBtc * btcPrice + wLink * linkPrice;

  for (let i = 0; i < numSimulations; i++) {
    const path = new Array<number>(pathLen);
    path[0] = startEff;
    let eth = ethPrice;
    let btc = btcPrice;
    let link = linkPrice;
    let firstDepeg: number | null = null;

    for (let d = 1; d <= days; d++) {
      if (d === 1 && initialCrash !== 0) {
        eth = eth * (1 + initialCrash);
        btc = btc * (1 + initialCrash);
        link = link * (1 + initialCrash);
      } else {
        const [ze, zb, zl] = applyCorr(
          randomNormal(0, 1),
          randomNormal(0, 1),
          randomNormal(0, 1)
        );
        eth = eth * (1 + ze * volatility);
        btc = btc * (1 + zb * btcVol);
        link = link * (1 + zl * linkVol);
      }
      const eff = wEth * eth + wBtc * btc + wLink * link;
      path[d] = eff;

      if (firstDepeg === null) {
        const ratio = (eff / startEff) * collateralRatio;
        if (ratio < liquidationThreshold) firstDepeg = d;
      }
    }

    paths[i] = path;
    depegDays[i] = firstDepeg;
    finalEff[i] = path[days];
    if (firstDepeg !== null) depegCount++;
  }

  const medianPath = new Array<number>(pathLen);
  const percentile5Path = new Array<number>(pathLen);
  const percentile95Path = new Array<number>(pathLen);
  const column = new Array<number>(numSimulations);
  for (let d = 0; d < pathLen; d++) {
    for (let i = 0; i < numSimulations; i++) column[i] = paths[i][d];
    const sorted = column.slice().sort((a, b) => a - b);
    percentile5Path[d] = quantile(sorted, 0.05);
    medianPath[d] = quantile(sorted, 0.5);
    percentile95Path[d] = quantile(sorted, 0.95);
  }

  let worstIdx = 0;
  for (let i = 1; i < numSimulations; i++) {
    if (finalEff[i] < finalEff[worstIdx]) worstIdx = i;
  }

  return {
    paths,
    depegCount,
    depegProbability: numSimulations > 0 ? depegCount / numSimulations : 0,
    depegDays,
    worstPath: paths[worstIdx],
    medianPath,
    percentile5Path,
    percentile95Path,
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
  params: SimulationParams
): SimulationResult {
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

  if (!lstBasisRisk) return simulatePaths(btcPrice, params);

  const wBtc = lstWeights?.btc ?? 0.6;
  const wStBtc = lstWeights?.stBtc ?? 0.4;

  // stBTC/BTC process
  const MEAN_REV = 0.02;
  const NOISE_SD = 0.005;
  const FLOOR = 0.01; // Babylon-exploit scenarios must be representable

  const pathLen = days + 1;
  const paths: number[][] = new Array(numSimulations);
  const depegDays: (number | null)[] = new Array(numSimulations);
  const finalEff = new Float64Array(numSimulations);
  let depegCount = 0;

  const startEff = btcPrice; // ratio starts at 1, so effective == btcPrice
  for (let i = 0; i < numSimulations; i++) {
    const path = new Array<number>(pathLen);
    path[0] = startEff;
    let btc = btcPrice;
    let ratio = 1.0;
    let firstDepeg: number | null = null;

    for (let d = 1; d <= days; d++) {
      // BTC step
      const btcPrev = btc;
      if (d === 1 && initialCrash !== 0) btc = btc * (1 + initialCrash);
      else btc = btc * (1 + randomNormal(0, volatility));
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
      const shock = randomNormal(0, NOISE_SD);
      let nextRatio = ratio + meanReversion + shock;
      if (Math.random() < jumpProb) nextRatio += jumpMag;
      if (nextRatio < FLOOR) nextRatio = FLOOR;
      ratio = nextRatio;

      const eff = wBtc * btc + wStBtc * btc * ratio;
      path[d] = eff;

      if (firstDepeg === null) {
        const currentRatio = (eff / startEff) * collateralRatio;
        if (currentRatio < liquidationThreshold) firstDepeg = d;
      }
    }

    paths[i] = path;
    depegDays[i] = firstDepeg;
    finalEff[i] = path[days];
    if (firstDepeg !== null) depegCount++;
  }

  const medianPath = new Array<number>(pathLen);
  const percentile5Path = new Array<number>(pathLen);
  const percentile95Path = new Array<number>(pathLen);
  const column = new Array<number>(numSimulations);
  for (let d = 0; d < pathLen; d++) {
    for (let i = 0; i < numSimulations; i++) column[i] = paths[i][d];
    const sorted = column.slice().sort((a, b) => a - b);
    percentile5Path[d] = quantile(sorted, 0.05);
    medianPath[d] = quantile(sorted, 0.5);
    percentile95Path[d] = quantile(sorted, 0.95);
  }

  let worstIdx = 0;
  for (let i = 1; i < numSimulations; i++) {
    if (finalEff[i] < finalEff[worstIdx]) worstIdx = i;
  }

  return {
    paths,
    depegCount,
    depegProbability: numSimulations > 0 ? depegCount / numSimulations : 0,
    depegDays,
    worstPath: paths[worstIdx],
    medianPath,
    percentile5Path,
    percentile95Path,
  };
}
