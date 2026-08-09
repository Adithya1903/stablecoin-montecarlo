'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { RegisterRow } from '@/lib/rows';
import { SCORE_KEYS, type ScoreKey, type Weights } from '@/lib/types';
import {
  compositeScore,
  DEFAULT_WEIGHTS,
  PRESETS,
  presetMatching,
  weightsFromParam,
  weightsToParam,
} from '@/lib/scoring';
import { ConfidenceMark, FreshnessTag, SourcingBadge, StatusStamp } from './badges';

const WEIGHT_LABELS: Record<ScoreKey, string> = {
  clarity: 'Clarity',
  licensing: 'Licensing',
  stablecoin: 'Stablecoin',
  banking: 'Banking',
  tax: 'Tax',
  stability: 'Stability',
};

export default function Leaderboard({ rows }: { rows: RegisterRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const weights = weightsFromParam(params.get('w')) ?? DEFAULT_WEIGHTS;
  const activePreset = presetMatching(weights);

  const setWeights = useCallback(
    (next: Weights) => {
      const search = new URLSearchParams(params.toString());
      if (presetMatching(next)?.id === 'balanced') search.delete('w');
      else search.set('w', weightsToParam(next));
      router.replace(`${pathname}${search.size ? `?${search}` : ''}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const baselineRanks = useMemo(() => {
    const sorted = [...rows].sort(
      (a, b) => compositeScore(b.scores, DEFAULT_WEIGHTS) - compositeScore(a.scores, DEFAULT_WEIGHTS),
    );
    return new Map(sorted.map((r, i) => [r.iso3, i + 1]));
  }, [rows]);

  const ranked = useMemo(
    () =>
      rows
        .map((r) => ({ row: r, score: compositeScore(r.scores, weights) }))
        .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name)),
    [rows, weights],
  );

  const weightSum = SCORE_KEYS.reduce((s, k) => s + weights[k], 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <section aria-labelledby="weights-h" className="border-2 border-ink">
          <h2 id="weights-h" className="field-label border-b-2 border-ink bg-paper-2 px-3 py-2 !text-ink">
            Weights · live
          </h2>
          <div className="space-y-3 px-3 py-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Weight presets">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setWeights(p.weights)}
                  title={p.blurb}
                  aria-pressed={activePreset?.id === p.id}
                  className={`stamp cursor-pointer ${
                    activePreset?.id === p.id
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-rule text-ink-2 hover:border-ink-2'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {SCORE_KEYS.map((k) => (
              <div key={k}>
                <div className="flex items-baseline justify-between">
                  <label htmlFor={`w-${k}`} className="field-label !text-ink-2">
                    {WEIGHT_LABELS[k]}
                  </label>
                  <output htmlFor={`w-${k}`} className="font-mono text-xs font-bold tabular-nums">
                    {weights[k]}
                  </output>
                </div>
                <input
                  id={`w-${k}`}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={weights[k]}
                  onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
                  className="w-full accent-[rgb(var(--accent))]"
                  aria-label={`${WEIGHT_LABELS[k]} weight`}
                />
              </div>
            ))}
            <p className="perf-rule pt-2 font-mono text-[11px] uppercase tracking-widest text-ink-3">
              Σ weights = {weightSum}
              {weightSum === 0 && ' — all scores collapse to 0'}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
              The URL is the share link — copy it and the tuning travels with it.
            </p>
          </div>
        </section>
      </aside>

      <ol className="space-y-1" aria-label="Ranked jurisdictions">
        {ranked.map(({ row, score }, idx) => {
          const rank = idx + 1;
          const delta = (baselineRanks.get(row.iso3) ?? rank) - rank;
          return (
            <li
              key={row.iso3}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-rule px-2 py-2 hover:bg-paper-2"
            >
              <span className="w-10 text-right font-mono text-sm font-bold tabular-nums text-ink-2">
                {rank}
              </span>
              <span className="w-14 font-mono text-lg font-bold tabular-nums">{Math.round(score)}</span>
              <span
                className="w-12 font-mono text-[11px] tabular-nums"
                title="Rank movement vs balanced weights"
              >
                {delta > 0 && <span className="text-stamp-green">▲{delta}</span>}
                {delta < 0 && <span className="text-stamp-red">▼{-delta}</span>}
                {delta === 0 && <span className="text-ink-3">—</span>}
              </span>
              <span className="min-w-40 flex-1">
                <Link href={`/j/${row.iso3}`} className="font-semibold underline-offset-4 hover:underline">
                  <span className="mr-2 font-mono text-xs text-ink-3">{row.iso3}</span>
                  {row.name}
                </Link>
              </span>
              <span
                className="hidden h-2 w-40 border border-rule sm:block"
                role="img"
                aria-label={`score ${Math.round(score)} of 100`}
              >
                <span
                  className="block h-full bg-ink"
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </span>
              <StatusStamp status={row.status} />
              <span className="hidden md:inline-flex">
                <SourcingBadge state={row.sourcing} />
              </span>
              <span className="hidden lg:inline-flex">
                <ConfidenceMark confidence={row.confidence} />
              </span>
              <FreshnessTag lastReviewed={row.lastReviewed} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
