/**
 * Skills: what the student says they can do, what their work proves, and what
 * their goal still needs.
 *
 * Self-declared level and proof are kept apart on purpose. "Intermediate" is the
 * student's word; "proven by Campus Eats" is evidence. The page shows both and
 * never blends them into one score.
 */
import { getDb, persist } from '../data/store.js';
import type { SkillLevel, TrackStage } from '../data/types.js';
import { addDays, daysBetween, weekStart } from '../lib/dates.js';
import { HttpError } from '../lib/httpError.js';
import { PROOF_ORDER, proofFor } from '../lib/skillProof.js';
import type { EvidenceRef, ProofStage } from '../lib/skillProof.js';
import type { AddSkillInput, CertificateInput, PracticeInput } from '../models/skill.model.js';
import { evidenceOf, skillProofs } from './evidence.js';
import { recomputeMomentum } from './momentum.service.js';
import {
  assertSkillsExist,
  findStudent,
  newId,
  nowISO,
  skillIndex,
  skillRefs,
  today,
} from './shared.js';
import type { SkillRef } from './shared.js';

const STAGE_LABEL: Record<TrackStage, string> = {
  foundation: 'Foundations',
  core: 'Core',
  advanced: 'Going further',
};

const STAGES: TrackStage[] = ['foundation', 'core', 'advanced'];

/** Practice is only loggable up to this many days back. */
const PRACTICE_BACKDATE_DAYS = 60;

export interface ProofView {
  stage: ProofStage;
  provenAt: string | null;
  shippedProjects: EvidenceRef[];
  activeProjects: EvidenceRef[];
  certificates: EvidenceRef[];
  events: EvidenceRef[];
  practiceMinutes30d: number;
}

export interface MySkill {
  id: string;
  name: string;
  category: string;
  level: SkillLevel;
  proof: ProofView;
  inTrack: boolean;
  lastPractisedOn: string | null;
}

export interface TrackSkillView {
  id: string;
  name: string;
  why: string;
  level: SkillLevel | null;
  /** Null when the student doesn't list it. */
  proof: ProofStage | null;
}

export interface SkillsOverview {
  track: {
    id: string;
    name: string;
    summary: string;
    total: number;
    proven: number;
    listed: number;
    stages: { stage: TrackStage; label: string; skills: TrackSkillView[] }[];
  } | null;
  skills: MySkill[];
  suggestions: {
    /** In your projects, certificates or reflections — but not in your list. */
    usedNotListed: SkillRef[];
    /** The next skills your goal asks for that you don't list yet. */
    nextForGoal: { id: string; name: string; why: string; stage: TrackStage }[];
  };
  certificates: {
    id: string;
    title: string;
    issuer: string;
    issuedOn: string;
    url: string | null;
    skills: SkillRef[];
    showOnPortfolio: boolean;
  }[];
  practice: {
    thisWeekMinutes: number;
    /** Minutes a week the student said they want to give, or null. */
    weeklyTarget: number | null;
    weeks: { week: string; minutes: number }[];
    recent: { id: string; skill: SkillRef; date: string; minutes: number; note: string }[];
  };
  counts: Record<ProofStage, number> & { listed: number };
}

