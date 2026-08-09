import {
  simulateDAI,
  simulateFiatBacked,
  simulateGHO,
  simulateLUSD,
  simulateOvercollateralizedBTC,
  simulateUSDe,
  simulateUST,
  type SimHooks,
} from "./montecarlo";
import { getStablecoin, type StablecoinConfig } from "./stablecoins";
import type { SimulationParams, SimulationResult } from "./types";

export function isBtcBacked(coin: StablecoinConfig | undefined): boolean {
  if (!coin?.collateralAssets) return false;
  return coin.collateralAssets.some(
    (a) => /^(BTC|stBTC|wBTC)/i.test(a.asset) && a.weight > 0.3
  );
}

/** Coin id → the right simulator with the right price arguments. */
export function runSimulationFor(
  coinId: string,
  ethPrice: number,
  btcPrice: number,
  params: SimulationParams,
  hooks?: SimHooks
): SimulationResult {
  if (coinId === "ust") return simulateUST(params, hooks);
  if (coinId === "usde") return simulateUSDe(params, hooks);
  if (coinId === "usdc" || coinId === "usdt")
    return simulateFiatBacked(params, hooks);
  if (isBtcBacked(getStablecoin(coinId)))
    return simulateOvercollateralizedBTC(btcPrice, params, hooks);
  if (coinId === "lusd") return simulateLUSD(ethPrice, params, hooks);
  if (coinId === "gho") return simulateGHO(ethPrice, btcPrice, params, hooks);
  return simulateDAI(ethPrice, params, hooks);
}
