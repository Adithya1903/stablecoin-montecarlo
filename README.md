# Global Crypto Regulation Tracker

A country-by-country reference for where a digital-asset business can actually operate.
Three surfaces:

1. **Register** (`/`) — filterable list of every jurisdiction (region, status, activity, regime, search)
2. **Detail** (`/j/[iso3]`) — regulator, instrument, sourced link, sub-perimeters, and what actually matters there
3. **Leaderboard** (`/leaderboard`) — jurisdictions ranked by a weighted composite the user retunes live; the tuning lives in the URL, so a ranking is shareable

Plus `/methodology` — the published rubric behind every score.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAdithya1903%2Fstablecoin-montecarlo%2Ftree%2Fclaude%2Fcrypto-regulation-tracker-o3ijii&project-name=crypto-regulation-tracker&repository-name=crypto-regulation-tracker)

One click: Vercel clones this branch into a new `crypto-regulation-tracker`
repo in your account and deploys it. No environment variables needed — the
SQLite database is built from the committed dataset during `prebuild`
(`npm run seed`) and bundled read-only into the serverless functions
(`outputFileTracingIncludes` in `next.config.mjs`). Alternatively, import the
repo in the Vercel dashboard and set the production branch to
`claude/crypto-regulation-tracker-o3ijii`, or run `npx vercel` locally.

## Stack

Next.js (App Router) + TypeScript + Tailwind. SQLite via Drizzle ORM; the only
SQLite-aware module is `src/db/client.ts`, so swapping to Postgres later means
replacing that file and the dialect imports, not the queries.

```bash
npm install
npm run seed    # builds data/app.db from the committed dataset (also runs pre-dev/build)
npm run dev
npm test        # regime cascade + index math
```

## Data model — the three load-bearing decisions

1. **Regimes are first-class.** A jurisdiction points at a regime (`mica`,
   `waemu`, `cemac`, `eccu`, `us-federal-state`, `uae`, `prc`, `national`).
   Instrument fields on the regime **cascade** to members and are overridable
   per row. Amending MiCA is one write that moves all 30 members —
   `tests/cascade.test.ts` proves it.
2. **Sub-jurisdictions are real.** The UAE is one flag and five regulators
   whose licences **stack** (kind: `sub-perimeter`, `parentIso3: 'ARE'`). They
   render on the parent's detail page and are excluded from rankings to avoid
   double counting.
3. **Sourced and verified are different columns.** `instrumentUrl` is a link
   someone found; `verifiedBy`/`verifiedAt` is a named human who checked it.
   The database enforces that verification is all-or-nothing, and the UI shows
   unsourced / sourced-unchecked / verified as three visibly different states.
   **Currently zero rows are verified.**

## Seeding

`scripts/seed.ts` validates and loads the dataset in `data/regimes.ts` +
`data/jurisdictions.ts` (195 sovereigns, 20 territories, 5 UAE perimeters).
The original brief seeds from a spreadsheet; it was not available when this
repo was built, so the same shape lives in code — to switch back, replace the
two imports in the seed script with a sheet reader producing the same arrays.

Validation enforced at seed time: unique ISO3, known regime, real parent,
scores 0–100, verified-all-or-nothing, no High confidence without a source.

## Rules for humans and agents

- **Never invent a URL.** If you cannot reach a first-party page, leave the
  field null. A plausible fabricated regulator link is worse than an empty
  cell because it looks verified. (Network egress was blocked when the seed
  data was authored, so URLs are limited to domains/permalinks the author was
  certain of — every one of them still needs human verification.)
- Do not upgrade `confidence` without a source.
- Do not let a seed value silently become a fact — uncurated rows carry
  formulaic scores and `Low` confidence, and the UI labels them as such.
- Data is edited by PR. Verifying a row = open the links, confirm the claims,
  set `verifiedBy`/`verifiedAt`, and bump `lastReviewed`.

## Caveats

Scores are editorial judgement calls (see `/methodology`). Status/notes were
authored 2026-08 from the author's knowledge of public reporting, without live
web access; treat every row as unverified until a human has checked it — the
UI will tell you exactly which ones those are (all of them, today).