export function getSkills(studentId: string): SkillsOverview {
  const db = getDb();
  const student = findStudent(studentId);
  const now = today();
  const index = skillIndex();
  const proofs = skillProofs(db, studentId, now);
  const listedRows = db.studentSkills.filter((row) => row.studentId === studentId);
  const listed = new Map(listedRows.map((row) => [row.skillId, row]));
  const track = student.trackId ? db.tracks.find((row) => row.id === student.trackId) : undefined;
  const trackSkillIds = new Set(track?.skills.map((entry) => entry.skillId) ?? []);
  const practice = db.practiceLogs.filter((row) => row.studentId === studentId);

  const lastPractised = new Map<string, string>();
  for (const log of practice) {
    const current = lastPractised.get(log.skillId);
    if (!current || log.date > current) lastPractised.set(log.skillId, log.date);
  }

  const skills: MySkill[] = listedRows
    .flatMap((row) => {
      const skill = index.get(row.skillId);
      const proof = proofs.get(row.skillId);
      if (!skill || !proof) return [];
      return [
        {
          id: skill.id,
          name: skill.name,
          category: skill.category,
          level: row.level,
          proof,
          inTrack: trackSkillIds.has(skill.id),
          lastPractisedOn: lastPractised.get(skill.id) ?? null,
        },
      ];
    })
    // Proven first, then in progress; alphabetical within a stage.
    .sort(
      (a, b) =>
        PROOF_ORDER[b.proof.stage] - PROOF_ORDER[a.proof.stage] || a.name.localeCompare(b.name),
    );

  const trackView = track
    ? {
        id: track.id,
        name: track.name,
        summary: track.summary,
        total: track.skills.length,
        proven: track.skills.filter((entry) => proofs.get(entry.skillId)?.stage === 'proven')
          .length,
        listed: track.skills.filter((entry) => listed.has(entry.skillId)).length,
        stages: STAGES.map((stage) => ({
          stage,
          label: STAGE_LABEL[stage],
          skills: track.skills
            .filter((entry) => entry.stage === stage)
            .flatMap((entry) => {
              const skill = index.get(entry.skillId);
              if (!skill) return [];
              return [
                {
                  id: skill.id,
                  name: skill.name,
                  why: entry.why,
                  level: listed.get(skill.id)?.level ?? null,
                  proof: proofs.get(skill.id)?.stage ?? null,
                },
              ];
            }),
        })).filter((group) => group.skills.length > 0),
      }
    : null;

  // Skills the student's own work evidences but they never listed.
  const evidence = evidenceOf(db, studentId);
  const used = new Set<string>([
    ...evidence.projects.flatMap((project) => project.skillIds),
    ...evidence.certificates.flatMap((certificate) => certificate.skillIds),
    ...evidence.events.flatMap((event) => event.skillIds),
  ]);
  const usedNotListed = skillRefs(
    [...used].filter((id) => !listed.has(id)),
    index,
  );

  const nextForGoal = (track?.skills ?? [])
    .filter((entry) => !listed.has(entry.skillId))
    .slice(0, 3)
    .flatMap((entry) => {
      const skill = index.get(entry.skillId);
      return skill ? [{ id: skill.id, name: skill.name, why: entry.why, stage: entry.stage }] : [];
    });

  // Eight weeks of practice, oldest first, with empty weeks as zeros — a gap is
  // information, and dropping it would make the chart lie about the rhythm.
  const thisWeek = weekStart(now);
  const weeks = Array.from({ length: 8 }, (_, n) => addDays(thisWeek, -7 * (7 - n)));
  const minutesByWeek = new Map<string, number>();
  for (const log of practice) {
    const week = weekStart(log.date);
    minutesByWeek.set(week, (minutesByWeek.get(week) ?? 0) + log.minutes);
  }

  const counts = { claimed: 0, practising: 0, proven: 0, listed: skills.length };
  for (const skill of skills) counts[skill.proof.stage] += 1;

  return {
    track: trackView,
    skills,
    suggestions: { usedNotListed, nextForGoal },
    certificates: db.certificates
      .filter((row) => row.studentId === studentId)
      .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn))
      .map((row) => ({
        id: row.id,
        title: row.title,
        issuer: row.issuer,
        issuedOn: row.issuedOn,
        url: row.url,
        skills: skillRefs(row.skillIds, index),
        showOnPortfolio: row.showOnPortfolio,
      })),
    practice: {
      thisWeekMinutes: minutesByWeek.get(thisWeek) ?? 0,
      weeklyTarget: student.weeklyHours === null ? null : student.weeklyHours * 60,
      weeks: weeks.map((week) => ({ week, minutes: minutesByWeek.get(week) ?? 0 })),
      recent: [...practice]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8)
        .flatMap((row) => {
          const [skill] = skillRefs([row.skillId], index);
          return skill
            ? [{ id: row.id, skill, date: row.date, minutes: row.minutes, note: row.note }]
            : [];
        }),
    },
    counts,
  };
}

