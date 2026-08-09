import { Suspense } from 'react';
import Link from 'next/link';
import Leaderboard from '@/components/Leaderboard';
import { getAllResolved } from '@/db/queries';
import { rankable, toRegisterRow } from '@/lib/rows';

export const dynamic = 'force-dynamic';

export default function LeaderboardPage() {
  const rows = getAllResolved().filter(rankable).map(toRegisterRow);

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-mono text-lg font-bold uppercase tracking-[0.15em]">Leaderboard</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">
          Composite index = Σ(score × weight) / Σ(weights), over six editorial dimensions. Different
          businesses want different rankings — retune the weights or pick a preset, then share the
          URL. Numbers are judgement calls, not measurements:{' '}
          <Link href="/methodology" className="underline underline-offset-4">
            read the rubric
          </Link>{' '}
          before trusting a two-point gap.
        </p>
      </div>
      <Suspense>
        <Leaderboard rows={rows} />
      </Suspense>
    </div>
  );
}
