import { describe, expect, it } from "vitest";
import { Rng, wilsonCI } from "../lib/rng";
import { ReturnEngine } from "../lib/returns";
import { pathRow, simulateDAI } from "../lib/montecarlo";
import type { SimulationParams } from "../lib/types";

const P: SimulationParams = {
  seed: 42,
  volatility: 0.04,
  days: 30,
  numSimulations: 2000,
  initialCrash: 0,
  collateralRatio: 1.5,
  liquidationThreshold: 1.45,
};

describe("seeded RNG", () => {
  it("same seed ⇒ bit-identical path matrix", () => {
    const a = simulateDAI(3000, P);
    const b = simulateDAI(3000, P);
    expect(a.depegCount).toBe(b.depegCount);
    expect(a.paths).toEqual(b.paths);
    expect(a.seed).toBe(42);
  });

  it("different seeds ⇒ different paths", () => {
    const a = simulateDAI(3000, P);
    const c = simulateDAI(3000, { ...P, seed: 43 });
    expect(pathRow(a.paths, 0)).not.toEqual(pathRow(c.paths, 0));
  });

  it("normal() moments: mean ≈ 0, var ≈ 1 at N=100k", () => {
    const rng = new Rng(123);
    const N = 100_000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < N; i++) {
      const x = rng.normal(0, 1);
      sum += x;
      sumSq += x * x;
    }
    const mean = sum / N;
    const variance = sumSq / N - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(Math.abs(variance - 1)).toBeLessThan(0.03);
  });

  it("Student-t draws are unit-variance and fatter-tailed than normal", () => {
    const rng = new Rng(7);
    const engine = new ReturnEngine(rng, [0.04], { nu: 5 });
    const N = 100_000;
    let sum = 0;
    let sumSq = 0;
    let tail = 0;
    for (let i = 0; i < N; i++) {
      const [x] = engine.z();
      sum += x;
      sumSq += x * x;
      if (Math.abs(x) > 3) tail++;
    }
    const mean = sum / N;
    const variance = sumSq / N - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(Math.abs(variance - 1)).toBeLessThan(0.05);
    // P(|Z| > 3) ≈ 0.27% for a normal; variance-normalized t(5) is ~3× that.
    expect(tail / N).toBeGreaterThan(0.005);
  });

  it("wilsonCI brackets the point estimate and stays in [0,1]", () => {
    const [lo, hi] = wilsonCI(124, 10_000);
    expect(lo).toBeGreaterThan(0);
    expect(lo).toBeLessThan(0.0124);
    expect(hi).toBeGreaterThan(0.0124);
    expect(hi).toBeLessThan(1);
    expect(wilsonCI(0, 10_000)[0]).toBe(0);
    expect(wilsonCI(10_000, 10_000)[1]).toBe(1);
  });
});
