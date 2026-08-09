'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { RegisterRow } from '@/lib/rows';
import { ACTIVITIES, REGIONS, STATUSES } from '@/lib/types';
import { compositeScore, DEFAULT_WEIGHTS } from '@/lib/scoring';
import { ConfidenceMark, FreshnessTag, SourcingBadge, StatusStamp } from './badges';

type Props = {
  rows: RegisterRow[];
  regimes: { id: string; name: string }[];
};

const FILTER_KEYS = ['q', 'region', 'status', 'activity', 'regime'] as const;

export default function RegisterTable({ rows, regimes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const filters = {
    q: params.get('q') ?? '',
    region: params.get('region') ?? '',
    status: params.get('status') ?? '',
    activity: params.get('activity') ?? '',
    regime: params.get('regime') ?? '',
  };

  const setFilter = useCallback(
    (key: (typeof FILTER_KEYS)[number], value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.region && r.region !== filters.region) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.activity && r.activity !== filters.activity) return false;
      if (filters.regime && r.regimeId !== filters.regime) return false;
      if (q && !`${r.name} ${r.iso3} ${r.authority}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filters.q, filters.region, filters.status, filters.activity, filters.regime]);

  const selectCls =
    'border-2 border-rule bg-paper px-2 py-1 font-mono text-xs uppercase tracking-wider text-ink';

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="mb-4 flex flex-wrap items-end gap-3 border-2 border-ink bg-paper-2 p-3"
      >
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label htmlFor="q" className="field-label">
            Search
          </label>
          <input
            id="q"
            type="search"
            placeholder="Name / ISO3 / authority"
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
            className={`${selectCls} normal-case`}
          />
        </div>
        {(
          [
            ['region', 'Region', REGIONS],
            ['status', 'Status', STATUSES],
            ['activity', 'Activity', ACTIVITIES],
          ] as const
        ).map(([key, label, options]) => (
          <div key={key} className="flex flex-col gap-1">
            <label htmlFor={key} className="field-label">
              {label}
            </label>
            <select
              id={key}
              value={filters[key]}
              onChange={(e) => setFilter(key, e.target.value)}
              className={selectCls}
            >
              <option value="">All</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex max-w-full flex-col gap-1">
          <label htmlFor="regime" className="field-label">
            Regime
          </label>
          <select
            id="regime"
            value={filters.regime}
            onChange={(e) => setFilter('regime', e.target.value)}
            className={`${selectCls} max-w-full`}
          >
            <option value="">All</option>
            {regimes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <p className="ml-auto font-mono text-xs uppercase tracking-widest text-ink-2" aria-live="polite">
          {filtered.length}/{rows.length} rows
        </p>
      </form>

      <div className="overflow-x-auto border-2 border-ink">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-ink bg-paper-2">
              {['Jurisdiction', 'Region', 'Status', 'Regime', 'Activity', 'Index*', 'Sourcing', 'Reviewed'].map(
                (h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-2"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.iso3} className="border-b border-rule align-top hover:bg-paper-2">
                <td className="px-3 py-2">
                  <Link
                    href={`/j/${r.iso3}`}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    <span className="mr-2 font-mono text-xs text-ink-3">{r.iso3}</span>
                    {r.name}
                  </Link>
                  {r.kind === 'territory' && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-ink-3">
                      territory
                    </span>
                  )}
                  <div className="mt-0.5 text-xs text-ink-2">{r.authority}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs uppercase tracking-wider text-ink-2">
                  {r.region}
                </td>
                <td className="px-3 py-2">
                  <StatusStamp status={r.status} />
                </td>
                <td className="px-3 py-2 font-mono text-xs text-ink-2">{r.regimeName}</td>
                <td className="px-3 py-2 font-mono text-xs uppercase tracking-wider text-ink-2">
                  {r.activity}
                </td>
                <td className="px-3 py-2 font-mono text-sm font-bold tabular-nums">
                  {Math.round(compositeScore(r.scores, DEFAULT_WEIGHTS))}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <SourcingBadge state={r.sourcing} />
                    <ConfidenceMark confidence={r.confidence} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <FreshnessTag lastReviewed={r.lastReviewed} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center font-mono text-sm text-ink-3">
                  No rows match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-ink-3">
        *Balanced weights — retune on the{' '}
        <Link href="/leaderboard" className="underline underline-offset-4">
          leaderboard
        </Link>
        . Scores are editorial (
        <Link href="/methodology" className="underline underline-offset-4">
          methodology
        </Link>
        ).
      </p>
    </div>
  );
}
