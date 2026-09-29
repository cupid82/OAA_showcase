/**
 * How sure are we that a student can actually do something?
 *
 * A student's own level ("intermediate") is a claim, and the product never
 * pretends otherwise. Proof is derived separately, from evidence the student has
 * put into OAA:
 *
 * - **proven** — used in a *shipped* project that tells its story, or backed by a
 *   certificate.
 * - **practising** — used in a project still being built, used at an event the
 *   student attended, or practised for an hour in the last 30 days.
 * - **claimed** — listed, with nothing behind it yet.
 *
 * Pure: evidence in, verdict out. The service gathers the rows.
 */
import { addDays } from './dates.js';

export type ProofStage = 'claimed' | 'practising' | 'proven';

export const PROOF_ORDER: Record<ProofStage, number> = { claimed: 0, practising: 1, proven: 2 };

/** Practice minutes in the last 30 days that count as "practising". */
export const PRACTICE_MINUTES_FOR_PRACTISING = 60;
export const PRACTICE_WINDOW_DAYS = 30;

/** Below this, a problem statement is a title, not a story. */
export const MIN_PROBLEM_LENGTH = 20;

export interface EvidenceProject {
  id: string;
  title: string;
  status: 'idea' | 'building' | 'shipped' | 'paused';
  problem: string;
  skillIds: readonly string[];
  shippedAt: string | null;
}

export interface EvidenceCertificate {
  id: string;
  title: string;
  issuedOn: string;
  skillIds: readonly string[];
}

export interface EvidenceEvent {
  id: string;
  title: string;
  /** ISO date the event took place. */
  date: string;
  /** The skills the student says they used there — not the event's own list. */
  skillIds: readonly string[];
}

export interface EvidencePractice {
  skillId: string;
  date: string;
  minutes: number;
}

export interface SkillEvidence {
  projects: readonly EvidenceProject[];
  certificates: readonly EvidenceCertificate[];
  events: readonly EvidenceEvent[];
  practice: readonly EvidencePractice[];
}

export interface EvidenceRef {
  id: string;
  title: string;
}

export interface SkillProof {
  stage: ProofStage;
  /** When the skill first became proven. Null unless `stage` is `proven`. */
  provenAt: string | null;
  shippedProjects: EvidenceRef[];
  activeProjects: EvidenceRef[];
  certificates: EvidenceRef[];
  events: EvidenceRef[];
  practiceMinutes30d: number;
}

/**
 * A project "tells its story" once it says what problem it solves and which
 * skills it used. Only then does shipping it count as proof — or earn points.
 */
export function isStoryComplete(project: {
  problem: string;
  skillIds: readonly string[];
}): boolean {
  return project.problem.trim().length >= MIN_PROBLEM_LENGTH && project.skillIds.length > 0;
}

const ref = (item: { id: string; title: string }): EvidenceRef => ({
  id: item.id,
  title: item.title,
});

export function proofFor(skillId: string, evidence: SkillEvidence, today: string): SkillProof {
  const using = <T extends { skillIds: readonly string[] }>(list: readonly T[]) =>
    list.filter((item) => item.skillIds.includes(skillId));

  const projects = using(evidence.projects);
  const shipped = projects.filter(
    (project) => project.status === 'shipped' && isStoryComplete(project),
  );
  const active = projects.filter((project) => project.status === 'building');
  const certificates = using(evidence.certificates);
  const events = using(evidence.events);

  const since = addDays(today, -PRACTICE_WINDOW_DAYS);
  const practiceMinutes30d = evidence.practice
    .filter((entry) => entry.skillId === skillId && entry.date > since && entry.date <= today)
    .reduce((sum, entry) => sum + entry.minutes, 0);

  const proofDates = [
    ...shipped.map((project) => project.shippedAt).filter((at): at is string => at !== null),
    ...certificates.map((certificate) => certificate.issuedOn),
  ].sort();

  const proven = shipped.length > 0 || certificates.length > 0;
  const practising =
    active.length > 0 || events.length > 0 || practiceMinutes30d >= PRACTICE_MINUTES_FOR_PRACTISING;

  return {
    stage: proven ? 'proven' : practising ? 'practising' : 'claimed',
    // A shipped project without a date still proves the skill; it just can't
    // say since when, so the ledger falls back to the caller's own timestamp.
    provenAt: proven ? (proofDates[0] ?? null) : null,
    shippedProjects: shipped.map(ref),
    activeProjects: active.map(ref),
    certificates: certificates.map(ref),
    events: events.map(ref),
    practiceMinutes30d,
  };
}
