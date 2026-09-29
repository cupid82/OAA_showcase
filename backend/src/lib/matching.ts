/**
 * How well does an opportunity fit a student — and why?
 *
 * Every recommendation in OAA has to be able to explain itself ("suggested
 * because you have React and chose Full-stack developer"), so this returns the
 * facts behind the number, not just the number. The service turns those facts
 * into sentences with real skill names.
 *
 * The score is a guide for ordering a list, never a verdict on the student. It is
 * not shown as a grade and never feeds the leaderboard.
 *
 * Pure: student and listing in, a match out.
 */
import type { Interest } from '../data/types.js';
import type { ProofStage } from './skillProof.js';

/** How much a skill counts towards a requirement, by how well it is evidenced. */
export const STAGE_WEIGHT: Record<ProofStage, number> = {
  proven: 1,
  practising: 0.75,
  claimed: 0.5,
};

/** The four parts of the score. They sum to 100. */
export const MATCH_WEIGHTS = { skills: 60, track: 20, interest: 10, nice: 10 } as const;

/** Below this, a listing is not recommended — it is still in the full list. */
export const RECOMMEND_THRESHOLD = 55;

export interface MatchStudent {
  year: number;
  trackId: string | null;
  interests: readonly Interest[];
  /** Every skill the student lists, with how well it is evidenced. */
  skills: ReadonlyMap<string, ProofStage>;
}

export interface MatchListing {
  skillIds: readonly string[];
  niceSkillIds?: readonly string[];
  eligibleYears: readonly number[];
  trackIds: readonly string[];
  interest: Interest;
}

export interface MatchResult {
  /** 0–100. */
  score: number;
  /** Open to the student's year. A listing they cannot apply to is never recommended. */
  eligible: boolean;
  /** Required skills the student lists, strongest evidence first. */
  have: string[];
  /** Required skills they don't list — the skill gap. */
  missing: string[];
  niceHave: string[];
  trackFit: boolean;
  interestFit: boolean;
}

export function matchListing(student: MatchStudent, listing: MatchListing): MatchResult {
  const have = listing.skillIds.filter((id) => student.skills.has(id));
  const missing = listing.skillIds.filter((id) => !student.skills.has(id));
  const nice = listing.niceSkillIds ?? [];
  const niceHave = nice.filter((id) => student.skills.has(id));

  // A listing that names no skills is neither a good nor a bad fit on skills —
  // it scores the midpoint rather than a free 100% or a punishing 0%.
  const coverage =
    listing.skillIds.length === 0
      ? 0.5
      : listing.skillIds.reduce((sum, id) => {
          const stage = student.skills.get(id);
          return sum + (stage ? STAGE_WEIGHT[stage] : 0);
        }, 0) / listing.skillIds.length;

  const trackFit = student.trackId !== null && listing.trackIds.includes(student.trackId);
  const interestFit = student.interests.includes(listing.interest);
  const niceShare = nice.length === 0 ? 0 : niceHave.length / nice.length;

  const score = Math.round(
    coverage * MATCH_WEIGHTS.skills +
      (trackFit ? MATCH_WEIGHTS.track : 0) +
      (interestFit ? MATCH_WEIGHTS.interest : 0) +
      niceShare * MATCH_WEIGHTS.nice,
  );

  const strength = (id: string) => STAGE_WEIGHT[student.skills.get(id) ?? 'claimed'];

  return {
    score: Math.min(100, Math.max(0, score)),
    eligible: listing.eligibleYears.length === 0 || listing.eligibleYears.includes(student.year),
    have: [...have].sort((a, b) => strength(b) - strength(a)),
    missing,
    niceHave,
    trackFit,
    interestFit,
  };
}

/** Recommended = open to them and a genuine fit. Dismissals are the caller's filter. */
export function isRecommended(match: Pick<MatchResult, 'score' | 'eligible'>): boolean {
  return match.eligible && match.score >= RECOMMEND_THRESHOLD;
}
