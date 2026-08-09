import { asc, eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { getDb } from './client';
import { jurisdictions, regimes, type JurisdictionRow, type RegimeRow } from './schema';
import type { Regime, ResolvedJurisdiction } from '@/lib/types';

function toRegime(r: RegimeRow): Regime {
  return {
    id: r.id,
    name: r.name,
    leadBody: r.leadBody,
    rationale: r.rationale,
    hubUrl: r.hubUrl,
    instrument: r.instrument,
    instrumentUrl: r.instrumentUrl,
  };
}

/**
 * The cascade, in one place: regime-level instrument fields flow to every
 * member; a non-null value on the jurisdiction row overrides them.
 */
export function resolve(j: JurisdictionRow, r: RegimeRow): ResolvedJurisdiction {
  const effectiveInstrument = j.instrument ?? r.instrument;
  const effectiveInstrumentUrl = j.instrumentUrl ?? r.instrumentUrl;
  return {
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
    scores: {
      clarity: j.scoreClarity,
      licensing: j.scoreLicensing,
      stablecoin: j.scoreStablecoin,
      banking: j.scoreBanking,
      tax: j.scoreTax,
      stability: j.scoreStability,
    },
    sourcing: {
      regulatorSite: j.regulatorSite,
      instrumentUrl: j.instrumentUrl,
      verifiedBy: j.verifiedBy,
      verifiedAt: j.verifiedAt,
      confidence: j.confidence,
    },
    lastReviewed: j.lastReviewed,
    regime: toRegime(r),
    effectiveInstrument,
    effectiveInstrumentUrl,
    instrumentInherited: j.instrument === null && r.instrument !== null,
  };
}

export function getAllResolved(db: BetterSQLite3Database = getDb()): ResolvedJurisdiction[] {
  const rows = db
    .select()
    .from(jurisdictions)
    .innerJoin(regimes, eq(jurisdictions.regimeId, regimes.id))
    .orderBy(asc(jurisdictions.name))
    .all();
  return rows.map((row) => resolve(row.jurisdictions, row.regimes));
}

export function getResolvedByIso3(
  iso3: string,
  db: BetterSQLite3Database = getDb(),
): ResolvedJurisdiction | null {
  const rows = db
    .select()
    .from(jurisdictions)
    .innerJoin(regimes, eq(jurisdictions.regimeId, regimes.id))
    .where(eq(jurisdictions.iso3, iso3.toUpperCase()))
    .all();
  if (rows.length === 0) return null;
  return resolve(rows[0].jurisdictions, rows[0].regimes);
}

export function getChildren(
  parentIso3: string,
  db: BetterSQLite3Database = getDb(),
): ResolvedJurisdiction[] {
  const rows = db
    .select()
    .from(jurisdictions)
    .innerJoin(regimes, eq(jurisdictions.regimeId, regimes.id))
    .where(eq(jurisdictions.parentIso3, parentIso3.toUpperCase()))
    .orderBy(asc(jurisdictions.iso3))
    .all();
  return rows.map((row) => resolve(row.jurisdictions, row.regimes));
}

export function getRegimes(db: BetterSQLite3Database = getDb()): Regime[] {
  return db.select().from(regimes).orderBy(asc(regimes.name)).all().map(toRegime);
}

export function getRegimeMembers(
  regimeId: string,
  db: BetterSQLite3Database = getDb(),
): ResolvedJurisdiction[] {
  const rows = db
    .select()
    .from(jurisdictions)
    .innerJoin(regimes, eq(jurisdictions.regimeId, regimes.id))
    .where(eq(jurisdictions.regimeId, regimeId))
    .orderBy(asc(jurisdictions.name))
    .all();
  return rows.map((row) => resolve(row.jurisdictions, row.regimes));
}

/** One write at the regime level; every member's effective fields move with it. */
export function updateRegimeInstrument(
  regimeId: string,
  fields: { instrument?: string | null; instrumentUrl?: string | null },
  db: BetterSQLite3Database = getDb(),
): void {
  db.update(regimes).set(fields).where(eq(regimes.id, regimeId)).run();
}
