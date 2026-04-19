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
