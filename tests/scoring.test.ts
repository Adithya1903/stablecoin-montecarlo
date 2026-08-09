import { describe, expect, it } from 'vitest';
import {
  compositeScore,
  DEFAULT_WEIGHTS,
  PRESETS,
  presetMatching,
  weightsFromParam,
  weightsToParam,
} from '../src/lib/scoring';
import { SCORE_KEYS, type Scores, type Weights } from '../src/lib/types';

const uniform = (n: number): Scores => ({
  clarity: n, licensing: n, stablecoin: n, banking: n, tax: n, stability: n,
});

describe('compositeScore', () => {
  it('matches the spec formula Σ(scores·weights)/Σ(weights)', () => {
    const scores: Scores = { clarity: 80, licensing: 60, stablecoin: 40, banking: 20, tax: 100, stability: 0 };
    const expected =
      (80 * 20 + 60 * 20 + 40 * 20 + 20 * 15 + 100 * 10 + 0 * 15) / (20 + 20 + 20 + 15 + 10 + 15);
    expect(compositeScore(scores, DEFAULT_WEIGHTS)).toBeCloseTo(expected, 10);
  });

  it('uniform scores are invariant under any positive weighting', () => {
    const w: Weights = { clarity: 1, licensing: 99, stablecoin: 3, banking: 40, tax: 7, stability: 12 };
    expect(compositeScore(uniform(55), w)).toBeCloseTo(55, 10);
  });

  it('a single non-zero weight isolates that dimension', () => {
    const w: Weights = { clarity: 0, licensing: 0, stablecoin: 100, banking: 0, tax: 0, stability: 0 };
    const scores = { ...uniform(10), stablecoin: 87 };
    expect(compositeScore(scores, w)).toBe(87);
  });

  it('all-zero weights return 0 instead of NaN', () => {
    const w: Weights = { clarity: 0, licensing: 0, stablecoin: 0, banking: 0, tax: 0, stability: 0 };
    expect(compositeScore(uniform(90), w)).toBe(0);
  });

  it('negative weights are treated as zero, not as inverse preference', () => {
    const w: Weights = { ...DEFAULT_WEIGHTS, tax: -50 };
    const noTax: Weights = { ...DEFAULT_WEIGHTS, tax: 0 };
    const scores = { ...uniform(50), tax: 100 };
    expect(compositeScore(scores, w)).toBeCloseTo(compositeScore(scores, noTax), 10);
  });

  it('is bounded by [0, 100] for in-range scores', () => {
    expect(compositeScore(uniform(0), DEFAULT_WEIGHTS)).toBe(0);
    expect(compositeScore(uniform(100), DEFAULT_WEIGHTS)).toBe(100);
  });

  it('reweighting reorders: stablecoin preset promotes the stablecoin specialist', () => {
    const specialist: Scores = { clarity: 50, licensing: 50, stablecoin: 95, banking: 80, tax: 30, stability: 40 };
    const generalist: Scores = { clarity: 70, licensing: 70, stablecoin: 40, banking: 50, tax: 70, stability: 70 };
    const balanced = DEFAULT_WEIGHTS;
    const stablecoin = PRESETS.find((p) => p.id === 'stablecoin-payments')!.weights;

    expect(compositeScore(generalist, balanced)).toBeGreaterThan(compositeScore(specialist, balanced));
    expect(compositeScore(specialist, stablecoin)).toBeGreaterThan(compositeScore(generalist, stablecoin));
  });
});

describe('weights URL round-trip', () => {
  it('serializes in SCORE_KEYS order and parses back identically', () => {
    for (const p of PRESETS) {
      expect(weightsFromParam(weightsToParam(p.weights))).toEqual(p.weights);
    }
  });

  it('rejects malformed params', () => {
    expect(weightsFromParam(null)).toBeNull();
    expect(weightsFromParam('')).toBeNull();
    expect(weightsFromParam('1,2,3')).toBeNull();
    expect(weightsFromParam('20,20,20,15,10,abc')).toBeNull();
    expect(weightsFromParam('20,20,20,15,10,-5')).toBeNull();
    expect(weightsFromParam('20,20,20,15,10,101')).toBeNull();
  });

  it('recognises presets from raw weights', () => {
    expect(presetMatching(DEFAULT_WEIGHTS)?.id).toBe('balanced');
    expect(presetMatching({ ...DEFAULT_WEIGHTS, tax: 11 })).toBeNull();
  });

  it('every preset weights all six dimensions', () => {
    for (const p of PRESETS) {
      for (const k of SCORE_KEYS) {
        expect(p.weights[k]).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