// --- One skill -------------------------------------------------------------------

export interface SkillDetail {
  skill: {
    id: string;
    name: string;
    category: string;
    description: string;
    resourceUrl: string | null;
    resourceLabel: string | null;
  };
  listed: boolean;
  level: SkillLevel | null;
  /** Evidence counts even when unlisted — "you've used this in two projects". */
  proof: ProofView;
  inTrack: { stage: TrackStage; label: string; why: string } | null;
  practice: { id: string; date: string; minutes: number; note: string }[];
  openings: {
    jobs: {
      id: string;
      title: string;
      organiser: string;
      deadline: string | null;
      required: boolean;
    }[];
    events: { id: string; title: string; organiser: string; startsOn: string }[];
  };
  ideas: { id: string; title: string; difficulty: string; hours: number }[];
}

export function getSkillDetail(studentId: string, skillId: string): SkillDetail {
  const db = getDb();
  const student = findStudent(studentId);
  const skill = skillIndex().get(skillId);
  if (!skill) throw HttpError.notFound('No such skill.');

  const now = today();
  const row = db.studentSkills.find(
    (entry) => entry.studentId === studentId && entry.skillId === skillId,
  );
  const proof = proofFor(skillId, evidenceOf(db, studentId), now);
  const trackEntry = student.trackId
    ? db.tracks
        .find((track) => track.id === student.trackId)
        ?.skills.find((entry) => entry.skillId === skillId)
    : undefined;

  return {
    skill: {
      id: skill.id,
      name: skill.name,
      category: skill.category,
      description: skill.description,
      resourceUrl: skill.resourceUrl,
      resourceLabel: skill.resourceLabel,
    },
    listed: row !== undefined,
    level: row?.level ?? null,
    proof,
    inTrack: trackEntry
      ? { stage: trackEntry.stage, label: STAGE_LABEL[trackEntry.stage], why: trackEntry.why }
      : null,
    practice: db.practiceLogs
      .filter((log) => log.studentId === studentId && log.skillId === skillId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20)
      .map((log) => ({ id: log.id, date: log.date, minutes: log.minutes, note: log.note })),
    openings: {
      jobs: db.jobs
        .filter(
          (job) =>
            job.status === 'published' &&
            (job.deadline === null || job.deadline >= now) &&
            (job.skillIds.includes(skillId) || job.niceSkillIds.includes(skillId)),
        )
        .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
        .map((job) => ({
          id: job.id,
          title: job.title,
          organiser: job.organiser,
          deadline: job.deadline,
          required: job.skillIds.includes(skillId),
        })),
      events: db.events
        .filter(
          (event) =>
            event.status === 'published' &&
            event.startsOn >= now &&
            event.skillIds.includes(skillId),
        )
        .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
        .map((event) => ({
          id: event.id,
          title: event.title,
          organiser: event.organiser,
          startsOn: event.startsOn,
        })),
    },
    ideas: db.projectIdeas
      .filter((idea) => idea.skillIds.includes(skillId))
      .map((idea) => ({
        id: idea.id,
        title: idea.title,
        difficulty: idea.difficulty,
        hours: idea.hours,
      })),
  };
}

// --- Writes ----------------------------------------------------------------------

function listedSkill(studentId: string, skillId: string) {
  const row = getDb().studentSkills.find(
    (entry) => entry.studentId === studentId && entry.skillId === skillId,
  );
  if (!row) throw HttpError.notFound('That skill isn’t in your list.');
  return row;
}

