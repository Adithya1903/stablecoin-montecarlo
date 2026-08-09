import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ConfidenceMark,
  FreshnessTag,
  ScoreLink,
  SourcingBadge,
  StatusStamp,
  sourcingState,
} from '@/components/badges';
import { getChildren, getRegimeMembers, getResolvedByIso3 } from '@/db/queries';
import { mrzLine } from '@/lib/format';
import { SCORE_KEYS } from '@/lib/types';
import type { ResolvedJurisdiction } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SCORE_LABELS: Record<(typeof SCORE_KEYS)[number], string> = {
  clarity: 'Clarity',
  licensing: 'Licensing',
  stablecoin: 'Stablecoin',
  banking: 'Banking',
  tax: 'Tax',
  stability: 'Stability',
};

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className="break-all font-mono text-xs underline underline-offset-4 hover:text-accent"
    >
      {label} ↗
    </a>
  );
}

function SourcingPanel({ j }: { j: ResolvedJurisdiction }) {
  const state = sourcingState({
    verifiedBy: j.sourcing.verifiedBy,
    instrumentUrl: j.effectiveInstrumentUrl,
    regulatorSite: j.sourcing.regulatorSite,
  });
  return (
    <section aria-labelledby="sourcing-h" className="border-2 border-ink">
      <h2 id="sourcing-h" className="field-label border-b-2 border-ink bg-paper-2 px-3 py-2 !text-ink">
        Sourcing &amp; verification
      </h2>
      <div className="space-y-3 px-3 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <SourcingBadge state={state} />
          <ConfidenceMark confidence={j.sourcing.confidence} />
        </div>
        <div>
          <span className="field-label">Regulator site (orientation only)</span>
          {j.sourcing.regulatorSite ? (
            <ExternalLink href={j.sourcing.regulatorSite} label={j.sourcing.regulatorSite} />
          ) : (
            <span className="font-mono text-xs text-ink-3">— none recorded</span>
          )}
        </div>
        <div>
          <span className="field-label">Instrument link</span>
          {j.effectiveInstrumentUrl ? (
            <>
              <ExternalLink href={j.effectiveInstrumentUrl} label={j.effectiveInstrumentUrl} />
              {j.instrument === null && j.regime.instrumentUrl === j.effectiveInstrumentUrl && (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-ink-3">
                  inherited from regime
                </span>
              )}
            </>
          ) : (
            <span className="font-mono text-xs text-ink-3">
              — none. {j.status === 'None' ? 'Absence of regulation cannot be cited to a source.' : 'A first-party link has not been recorded; do not invent one.'}
            </span>
          )}
        </div>
        <div className="perf-rule pt-3">
          <span className="field-label">Human verification</span>
          {j.sourcing.verifiedBy ? (
            <p className="text-sm">
              Checked by <strong>{j.sourcing.verifiedBy}</strong> on {j.sourcing.verifiedAt}.
            </p>
          ) : (
            <p className="font-mono text-xs uppercase tracking-widest text-stamp-amber">
              Unverified — no human has checked this row&rsquo;s links or claims.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default async function DetailPage({ params }: { params: Promise<{ iso3: string }> }) {
  const { iso3 } = await params;
  const j = getResolvedByIso3(decodeURIComponent(iso3));
  if (!j) notFound();

  const children = getChildren(j.iso3);
  const parent = j.parentIso3 ? getResolvedByIso3(j.parentIso3) : null;
  const regimeSize = getRegimeMembers(j.regimeId).length;

  return (
    <article>
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <Link href="/" className="font-mono text-xs uppercase tracking-widest text-ink-2 underline underline-offset-4">
          ← Register
        </Link>
        <FreshnessTag lastReviewed={j.lastReviewed} />
      </div>

      <header className="mb-4 border-2 border-ink">
        <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
          <div>
            <p className="field-label">
              {j.kind === 'sub-perimeter' ? 'Regulatory perimeter' : j.kind} · {j.region}
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              <span className="mr-3 font-mono text-lg text-ink-3">{j.iso3}</span>
              {j.name}
            </h1>
            {parent && (
              <p className="mt-1 text-sm text-ink-2">
                Within{' '}
                <Link href={`/j/${parent.iso3}`} className="underline underline-offset-4">
                  {parent.name}
                </Link>
                {j.kind === 'sub-perimeter' &&
                  ' — licences stack; this perimeter does not substitute for the others.'}
              </p>
            )}
          </div>
          <StatusStamp status={j.status} big />
        </div>
        <p className="mrz" aria-hidden="true">
          {mrzLine(['CRT', j.iso3, j.name])}
          {'\n'}
          {mrzLine([j.status, 'REG', j.regimeId, 'REV', j.lastReviewed, j.sourcing.verifiedBy ? 'VERIFIED' : 'UNVERIFIED'])}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <section aria-labelledby="facts-h" className="border-2 border-ink">
            <h2 id="facts-h" className="field-label border-b-2 border-ink bg-paper-2 px-3 py-2 !text-ink">
              What governs here
            </h2>
            <dl className="grid gap-x-6 gap-y-3 px-3 py-3 sm:grid-cols-2">
              <div>
                <dt className="field-label">Authority</dt>
                <dd className="text-sm font-semibold">{j.authority}</dd>
              </div>
              <div>
                <dt className="field-label">Market activity</dt>
                <dd className="font-mono text-sm uppercase tracking-wider">{j.activity}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="field-label">
                  Instrument{j.instrumentInherited ? ' · inherited from regime' : ''}
                </dt>
                <dd className="text-sm">
                  {j.effectiveInstrument ?? (
                    <span className="text-ink-3">
                      No instrument identified — this is a claim about absence and is inherently hard
                      to source.
                    </span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="field-label">What actually matters</dt>
                <dd className="text-sm leading-relaxed">{j.notes}</dd>
              </div>
            </dl>
          </section>

          {children.length > 0 && (
            <section aria-labelledby="perimeters-h" className="border-2 border-ink">
              <h2 id="perimeters-h" className="field-label border-b-2 border-ink bg-paper-2 px-3 py-2 !text-ink">
                Sub-perimeters — licences stack, they do not substitute
              </h2>
              <ul className="divide-y divide-rule">
                {children.map((c) => (
                  <li key={c.iso3} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div>
                      <Link href={`/j/${c.iso3}`} className="font-semibold underline-offset-4 hover:underline">
                        {c.name}
                      </Link>
                      <div className="text-xs text-ink-2">{c.authority}</div>
                    </div>
                    <StatusStamp status={c.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <SourcingPanel j={j} />
        </div>

        <div className="space-y-4">
          <section aria-labelledby="scores-h" className="border-2 border-ink">
            <h2 id="scores-h" className="field-label border-b-2 border-ink bg-paper-2 px-3 py-2 !text-ink">
              Editorial scores · 0–100
            </h2>
            <div className="px-3 py-2">
              {SCORE_KEYS.map((k) => (
                <ScoreLink key={k} value={j.scores[k]} label={SCORE_LABELS[k]} />
              ))}
              <p className="pt-2 font-mono text-[10px] uppercase tracking-widest text-ink-3">
                Judgement calls, not measurements —{' '}
                <Link href="/methodology" className="underline underline-offset-4">
                  what these numbers mean
                </Link>
              </p>
            </div>
          </section>

          <section aria-labelledby="regime-h" className="border-2 border-ink">
            <h2 id="regime-h" className="field-label border-b-2 border-ink bg-paper-2 px-3 py-2 !text-ink">
              Regime
            </h2>
            <div className="space-y-2 px-3 py-3 text-sm">
              <p className="font-semibold">{j.regime.name}</p>
              <p className="text-xs text-ink-2">Lead: {j.regime.leadBody}</p>
              <p className="text-xs leading-relaxed text-ink-2">{j.regime.rationale}</p>
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
                {regimeSize} member{regimeSize === 1 ? '' : 's'} ·{' '}
                <Link href={`/?regime=${j.regimeId}`} className="underline underline-offset-4">
                  view all
                </Link>
              </p>
              {j.regime.hubUrl && <ExternalLink href={j.regime.hubUrl} label={j.regime.hubUrl} />}
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
