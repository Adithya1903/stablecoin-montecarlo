import { SCORE_KEYS, type ScoreKey, type Scores, type Weights } from './types';

export const DEFAULT_WEIGHTS: Weights = {
  clarity: 20,
  licensing: 20,
  stablecoin: 20,
  banking: 15,
  tax: 10,
  stability: 15,
};

export type Preset = { id: string; name: string; blurb: string; weights: Weights };

export const PRESETS: Preset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    blurb: 'The default weighting — no dimension dominates.',
    weights: DEFAULT_WEIGHTS,
  },
  {
    id: 'stablecoin-payments',
    name: 'Stablecoin payments',
    blurb: 'Issuing or moving fiat-referenced tokens: stablecoin regime and banking access dominate.',
    weights: { clarity: 15, licensing: 18, stablecoin: 32, banking: 22, tax: 5, stability: 8 },
  },
  {
    id: 'trading-venue',
    name: 'Trading venue',
    blurb: 'Running an exchange or broker: licensing path and regime stability dominate; stablecoin policy barely matters.',
    weights: { clarity: 20, licensing: 32, stablecoin: 4, banking: 14, tax: 8, stability: 22 },
  },
  {
    id: 'token-issuance',
    name: 'Token issuance',
    blurb: 'Issuing a token and holding a treasury: rule clarity and tax treatment dominate.',
    weights: { clarity: 32, licensing: 14, stablecoin: 8, banking: 10, tax: 26, stability: 10 },
  },
];

/**
 * Weighted composite: Σ(scores[k] · weights[k]) / Σ(weights).
 * All-zero weights have no defined ranking; we return 0 rather than NaN.
 */
export function compositeScore(scores: Scores, weights: Weights): number {
  let total = 0;
  let weightSum = 0;
  for (const k of SCORE_KEYS) {
    const w = Math.max(0, weights[k] ?? 0);
    total += (scores[k] ?? 0) * w;
    weightSum += w;
  }
  if (weightSum === 0) return 0;
  return total / weightSum;
}

export function clampScore(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/** Serialize weights for the URL: ?w=20,20,20,15,10,15 (order = SCORE_KEYS). */
export function weightsToParam(weights: Weights): string {
  return SCORE_KEYS.map((k) => String(Math.round(weights[k]))).join(',');
}

export function weightsFromParam(param: string | null | undefined): Weights | null {
  if (!param) return null;
  const parts = param.split(',').map((p) => Number.parseInt(p, 10));
  if (parts.length !== SCORE_KEYS.length || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 100)) {
    return null;
  }
  const out = {} as Weights;
  SCORE_KEYS.forEach((k: ScoreKey, i) => {
    out[k] = parts[i];
  });
  return out;
}

export function presetMatching(weights: Weights): Preset | null {
  return (
    PRESETS.find((p) => SCORE_KEYS.every((k) => Math.round(p.weights[k]) === Math.round(weights[k]))) ??
    null
  );
}
