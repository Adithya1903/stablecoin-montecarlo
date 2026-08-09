import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Regimes are first-class. A jurisdiction points at a regime; instrument
 * fields on the regime cascade to every member at read time, so amending
 * MiCA is one UPDATE, not thirty.
 */
export const regimes = sqliteTable('regimes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  leadBody: text('lead_body').notNull(),
  rationale: text('rationale').notNull(),
  hubUrl: text('hub_url'),
  instrument: text('instrument'),
  instrumentUrl: text('instrument_url'),
});

export const jurisdictions = sqliteTable('jurisdictions', {
  iso3: text('iso3').primaryKey(),
  name: text('name').notNull(),
  region: text('region', {
    enum: ['Europe', 'Middle East', 'Asia-Pacific', 'Americas', 'Africa'],
  }).notNull(),
  kind: text('kind', { enum: ['sovereign', 'territory', 'sub-perimeter'] }).notNull(),
  regimeId: text('regime_id')
    .notNull()
    .references(() => regimes.id),
  parentIso3: text('parent_iso3'),
  activity: text('activity', { enum: ['High', 'Moderate', 'Low', 'Minimal'] }).notNull(),
  status: text('status', {
    enum: ['Comprehensive', 'Partial', 'Drafting', 'Prohibition', 'None'],
  }).notNull(),
  authority: text('authority').notNull(),
  // null = inherit instrument from the regime (the cascade)
  instrument: text('instrument'),
  notes: text('notes').notNull(),

  scoreClarity: integer('score_clarity').notNull(),
  scoreLicensing: integer('score_licensing').notNull(),
  scoreStablecoin: integer('score_stablecoin').notNull(),
  scoreBanking: integer('score_banking').notNull(),
  scoreTax: integer('score_tax').notNull(),
  scoreStability: integer('score_stability').notNull(),

  // sourced and verified are different columns — deliberately
  regulatorSite: text('regulator_site'),
  instrumentUrl: text('instrument_url'), // per-row override of the regime's
  verifiedBy: text('verified_by'),
  verifiedAt: text('verified_at'),
  confidence: text('confidence', { enum: ['High', 'Medium', 'Low'] }).notNull(),

  lastReviewed: text('last_reviewed').notNull(),
});

export type RegimeRow = typeof regimes.$inferSelect;
export type JurisdictionRow = typeof jurisdictions.$inferSelect;
