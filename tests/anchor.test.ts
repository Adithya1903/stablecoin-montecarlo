import { describe, expect, it } from "vitest";
import { simulatePaths } from "../lib/montecarlo";
import type { SimulationParams } from "../lib/types";

/** Standard normal CDF via Abramowitz–Stegun 7.1.26 erf approximation. */
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp((-x * x) / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

describe("closed-form anchor (log-space Gaussian mode)", () => {
  it("day-1 breach probability matches Φ((ln(threshold/CR) − μ)/σ)", () => {
    const sigma = 0.04;
    const cr = 1.5;
    const threshold = 1.45;
    const N = 50_000;
    const params: SimulationParams = {
      seed: 42,
      nu: 100, // Gaussian mode
      volatility: sigma,
      days: 1,
      numSimulations: N,
      initialCrash: 0,
      collateralRatio: cr,
      liquidationThreshold: threshold,
    };
    const result = simulatePaths(3000, params);

    // Breach on day 1 ⟺ factor < threshold/CR ⟺ μ + σz < ln(threshold/CR),
    // with drift μ = −σ²/2.
    const mu = -0.5 * sigma * sigma;
    const analytic = normalCdf((Math.log(threshold / cr) - mu) / sigma);

    const se = Math.sqrt((analytic * (1 - analytic)) / N);
    expect(Math.abs(result.depegProbability - analytic)).toBeLessThan(
      4 * se + 1e-4 // 4σ Monte-Carlo band + CDF-approximation slack
    );
  });
});
