export type Region =
  | 'Europe'
  | 'Middle East'
  | 'Asia-Pacific'
  | 'Americas'
  | 'Africa';

export type Activity = 'High' | 'Moderate' | 'Low' | 'Minimal';

export type Status =
  | 'Comprehensive'
  | 'Partial'
  | 'Drafting'
  | 'Prohibition'
  | 'None';

export type Confidence = 'High' | 'Medium' | 'Low';

/**
 * 'sub-perimeter' extends the brief's sovereign|territory pair: the five UAE
 * regulators are neither sovereigns nor territories — they are stacked licence
 * perimeters inside one flag, and pretending they are territories would break
 * the "one row per flag" register count.
 */
export type Kind = 'sovereign' | 'territory' | 'sub-perimeter';

export type ScoreKey =
  | 'clarity'
  | 'licensing'
  | 'stablecoin'
  | 'banking'
  | 'tax'
  | 'stability';

export type Scores = Record<ScoreKey, number>;
export type Weights = Record<ScoreKey, number>;

/**
 * Sourced and verified are different columns, on purpose.
 * A URL someone found is not a URL someone checked: `verifiedBy: null`
 * means nobody has, no matter how plausible the link looks.
 */
export type Sourcing = {
  regulatorSite: string | null;
  instrumentUrl: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null; // 'YYYY-MM-DD'
  confidence: Confidence;
};

export type Regime = {
  id: string;
  name: string;
  leadBody: string;
  rationale: string;
  hubUrl: string | null;
  /** Regime-level instrument cascades to every member unless overridden. */
  instrument: string | null;
  instrumentUrl: string | null;
};

export type Jurisdiction = {
  iso3: string;
  name: string;
  region: Region;
  kind: Kind;
  regimeId: string;
  parentIso3: string | null;
  activity: Activity;
  status: Status;
  authority: string;
  /** null = inherit from regime (the cascade); non-null = per-row override */
  instrument: string | null;
  notes: string;
  scores: Scores;
  sourcing: Sourcing;
  lastReviewed: string; // 'YYYY-MM'
};

/** A jurisdiction with regime fields cascaded in — what every surface renders. */
export type ResolvedJurisdiction = Jurisdiction & {
  regime: Regime;
  effectiveInstrument: string | null;
  effectiveInstrumentUrl: string | null;
  /** true when the instrument came from the regime, not a per-row override */
  instrumentInherited: boolean;
};

export const SCORE_KEYS: ScoreKey[] = [
  'clarity',
  'licensing',
  'stablecoin',
  'banking',
  'tax',
  'stability',
];

export const REGIONS: Region[] = [
  'Europe',
  'Middle East',
  'Asia-Pacific',
  'Americas',
  'Africa',
];

export const STATUSES: Status[] = [
  'Comprehensive',
  'Partial',
  'Drafting',
  'Prohibition',
  'None',
];

export const ACTIVITIES: Activity[] = ['High', 'Moderate', 'Low', 'Minimal'];
