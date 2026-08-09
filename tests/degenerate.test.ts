import { describe, expect, it } from "vitest";
import {
  InvalidParamsError,
  simulateDAI,
  simulateFiatBacked,
  simulateGHO,
  simulateLUSD,
  simulateOvercollateralizedBTC,
  simulatePaths,
  simulateUSDe,
  simulateUST,
} from "../lib/montecarlo";
import type { SimulationParams } from "../lib/types";

const BASE: SimulationParams = {
  seed: 1,
  volatility: 0.04,
  days: 30,
  numSimulations: 100,
  initialCrash: 0,
  collateralRatio: 1.5,
  liquidationThreshold: 1.45,
};

const RUNNERS: Array<[string, (p: SimulationParams) => unknown]> = [
  ["simulatePaths", (p) => simulatePaths(3000, p)],
  ["simulateDAI", (p) => simulateDAI(3000, p)],
  ["simulateLUSD", (p) => simulateLUSD(3000, p)],
  ["simulateFiatBacked", (p) => simulateFiatBacked(p)],
  ["simulateUSDe", (p) => simulateUSDe(p)],
  ["simulateGHO", (p) => simulateGHO(3000, 85000, p)],
  ["simulateUST", (p) => simulateUST(p)],
  ["simulateOvercollateralizedBTC", (p) => simulateOvercollateralizedBTC(85000, p)],
];

describe("degenerate inputs", () => {
  it("numSimulations: 0 throws InvalidParamsError in every simulator", () => {
    for (const [name, run] of RUNNERS) {
      expect(() => run({ ...BASE, numSimulations: 0 }), name).toThrow(
        InvalidParamsError
      );
    }
  });

  it("days: 0 throws InvalidParamsError", () => {
    expect(() => simulatePaths(3000, { ...BASE, days: 0 })).toThrow(
      InvalidParamsError
    );
  });

  it("NaN params are rejected", () => {
    expect(() =>
      simulatePaths(3000, { ...BASE, volatility: NaN })
    ).toThrow(InvalidParamsError);
    expect(() =>
      simulatePaths(3000, { ...BASE, numSimulations: NaN })
    ).toThrow(InvalidParamsError);
    expect(() => simulatePaths(3000, { ...BASE, days: NaN })).toThrow(
      InvalidParamsError
    );
  });

  it("valid minimal run still works (1 path, 1 day)", () => {
    const r = simulatePaths(3000, { ...BASE, numSimulations: 1, days: 1 });
    expect(r.paths).toHaveLength(1);
    expect(r.paths[0]).toHaveLength(2);
    expect(r.worstPath).toBe(r.paths[0]);
  });
});
