/**
 * Runs the pure matcher (`lib/matching.ts`) against real rows, and turns its
 * facts into the sentences a student reads: *why* this, not just a number.
 */
import { getDb } from '../data/store.js';
import type { EventRow, JobRow } from '../data/types.js';
import { matchListing } from '../lib/matching.js';
import type { MatchResult, MatchStudent } from '../lib/matching.js';
import { skillStages } from './evidence.js';
import {
  EVENT_INTEREST,
  JOB_INTEREST,
  findStudent,
  listNames,
  skillIndex,
  skillRefs,
  today,
} from './shared.js';
import type { SkillRef } from './shared.js';

export function matchStudentOf(studentId: string): MatchStudent {
  const student = findStudent(studentId);
  return {
    year: student.year,
    trackId: student.trackId,
    interests: student.interests,
    skills: skillStages(getDb(), studentId, today()),
  };
}

export interface MatchView {
  score: number;
  eligible: boolean;
  have: SkillRef[];
  missing: SkillRef[];
  niceHave: SkillRef[];
  /** Plain-language reasons, strongest first. */
  reasons: string[];
}

export function describeMatch(match: MatchResult, total: number): MatchView {
  const index = skillIndex();
  const have = skillRefs(match.have, index);
  const missing = skillRefs(match.missing, index);
  const niceHave = skillRefs(match.niceHave, index);
  const reasons: string[] = [];

  if (have.length > 0) {
    reasons.push(
      have.length === total
        ? `You list ${listNames(have.map((skill) => skill.name))} — every skill it asks for.`
        : `You list ${listNames(have.map((skill) => skill.name))} — ${have.length} of the ${total} skills it asks for.`,
    );
  }

  if (match.trackFit) reasons.push('It fits the goal you chose.');
  if (match.interestFit) reasons.push('It is the kind of opportunity you said you want.');
  if (niceHave.length > 0) {
    reasons.push(`Bonus: you also have ${listNames(niceHave.map((skill) => skill.name))}.`);
  }
  if (!match.eligible) reasons.unshift('Not open to your year.');

  return { score: match.score, eligible: match.eligible, have, missing, niceHave, reasons };
}

export function matchEvent(student: MatchStudent, event: EventRow): MatchView {
  const result = matchListing(student, {
    skillIds: event.skillIds,
    eligibleYears: event.eligibleYears,
    trackIds: event.trackIds,
    interest: EVENT_INTEREST[event.type],
  });
  return describeMatch(result, event.skillIds.length);
}

export function matchJob(student: MatchStudent, job: JobRow): MatchView {
  const result = matchListing(student, {
    skillIds: job.skillIds,
    niceSkillIds: job.niceSkillIds,
    eligibleYears: job.eligibleYears,
    trackIds: job.trackIds,
    interest: JOB_INTEREST[job.kind],
  });
  return describeMatch(result, job.skillIds.length);
}
