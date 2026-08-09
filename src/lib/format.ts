import type { Status, Confidence } from './types';

export const STATUS_GLYPH: Record<Status, string> = {
  Comprehensive: '■',
  Partial: '◧',
  Drafting: '◔',
  Prohibition: '⊘',
  None: '□',
};

export const STATUS_COLOR: Record<Status, string> = {
  Comprehensive: 'text-stamp-green border-stamp-green',
  Partial: 'text-stamp-blue border-stamp-blue',
  Drafting: 'text-stamp-amber border-stamp-amber',
  Prohibition: 'text-stamp-red border-stamp-red',
  None: 'text-stamp-grey border-stamp-grey',
};

export const CONFIDENCE_GLYPH: Record<Confidence, string> = {
  High: '●●●',
  Medium: '●●○',
  Low: '●○○',
};

/** Months elapsed since a 'YYYY-MM' review date; ≥ 9 counts as stale. */
export function monthsSince(yyyyMm: string, now: Date = new Date()): number {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!y || !m) return Infinity;
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
}

export const STALE_AFTER_MONTHS = 9;

export function isStale(yyyyMm: string, now: Date = new Date()): boolean {
  return monthsSince(yyyyMm, now) >= STALE_AFTER_MONTHS;
}

/** MRZ-style line: uppercase, non-alphanumerics collapsed to '<', padded. */
export function mrzLine(parts: string[], width = 56): string {
  const raw = parts
    .map((p) => p.toUpperCase().replace(/[^A-Z0-9]+/g, '<'))
    .join('<<');
  return (raw + '<'.repeat(width)).slice(0, width);
}
