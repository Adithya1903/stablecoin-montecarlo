import { Suspense } from 'react';
import RegisterTable from '@/components/RegisterTable';
import { getAllResolved, getRegimes } from '@/db/queries';
import { rankable, toRegisterRow } from '@/lib/rows';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  const rows = getAllResolved().filter(rankable).map(toRegisterRow);
  const regimes = getRegimes().map((r) => ({ id: r.id, name: r.name }));

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-mono text-lg font-bold uppercase tracking-[0.15em]">
          Register of jurisdictions
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">
          {rows.length} jurisdictions — every UN member, two observers, and the territories that run
          their own financial law. Sub-perimeters (e.g. the five UAE regulators) live on their
          parent&rsquo;s page. A row with a link is not a row anyone has checked: verification state
          is shown separately, on purpose.
        </p>
      </div>
      <Suspense>
        <RegisterTable rows={rows} regimes={regimes} />
      </Suspense>
    </div>
  );
}
