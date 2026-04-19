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

export function simulateDAI(
  currentPrice: number,
  params: SimulationParams
): SimulationResult {
  return simulatePaths(currentPrice, params);
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
