import type { ResolvedJurisdiction, Region, Status, Activity, Confidence, Scores } from './types';
import { sourcingState, type SourcingState } from '@/components/badges';

/** Lean serializable shape passed from server pages to client tables. */
export type RegisterRow = {
  iso3: string;
  name: string;
  region: Region;
  kind: string;
  regimeId: string;
  regimeName: string;
  status: Status;
  activity: Activity;
  authority: string;
  scores: Scores;
  confidence: Confidence;
  sourcing: SourcingState;
  lastReviewed: string;
};

export function toRegisterRow(j: ResolvedJurisdiction): RegisterRow {
  return {
    iso3: j.iso3,
    name: j.name,
    region: j.region,
    kind: j.kind,
    regimeId: j.regimeId,
    regimeName: j.regime.name,
    status: j.status,
    activity: j.activity,
    authority: j.authority,
    scores: j.scores,
    confidence: j.sourcing.confidence,
    sourcing: sourcingState(j.sourcing),
    lastReviewed: j.lastReviewed,
  };
}

/** Register and leaderboard rank flags, not perimeters: sub-perimeters render on the parent's page. */
export function rankable(j: ResolvedJurisdiction): boolean {
  return j.kind !== 'sub-perimeter';
}
