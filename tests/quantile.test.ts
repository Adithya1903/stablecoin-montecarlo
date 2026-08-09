import { describe, expect, it } from "vitest";
import { quantile } from "../lib/montecarlo";

// Reference values computed with numpy.quantile (default linear / R type-7).
describe("quantile (R type-7)", () => {
  it("matches numpy on [1..5]", () => {
    const s = [1, 2, 3, 4, 5];
    expect(quantile(s, 0)).toBe(1);
    expect(quantile(s, 0.25)).toBe(2);
    expect(quantile(s, 0.5)).toBe(3);
    expect(quantile(s, 0.75)).toBe(4);
    expect(quantile(s, 1)).toBe(5);
    expect(quantile(s, 0.05)).toBeCloseTo(1.2, 12);
    expect(quantile(s, 0.95)).toBeCloseTo(4.8, 12);
  });

  it("matches numpy on an 8-element sample", () => {
    const s = [1, 1, 2, 3, 4, 5, 6, 9]; // sorted
    expect(quantile(s, 0.5)).toBeCloseTo(3.5, 12); // pos 3.5
    expect(quantile(s, 0.9)).toBeCloseTo(6.9, 10); // pos 6.3 → 6 + 0.3·3
    expect(quantile(s, 0.1)).toBeCloseTo(1.0, 12); // pos 0.7 → between two 1s
  });

  it("handles single-element and empty arrays", () => {
    expect(quantile([7], 0.05)).toBe(7);
    expect(quantile([7], 0.95)).toBe(7);
    expect(quantile([], 0.5)).toBeNaN();
  });

  it("q=1 does not read past the end", () => {
    expect(quantile([2, 4], 1)).toBe(4);
  });
});
