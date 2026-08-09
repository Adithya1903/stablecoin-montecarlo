import Link from 'next/link';
import { PRESETS } from '@/lib/scoring';
import { SCORE_KEYS } from '@/lib/types';

export const metadata = { title: 'Methodology — Crypto Regulation Tracker' };

type Rubric = {
  key: (typeof SCORE_KEYS)[number];
  name: string;
  question: string;
  at40: string;
  at70: string;
};

const RUBRICS: Rubric[] = [
  {
    key: 'clarity',
    name: 'Clarity',
    question: 'Could counsel tell you, in writing, whether your specific activity is lawful and under which rule?',
    at40: 'Partial guidance exists but material activities sit in interpretive grey zones; answers hedge.',
    at70: 'A published framework maps most activities to rules; open questions are edge cases, not the core business.',
  },
  {
    key: 'licensing',
    name: 'Licensing',
    question: 'Is there an authorisation you can actually apply for, with known criteria and a functioning pipeline?',
    at40: 'A registration or partial licence exists but scope is narrow, criteria are opaque, or the queue is effectively frozen.',
    at70: 'A defined licence covers the main activities and firms demonstrably obtain it on a predictable timeline.',
  },
  {
    key: 'stablecoin',
    name: 'Stablecoin',
    question: 'Can a fiat-referenced token be issued or used in payments under explicit rules?',
    at40: 'Stablecoins are tolerated for trading but issuance/payments rules are absent or hostile.',
    at70: 'A bespoke issuance regime exists (reserves, redemption, disclosure) and at least some payment use is sanctioned.',
  },
  {
    key: 'banking',
    name: 'Banking',
    question: 'Will a domestic bank open and keep an operating account for a licensed crypto business?',
    at40: 'Accounts are obtainable through a handful of tolerant banks; relationships are fragile.',
    at70: 'Mainstream banks serve licensed firms as ordinary commercial clients.',
  },
  {
    key: 'tax',
    name: 'Tax',
    question: 'Is the tax treatment of tokens, gains and operations knowable and non-punitive?',
    at40: 'Rules exist but are burdensome or ambiguous in ways that materially distort operations.',
    at70: 'Treatment is published, administrable, and does not by itself drive businesses offshore.',
  },
  {
    key: 'stability',
    name: 'Stability',
    question: 'Will the rules you build on still be the rules in three years?',
    at40: 'The framework shifts with political weather; reversals within a market cycle are plausible.',
    at70: 'Direction of travel is settled across elections; changes arrive by consultation, not decree.',
  },
];

export default function MethodologyPage() {
  return (
    <article className="prose-sm max-w-3xl">
      <h1 className="font-mono text-lg font-bold uppercase tracking-[0.15em]">Methodology</h1>

      <section className="mt-4 space-y-2 text-sm leading-relaxed">
        <h2 className="field-label !text-ink">What these numbers are</h2>
        <p>
          Every score on this site is an <strong>editorial judgement call</strong> on a 0–100 scale,
          made by a human reading public material. They are not measurements, there is no model
          behind them, and a two-point difference is noise. They exist so that jurisdictions can be
          compared on the same axes and so the leaderboard&rsquo;s weighting is explicit rather than
          hidden in prose.
        </p>
        <p>
          Rows that nobody has individually curated carry <em>formulaic defaults</em> derived from
          their status classification (visible as suspiciously round numbers and{' '}
          <span className="font-mono text-xs uppercase">Low confidence</span>). Treat those rows as
          placeholders for research, not findings.
        </p>
      </section>

      <section className="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 className="field-label !text-ink">Sourced ≠ verified</h2>
        <p>
          Each row separates three states: <strong>no source</strong>, <strong>sourced</strong> (a
          first-party URL was recorded), and <strong>verified</strong> (a named human opened the
          link and confirmed it says what the row claims, on a recorded date). At present{' '}
          <strong>zero rows are verified</strong>. A plausible link that nobody has checked is
          displayed as exactly that. Contributors: never invent a URL — an empty field is honest, a
          fabricated regulator link is poison, because it looks verified.
        </p>
        <p>
          Absence of regulation is the hardest thing to source: you can cite a law, you cannot cite
          a non-law. Most <span className="font-mono text-xs uppercase">status: None</span> rows
          will stay at Low confidence forever. That is the honest state of the world, not a defect
          of the dataset.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="field-label !text-ink">The six dimensions — what 40 vs 70 means</h2>
        <div className="mt-2 space-y-4">
          {RUBRICS.map((r) => (
            <div key={r.key} className="border-2 border-rule p-3">
              <h3 className="font-mono text-sm font-bold uppercase tracking-widest">{r.name}</h3>
              <p className="mt-1 text-sm italic text-ink-2">{r.question}</p>
              <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="field-label">≈ 40</dt>
                  <dd className="text-sm">{r.at40}</dd>
                </div>
                <div>
                  <dt className="field-label">≈ 70</dt>
                  <dd className="text-sm">{r.at70}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-2">
          Anchors: 0 means the dimension is affirmatively closed (e.g. licensing under a
          prohibition); 100 is reserved and unused; 90+ means the jurisdiction is the reference
          case for that dimension.
        </p>
      </section>

      <section className="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 className="field-label !text-ink">The composite index</h2>
        <p className="font-mono text-sm">score = Σ(scores[k] × weights[k]) / Σ(weights)</p>
        <p>
          Weights are user-set on the <Link href="/leaderboard" className="underline underline-offset-4">leaderboard</Link>{' '}
          and live in the URL, so a tuned ranking is shareable. Presets:
        </p>
        <ul className="list-inside list-disc space-y-1">
          {PRESETS.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong> — {p.blurb}{' '}
              <span className="font-mono text-xs text-ink-3">
                ({SCORE_KEYS.map((k) => `${k}:${p.weights[k]}`).join(' ')})
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 className="field-label !text-ink">Regimes and perimeters</h2>
        <p>
          Many jurisdictions inherit their law rather than write it: MiCA governs 30 EEA states with
          one instrument, WAEMU and CEMAC members share central banks, the ECCU shares the EC
          dollar. These are modelled as first-class <em>regimes</em>; regime-level instrument fields
          cascade to members and are overridable per jurisdiction, so one amendment is one edit.
          Conversely, some flags contain multiple regulators whose licences <em>stack</em> (the five
          UAE perimeters; US federal + state law): those render as sub-perimeters on the parent
          page and are excluded from rankings to avoid double counting.
        </p>
      </section>

      <section className="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 className="field-label !text-ink">Freshness</h2>
        <p>
          Every row carries <span className="font-mono text-xs uppercase">lastReviewed</span>{' '}
          (year-month). Rows older than nine months are flagged{' '}
          <span className="font-mono text-xs font-bold uppercase text-stamp-amber">stale</span>{' '}
          everywhere they appear. A stale row that looks fresh is worse than an empty one.
        </p>
      </section>
    </article>
  );
}
