/**
 * Seed the local SQLite database from the committed dataset.
 *
 * The original brief seeds from a spreadsheet with sheets `Sovereign states`,
 * `Territories`, `UAE perimeters`, `Regimes`. That file was not available in
 * this environment, so the same shape lives in data/*.ts; to swap the source
 * back to xlsx, replace the two imports below with a sheet reader that
 * produces the same arrays — nothing downstream changes.
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { SEED_REGIMES } from '../data/regimes';
import { SEED_JURISDICTIONS } from '../data/jurisdictions';
import { SCORE_KEYS, type Jurisdiction } from '../src/lib/types';

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'app.db');
const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle');

function validate(rows: Jurisdiction[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const regimeIds = new Set(SEED_REGIMES.map((r) => r.id));
  const iso3s = new Set(rows.map((r) => r.iso3));

  for (const j of rows) {
    if (seen.has(j.iso3)) errors.push(`duplicate iso3 ${j.iso3}`);
    seen.add(j.iso3);
    if (!regimeIds.has(j.regimeId)) errors.push(`${j.iso3}: unknown regime ${j.regimeId}`);
    if (j.parentIso3 && !iso3s.has(j.parentIso3)) errors.push(`${j.iso3}: unknown parent ${j.parentIso3}`);
    if (j.kind === 'sub-perimeter' && !j.parentIso3) errors.push(`${j.iso3}: sub-perimeter without parent`);
    for (const k of SCORE_KEYS) {
      const v = j.scores[k];
      if (!Number.isInteger(v) || v < 0 || v > 100) errors.push(`${j.iso3}: score ${k}=${v} out of range`);
    }
    // sourced ≠ verified: verification must be all-or-nothing…
    if ((j.sourcing.verifiedBy === null) !== (j.sourcing.verifiedAt === null)) {
      errors.push(`${j.iso3}: verifiedBy/verifiedAt must both be set or both be null`);
    }
    // …and a verified claim needs something to have verified.
    if (j.sourcing.verifiedBy && !j.sourcing.instrumentUrl && !j.sourcing.regulatorSite) {
      errors.push(`${j.iso3}: marked verified but has no URL to have verified`);
    }
    // High confidence requires at least a first-party source somewhere.
    if (j.sourcing.confidence === 'High' && !j.sourcing.instrumentUrl && !j.sourcing.regulatorSite) {
      errors.push(`${j.iso3}: High confidence with no source — downgrade it`);
    }
    if (!/^\d{4}-\d{2}$/.test(j.lastReviewed)) errors.push(`${j.iso3}: bad lastReviewed ${j.lastReviewed}`);
  }
  return errors;
}

function main() {
  const errors = validate(SEED_JURISDICTIONS);
  if (errors.length > 0) {
    console.error(`Seed validation failed (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (fs.existsSync(DB_PATH)) fs.rmSync(DB_PATH);
  // Keep the default rollback journal (not WAL): the result is a single .db
  // file that read-only serverless filesystems can open without sidecar files.
  const db = new Database(DB_PATH);

  for (const file of fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    for (const stmt of sql.split('--> statement-breakpoint')) db.exec(stmt);
  }

  const insertRegime = db.prepare(
    `INSERT INTO regimes (id, name, lead_body, rationale, hub_url, instrument, instrument_url)
     VALUES (@id, @name, @leadBody, @rationale, @hubUrl, @instrument, @instrumentUrl)`,
  );
  const insertJurisdiction = db.prepare(
    `INSERT INTO jurisdictions (
       iso3, name, region, kind, regime_id, parent_iso3, activity, status, authority,
       instrument, notes,
       score_clarity, score_licensing, score_stablecoin, score_banking, score_tax, score_stability,
       regulator_site, instrument_url, verified_by, verified_at, confidence, last_reviewed
     ) VALUES (
       @iso3, @name, @region, @kind, @regimeId, @parentIso3, @activity, @status, @authority,
       @instrument, @notes,
       @clarity, @licensing, @stablecoin, @banking, @tax, @stability,
       @regulatorSite, @instrumentUrl, @verifiedBy, @verifiedAt, @confidence, @lastReviewed
     )`,
  );

  const seedAll = db.transaction(() => {
    for (const r of SEED_REGIMES) insertRegime.run(r);
    for (const j of SEED_JURISDICTIONS) {
      insertJurisdiction.run({
        iso3: j.iso3,
        name: j.name,
        region: j.region,
        kind: j.kind,
        regimeId: j.regimeId,
        parentIso3: j.parentIso3,
        activity: j.activity,
        status: j.status,
        authority: j.authority,
        instrument: j.instrument,
        notes: j.notes,
        ...j.scores,
        regulatorSite: j.sourcing.regulatorSite,
        instrumentUrl: j.sourcing.instrumentUrl,
        verifiedBy: j.sourcing.verifiedBy,
        verifiedAt: j.sourcing.verifiedAt,
        confidence: j.sourcing.confidence,
        lastReviewed: j.lastReviewed,
      });
    }
  });
  seedAll();

  const counts = {
    regimes: SEED_REGIMES.length,
    jurisdictions: SEED_JURISDICTIONS.length,
    sovereigns: SEED_JURISDICTIONS.filter((j) => j.kind === 'sovereign').length,
    territories: SEED_JURISDICTIONS.filter((j) => j.kind === 'territory').length,
    subPerimeters: SEED_JURISDICTIONS.filter((j) => j.kind === 'sub-perimeter').length,
    mica: SEED_JURISDICTIONS.filter((j) => j.regimeId === 'mica').length,
    withInstrumentUrl: SEED_JURISDICTIONS.filter((j) => j.sourcing.instrumentUrl).length,
    withRegulatorSite: SEED_JURISDICTIONS.filter((j) => j.sourcing.regulatorSite).length,
    verified: SEED_JURISDICTIONS.filter((j) => j.sourcing.verifiedBy).length,
  };
  console.log(`Seeded ${DB_PATH}`);
  console.table(counts);
  db.close();
}

main();
