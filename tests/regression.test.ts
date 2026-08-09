import { describe, expect, it } from "vitest";
import {
  simulateFiatBacked,
  simulateUSDe,
  simulateUST,
} from "../lib/montecarlo";
import type { SimulationParams } from "../lib/types";

const BASE: SimulationParams = {
  seed: 42,
  volatility: 0.04,
  days: 30,
  numSimulations: 2000,
  initialCrash: 0,
  collateralRatio: 1.5,
  liquidationThreshold: 1.1,
};

// Pins of CURRENTLY-TRUE behavior. When a model is deliberately rebuilt
// (e.g. plan task 2.3 makes the fiat model depeg-capable at defaults),
// the rebuild inverts the corresponding pin as part of its own change.
describe("behavioral regression pins", () => {
  it("fiat model at defaults cannot depeg — even with a forced day-1 event", () => {
    const r = simulateFiatBacked({
      ...BASE,
      eventProbability: 0.0001,
      redemptionSeverity: 0.1,
      baseLiquidity: 0.86,
      reserveLiquidity: 1.0,
      forceDay1Event: true,
    });
    // effLiq 0.86 ≥ severity 0.1 → dip capped at 0.5%, above the $0.97 line.
    expect(r.depegProbability).toBe(0);
  });

  it("USDe with post-0.2 defaults ⇒ near-zero depeg probability", () => {
    const r = simulateUSDe({ ...BASE, numSimulations: 5000 });
    // σ_daily = $3B × 0.0005 = $1.5M against a $50M reserve with positive
    // mean funding — depletion within 30 days is a >5σ event.
    expect(r.depegProbability).toBeLessThan(0.001);
  });

  it("UST at initialSellPressure ≥ 0.1 floors the day-1 price", () => {
    const r = simulateUST({
      ...BASE,
      days: 14,
      initialSellPressure: 0.11,
      reflexivityFactor: 4,
    });
    // Day-1 impact = 0.11/0.1 > 1 drives max(0.01, 1 − impact + ε) to the
    // 0.01 floor on every path (ε has σ = 0.02).
    for (const path of r.paths) {
      expect(path[1]).toBe(0.01);
    }
    expect(r.depegProbability).toBe(1);
  });
});
