import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { jurisdictions, regimes } from '../src/db/schema';
import {
  getRegimeMembers,
  getResolvedByIso3,
  updateRegimeInstrument,
} from '../src/db/queries';
import { SEED_REGIMES } from '../data/regimes';
import { SEED_JURISDICTIONS } from '../data/jurisdictions';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const migration = fs.readFileSync(path.join(__dirname, '..', 'drizzle', '0000_init.sql'), 'utf8');
  for (const stmt of migration.split('--> statement-breakpoint')) sqlite.exec(stmt);
  const db = drizzle(sqlite);
  db.insert(regimes).values(SEED_REGIMES).run();
  for (const j of SEED_JURISDICTIONS) {
    db.insert(jurisdictions)
      .values({
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
        scoreClarity: j.scores.clarity,
        scoreLicensing: j.scores.licensing,
        scoreStablecoin: j.scores.stablecoin,
        scoreBanking: j.scores.banking,
        scoreTax: j.scores.tax,
        scoreStability: j.scores.stability,
        regulatorSite: j.sourcing.regulatorSite,
        instrumentUrl: j.sourcing.instrumentUrl,
        verifiedBy: j.sourcing.verifiedBy,
        verifiedAt: j.sourcing.verifiedAt,
        confidence: j.sourcing.confidence,
        lastReviewed: j.lastReviewed,
      })
      .run();
  }
  return db;
}

describe('regime cascade', () => {
  let db: BetterSQLite3Database;
  beforeEach(() => {
    db = freshDb();
  });

  it('MiCA has exactly 30 members', () => {
    expect(getRegimeMembers('mica', db)).toHaveLength(30);
  });

  it('members inherit the regime instrument when they have no override', () => {
    const de = getResolvedByIso3('DEU', db)!;
    expect(de.instrument).toBeNull();
    expect(de.effectiveInstrument).toContain('MiCA');
    expect(de.effectiveInstrumentUrl).toBe('https://eur-lex.europa.eu/eli/reg/2023/1114/oj');
    expect(de.instrumentInherited).toBe(true);
  });

  it('editing the regime once changes the effective instrument of all 30 members', () => {
    const amended = 'Regulation (EU) 2023/1114 as amended by MiCA II';
    const amendedUrl = 'https://example.invalid/mica-ii';
    updateRegimeInstrument('mica', { instrument: amended, instrumentUrl: amendedUrl }, db);

    const members = getRegimeMembers('mica', db);
    expect(members).toHaveLength(30);
    for (const m of members) {
      expect(m.effectiveInstrument).toBe(amended);
      expect(m.effectiveInstrumentUrl).toBe(amendedUrl);
    }
  });

  it('a per-jurisdiction override beats the regime value and survives regime edits', () => {
    db.update(jurisdictions)
      .set({ instrument: 'MiCA + national gold-plating act' })
      .where(eq(jurisdictions.iso3, 'FRA'))
      .run();
    updateRegimeInstrument('mica', { instrument: 'MiCA as amended' }, db);

    const fr = getResolvedByIso3('FRA', db)!;
    expect(fr.effectiveInstrument).toBe('MiCA + national gold-plating act');
    expect(fr.instrumentInherited).toBe(false);

    const de = getResolvedByIso3('DEU', db)!;
    expect(de.effectiveInstrument).toBe('MiCA as amended');
  });

  it('jurisdictions with their own instrument are untouched by other regimes', () => {
    updateRegimeInstrument('mica', { instrument: 'changed' }, db);
    const uk = getResolvedByIso3('GBR', db)!;
    expect(uk.effectiveInstrument).toContain('Financial Services and Markets Act 2023');
  });

  it('UAE perimeters stack under ARE and share the uae regime', () => {
    const perimeters = SEED_JURISDICTIONS.filter((j) => j.parentIso3 === 'ARE');
    expect(perimeters).toHaveLength(5);
    for (const p of perimeters) {
      const row = getResolvedByIso3(p.iso3, db)!;
      expect(row.kind).toBe('sub-perimeter');
      expect(row.regimeId).toBe('uae');
    }
  });

  it('verified is all-or-nothing at the database level', () => {
    expect(() =>
      db
        .update(jurisdictions)
        .set({ verifiedAt: '2026-08-01' }) // date without a name
        .where(eq(jurisdictions.iso3, 'CHE'))
        .run(),
    ).toThrow();
  });
});
