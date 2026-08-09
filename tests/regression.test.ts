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

// Pins of CURRENTLY-TRUE behavior. When a model is deliberately rebuilt,
// the rebuild inverts the corresponding pin as part of its own change —
// plan task 2.3 did exactly that for the fiat model below.
describe("behavioral regression pins", () => {
  it("fiat model at defaults: small but NONZERO depeg probability with a CI (task 2.3)", () => {
    const r = simulateFiatBacked({
      ...BASE,
      numSimulations: 10_000,
      eventProbability: 0.0001,
      redemptionSeverity: 0.1,
      reserveLiquidity: 1.0,
      forceDay1Event: false,
    });
    // Rare events are importance-sampled, so 10k paths resolve a
    // ~0.3%/month probability with a meaningful CI.
    expect(r.depegProbability).toBeGreaterThan(0);
    expect(r.depegProbability).toBeLessThan(0.02);
    expect(r.depegProbabilityCI[1]).toBeGreaterThan(r.depegProbabilityCI[0]);
    expect(r.effectiveSampleSize).toBeDefined();
    expect(r.effectiveSampleSize!).toBeGreaterThan(100);
  });

  it("fiat SVB scenario: multi-day sub-$0.97 excursion with recovery", () => {
    const r = simulateFiatBacked({
      ...BASE,
      days: 30,
      numSimulations: 4000,
      eventProbability: 0.0001,
      redemptionSeverity: 0.15,
      reserveLiquidity: 0.5,
      forceDay1Event: true,
    });
    // Every path has the day-1 event, so the median path shows the run.
    const median = r.medianPath;
    const below = median.filter((v) => v < 0.97).length;
    expect(below).toBeGreaterThanOrEqual(2); // multi-day excursion
    const minPeg = Math.min(...median);
    expect(minPeg).toBeLessThan(0.93); // deep dip, SVB-like
    expect(minPeg).toBeGreaterThan(0.7); // but not a collapse
    expect(median[median.length - 1]).toBeGreaterThan(0.97); // recovers
  });

  it("fiat peg dip is continuous in severity and reserveLiquidity", () => {
    const minOf = (sev: number, liq: number): number => {
      const r = simulateFiatBacked({
        ...BASE,
        days: 14,
        numSimulations: 1500,
        eventProbability: 0.0001,
        redemptionSeverity: sev,
        reserveLiquidity: liq,
        forceDay1Event: true,
      });
      return Math.min(...r.medianPath);
    };
    // No discontinuous jump between adjacent parameter steps (the old
    // model jumped from ≥0.995 straight to effLiq/severity).
    let prev = minOf(0.06, 1.0);
    for (const sev of [0.08, 0.1, 0.12, 0.14, 0.16]) {
      const cur = minOf(sev, 1.0);
      expect(cur).toBeLessThanOrEqual(prev + 0.005); // monotone-ish down
      expect(Math.abs(cur - prev)).toBeLessThan(0.08); // no cliff
      prev = cur;
    }
    prev = minOf(0.12, 1.0);
    for (const liq of [0.85, 0.7, 0.55, 0.4]) {
      const cur = minOf(0.12, liq);
      expect(cur).toBeLessThanOrEqual(prev + 0.005);
      expect(Math.abs(cur - prev)).toBeLessThan(0.1);
      prev = cur;
    }
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
    const { data, numPaths, pathLen } = r.paths;
    for (let i = 0; i < numPaths; i++) {
      expect(data[i * pathLen + 1]).toBe(0.01);
    }
    expect(r.depegProbability).toBe(1);
  });
});
