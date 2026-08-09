import { describe, expect, it } from "vitest";
import { Rng } from "../lib/rng";
import { ReturnEngine } from "../lib/returns";

function empiricalPairwise(rho: number, n = 3, draws = 100_000): number[] {
  const rng = new Rng(11);
  const engine = new ReturnEngine(rng, new Array(n).fill(0.04), {
    rho,
    nu: 5,
  });
  const cols: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < draws; i++) {
    const z = engine.z();
    for (let j = 0; j < n; j++) cols[j].push(z[j]);
  }
  const corr = (a: number[], b: number[]): number => {
    const N = a.length;
    let ma = 0;
    let mb = 0;
    for (let i = 0; i < N; i++) {
      ma += a[i];
      mb += b[i];
    }
    ma /= N;
    mb /= N;
    let num = 0;
    let va = 0;
    let vb = 0;
    for (let i = 0; i < N; i++) {
      num += (a[i] - ma) * (b[i] - mb);
      va += (a[i] - ma) ** 2;
      vb += (b[i] - mb) ** 2;
    }
    return num / Math.sqrt(va * vb);
  };
  const out: number[] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) out.push(corr(cols[i], cols[j]));
  return out;
}

describe("correlation engine", () => {
  it("empirical pairwise correlation within ±0.02 of requested ρ", () => {
    for (const rho of [0.7, 0.2, -0.3]) {
      for (const c of empiricalPairwise(rho)) {
        expect(Math.abs(c - rho)).toBeLessThan(0.02);
      }
    }
  });

  it("ρ = 0 leaves assets uncorrelated", () => {
    for (const c of empiricalPairwise(0)) {
      expect(Math.abs(c)).toBeLessThan(0.02);
    }
  });

  it("enforces the −1/(N−1) validity bound: ρ=−0.9 clamps to ≈−0.5 for N=3", () => {
    for (const c of empiricalPairwise(-0.9)) {
      expect(Math.abs(c - -0.5)).toBeLessThan(0.02);
    }
  });

  it("ρ = 1 produces identical draws", () => {
    const rng = new Rng(3);
    const engine = new ReturnEngine(rng, [0.04, 0.04, 0.04], { rho: 1 });
    for (let i = 0; i < 100; i++) {
      const z = engine.z();
      expect(z[1]).toBe(z[0]);
      expect(z[2]).toBe(z[0]);
    }
  });
});
