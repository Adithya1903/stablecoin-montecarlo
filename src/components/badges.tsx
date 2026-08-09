import Link from 'next/link';
import type { Confidence, Status } from '@/lib/types';
import { CONFIDENCE_GLYPH, STATUS_COLOR, STATUS_GLYPH, isStale } from '@/lib/format';

export function StatusStamp({ status, big = false }: { status: Status; big?: boolean }) {
  return (
    <span
      className={`stamp ${STATUS_COLOR[status]} ${big ? 'rotate-[-2deg] px-3 py-1 text-sm' : ''}`}
    >
      <span aria-hidden="true">{STATUS_GLYPH[status]}</span>
      {status}
    </span>
  );
}

export type SourcingState = 'verified' | 'sourced' | 'unsourced';

export function sourcingState(s: {
  verifiedBy: string | null;
  instrumentUrl: string | null;
  regulatorSite: string | null;
}): SourcingState {
  if (s.verifiedBy) return 'verified';
  if (s.instrumentUrl || s.regulatorSite) return 'sourced';
  return 'unsourced';
}

/**
 * The three sourcing states must read differently at a glance:
 * a found link is not a checked link, and no link at all is a third thing.
 */
export function SourcingBadge({ state }: { state: SourcingState }) {
  if (state === 'verified') {
    return <span className="stamp border-stamp-green text-stamp-green">✓ Verified</span>;
  }
  if (state === 'sourced') {
    return (
      <span className="stamp border-stamp-amber border-dashed text-stamp-amber">
        ◌ Sourced · unchecked
      </span>
    );
  }
  return <span className="stamp border-stamp-grey border-dotted text-stamp-grey">∅ No source</span>;
}

export function ConfidenceMark({ confidence }: { confidence: Confidence }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-widest text-ink-2">
      <span aria-hidden="true">{CONFIDENCE_GLYPH[confidence]}</span> {confidence} confidence
    </span>
  );
}

export function FreshnessTag({ lastReviewed }: { lastReviewed: string }) {
  const stale = isStale(lastReviewed);
  return (
    <span
      className={`font-mono text-[11px] uppercase tracking-widest ${
        stale ? 'font-bold text-stamp-amber' : 'text-ink-3'
      }`}
    >
      Rev {lastReviewed}
      {stale ? ' · STALE' : ''}
    </span>
  );
}

export function ScoreLink({ value, label }: { value: number; label: string }) {
  return (
    <Link
      href="/methodology"
      className="group flex items-baseline justify-between gap-2 border-b border-rule py-1 no-underline"
      title={`${label}: ${value}/100 — editorial score, see methodology`}
    >
      <span className="field-label group-hover:text-ink">{label}</span>
      <span className="font-mono text-sm font-bold tabular-nums">{value}</span>
    </Link>
  );
}