export async function addSkill(studentId: string, input: AddSkillInput): Promise<SkillsOverview> {
  findStudent(studentId);
  assertSkillsExist([input.skillId]);

  const db = getDb();
  if (
    db.studentSkills.some((row) => row.studentId === studentId && row.skillId === input.skillId)
  ) {
    throw HttpError.conflict('That skill is already in your list.');
  }

  const now = nowISO();
  db.studentSkills.push({
    id: `sks-${studentId}-${input.skillId}`,
    studentId,
    skillId: input.skillId,
    level: input.level,
    addedAt: now,
    updatedAt: now,
  });

  // Existing evidence may prove it the moment it is listed.
  recomputeMomentum(studentId);
  await persist();
  return getSkills(studentId);
}

export async function updateSkill(
  studentId: string,
  skillId: string,
  level: SkillLevel,
): Promise<SkillsOverview> {
  const row = listedSkill(studentId, skillId);
  row.level = level;
  row.updatedAt = nowISO();
  await persist();
  return getSkills(studentId);
}

/** Unlisting keeps the practice log — it happened — but the skill stops counting. */
export async function removeSkill(studentId: string, skillId: string): Promise<SkillsOverview> {
  listedSkill(studentId, skillId);
  const db = getDb();
  db.studentSkills = db.studentSkills.filter(
    (row) => !(row.studentId === studentId && row.skillId === skillId),
  );
  recomputeMomentum(studentId);
  await persist();
  return getSkills(studentId);
}

export async function logPractice(
  studentId: string,
  skillId: string,
  input: PracticeInput,
): Promise<SkillDetail> {
  listedSkill(studentId, skillId);

  const now = today();
  const back = daysBetween(input.date, now);
  if (back < 0)
    throw HttpError.badRequest('You can’t log practice for a day that hasn’t happened.');
  if (back > PRACTICE_BACKDATE_DAYS) {
    throw HttpError.badRequest(`Practice can be logged up to ${PRACTICE_BACKDATE_DAYS} days back.`);
  }

  getDb().practiceLogs.push({
    id: newId('prc'),
    studentId,
    skillId,
    date: input.date,
    minutes: input.minutes,
    note: input.note,
    createdAt: nowISO(),
  });

  recomputeMomentum(studentId);
  await persist();
  return getSkillDetail(studentId, skillId);
}

export async function deletePractice(studentId: string, logId: string): Promise<void> {
  const db = getDb();
  const row = db.practiceLogs.find((entry) => entry.id === logId && entry.studentId === studentId);
  if (!row) throw HttpError.notFound('No such practice entry.');

  db.practiceLogs = db.practiceLogs.filter((entry) => entry.id !== logId);
  recomputeMomentum(studentId);
  await persist();
}

export async function addCertificate(
  studentId: string,
  input: CertificateInput,
): Promise<SkillsOverview> {
  findStudent(studentId);
  assertSkillsExist(input.skillIds);
  if (input.issuedOn > today()) throw HttpError.badRequest('The issue date is in the future.');

  getDb().certificates.push({
    id: newId('crt'),
    studentId,
    title: input.title,
    issuer: input.issuer,
    issuedOn: input.issuedOn,
    url: input.url,
    skillIds: input.skillIds,
    showOnPortfolio: input.showOnPortfolio,
    createdAt: nowISO(),
  });

  recomputeMomentum(studentId);
  await persist();
  return getSkills(studentId);
}

export async function deleteCertificate(
  studentId: string,
  certificateId: string,
): Promise<SkillsOverview> {
  const db = getDb();
  const row = db.certificates.find(
    (entry) => entry.id === certificateId && entry.studentId === studentId,
  );
  if (!row) throw HttpError.notFound('No such certificate.');

  db.certificates = db.certificates.filter((entry) => entry.id !== certificateId);
  recomputeMomentum(studentId);
  await persist();
  return getSkills(studentId);
}
