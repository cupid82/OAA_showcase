/**
 * Jobs and recruitment — internships, full-time roles, fellowships, research
 * positions and campus drives.
 *
 * The application tracker is the student's private notebook: the stage they are
 * at, a note, and a dated timeline. It never feeds the leaderboard, and nobody —
 * including admins — sees an individual's applications. OAA does not submit
 * applications either; "applied" means the student says they applied.
 */
import { getDb, persist } from '../data/store.js';
import type { ApplicationRow, ApplicationStage, JobRow, ListingStatus } from '../data/types.js';
import { APPLICATION_STAGES } from '../data/types.js';
import { daysBetween } from '../lib/dates.js';
import { HttpError } from '../lib/httpError.js';
import { isRecommended } from '../lib/matching.js';
import type { MatchStudent } from '../lib/matching.js';
import type { ApplicationInput, ShareJobInput } from '../models/opportunity.model.js';
import { matchJob, matchStudentOf } from './match.service.js';
import type { MatchView } from './match.service.js';
import { notifyAdmins } from './notification.service.js';
import {
  VERIFICATION_LABEL,
  assertSkillsExist,
  dismissedKeys,
  findStudent,
  newId,
  nowISO,
  setDismissal,
  skillIndex,
  skillRefs,
  today,
} from './shared.js';
import type { SkillRef } from './shared.js';

export interface JobCard {
  id: string;
  title: string;
  organiser: string;
  kind: JobRow['kind'];
  mode: JobRow['mode'];
  location: string;
  compensation: string;
  duration: string;
  deadline: string | null;
  effort: string;
  skills: SkillRef[];
  niceSkills: SkillRef[];
  verification: JobRow['verification'];
  verificationLabel: string;
  url: string | null;
  status: ListingStatus;
  sharedByYou: boolean;
  /** Published and before its deadline. */
  open: boolean;
  daysLeft: number | null;
  match: MatchView;
  my: {
    stage: ApplicationStage;
    note: string;
    updatedAt: string;
    timeline: { stage: ApplicationStage; at: string }[];
  } | null;
  notInterested: boolean;
}

export interface JobDetail extends JobCard {
  description: string;
  eligibility: string;
  eligibleYears: number[];
  tracks: { id: string; name: string }[];
  reviewNote: string;
}

interface Context {
  studentId: string;
  userId: string;
  match: MatchStudent;
  dismissed: Set<string>;
  now: string;
}

function contextFor(studentId: string): Context {
  return {
    studentId,
    userId: findStudent(studentId).userId,
    match: matchStudentOf(studentId),
    dismissed: dismissedKeys(studentId),
    now: today(),
  };
}

function visibleTo(ctx: Context, job: JobRow): boolean {
  if (job.status === 'published') return true;
  if (job.postedBy === ctx.userId) return true;
  return (
    job.status === 'archived' &&
    getDb().applications.some((row) => row.jobId === job.id && row.studentId === ctx.studentId)
  );
}

function cardOf(ctx: Context, job: JobRow, index = skillIndex()): JobCard {
  const mine = getDb().applications.find(
    (row) => row.jobId === job.id && row.studentId === ctx.studentId,
  );
  const daysLeft = job.deadline === null ? null : daysBetween(ctx.now, job.deadline);

  return {
    id: job.id,
    title: job.title,
    organiser: job.organiser,
    kind: job.kind,
    mode: job.mode,
    location: job.location,
    compensation: job.compensation,
    duration: job.duration,
    deadline: job.deadline,
    effort: job.effort,
    skills: skillRefs(job.skillIds, index),
    niceSkills: skillRefs(job.niceSkillIds, index),
    verification: job.verification,
    verificationLabel: VERIFICATION_LABEL[job.verification],
    url: job.url,
    status: job.status,
    sharedByYou: job.postedBy === ctx.userId,
    open: job.status === 'published' && (daysLeft === null || daysLeft >= 0),
    daysLeft,
    match: matchJob(ctx.match, job),
    my: mine
      ? { stage: mine.stage, note: mine.note, updatedAt: mine.updatedAt, timeline: mine.timeline }
      : null,
    notInterested: ctx.dismissed.has(`job:${job.id}`),
  };
}

function detailOf(ctx: Context, job: JobRow): JobDetail {
  const tracks = new Map(getDb().tracks.map((track) => [track.id, track.name]));
  return {
    ...cardOf(ctx, job),
    description: job.description,
    eligibility: job.eligibility,
    eligibleYears: job.eligibleYears,
    tracks: job.trackIds.flatMap((id) => {
      const name = tracks.get(id);
      return name ? [{ id, name }] : [];
    }),
    reviewNote: job.postedBy === ctx.userId ? job.reviewNote : '',
  };
}

/** Pipeline order — what is still in play comes first. */
const STAGE_ORDER: Record<ApplicationStage, number> = {
  offer: 0,
  interviewing: 1,
  applied: 2,
  saved: 3,
  rejected: 4,
  withdrawn: 5,
};

export interface JobsOverview {
  tracked: JobCard[];
  pipeline: Record<ApplicationStage, number>;
  recommended: JobCard[];
  /** Every published, still-open listing, closing soonest first. */
  open: JobCard[];
  shared: JobCard[];
}

const RECOMMEND_LIMIT = 5;

export function listJobs(studentId: string): JobsOverview {
  const ctx = contextFor(studentId);
  const index = skillIndex();
  const cards = getDb()
    .jobs.filter((job) => visibleTo(ctx, job))
    .map((job) => cardOf(ctx, job, index));

  const pipeline = Object.fromEntries(APPLICATION_STAGES.map((stage) => [stage, 0])) as Record<
    ApplicationStage,
    number
  >;
  for (const card of cards) if (card.my) pipeline[card.my.stage] += 1;

  const byDeadline = (a: JobCard, b: JobCard) =>
    (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999');

  const open = cards.filter((card) => card.open).sort(byDeadline);

  return {
    tracked: cards
      .filter((card) => card.my !== null)
      .sort((a, b) => STAGE_ORDER[a.my!.stage] - STAGE_ORDER[b.my!.stage] || byDeadline(a, b)),
    pipeline,
    recommended: open
      .filter((card) => card.my === null && !card.notInterested && isRecommended(card.match))
      .sort((a, b) => b.match.score - a.match.score || byDeadline(a, b))
      .slice(0, RECOMMEND_LIMIT),
    open,
    shared: cards.filter(
      (card) => card.sharedByYou && (card.status === 'pending' || card.status === 'rejected'),
    ),
  };
}

function findVisible(ctx: Context, jobId: string): JobRow {
  const job = getDb().jobs.find((row) => row.id === jobId);
  if (!job || !visibleTo(ctx, job)) throw HttpError.notFound('Listing not found.');
  return job;
}

export function getJob(studentId: string, jobId: string): JobDetail {
  const ctx = contextFor(studentId);
  return detailOf(ctx, findVisible(ctx, jobId));
}

export async function setApplication(
  studentId: string,
  jobId: string,
  input: ApplicationInput,
): Promise<JobDetail> {
  const ctx = contextFor(studentId);
  const job = findVisible(ctx, jobId);
  if (job.status === 'pending' || job.status === 'rejected') {
    throw HttpError.badRequest('This listing isn’t live yet — it is waiting for review.');
  }

  const db = getDb();
  const existing = db.applications.find(
    (row) => row.jobId === jobId && row.studentId === studentId,
  );
  const now = nowISO();

  if (input.stage === 'none') {
    db.applications = db.applications.filter((row) => row !== existing);
  } else if (existing) {
    if (existing.stage !== input.stage) {
      existing.stage = input.stage;
      existing.timeline.push({ stage: input.stage, at: now });
    }
    if (input.note !== undefined) existing.note = input.note;
    existing.updatedAt = now;
  } else {
    const row: ApplicationRow = {
      id: newId('app'),
      jobId,
      studentId,
      stage: input.stage,
      note: input.note ?? '',
      timeline: [{ stage: input.stage, at: now }],
      createdAt: now,
      updatedAt: now,
    };
    db.applications.push(row);
    setDismissal(studentId, `job:${jobId}`, 'not-interested', false);
  }

  await persist();
  return detailOf(ctx, job);
}

export async function setJobInterest(
  studentId: string,
  jobId: string,
  notInterested: boolean,
): Promise<JobDetail> {
  const ctx = contextFor(studentId);
  const job = findVisible(ctx, jobId);
  setDismissal(studentId, `job:${jobId}`, 'not-interested', notInterested);
  await persist();
  return detailOf(contextFor(studentId), job);
}

export async function shareJob(studentId: string, input: ShareJobInput): Promise<JobDetail> {
  const ctx = contextFor(studentId);
  const student = findStudent(studentId);
  assertSkillsExist([...input.skillIds, ...input.niceSkillIds]);
  if (input.deadline !== null && input.deadline < ctx.now) {
    throw HttpError.badRequest('That deadline has already passed.');
  }

  const job: JobRow = {
    id: newId('job'),
    title: input.title,
    organiser: input.organiser,
    description: input.description,
    eligibility: input.eligibility,
    eligibleYears: input.eligibleYears,
    skillIds: input.skillIds,
    trackIds: [],
    effort: input.effort,
    url: input.url,
    verification: 'student',
    status: 'pending',
    postedBy: student.userId,
    createdAt: nowISO(),
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: '',
    kind: input.kind,
    mode: input.mode,
    location: input.location,
    compensation: input.compensation,
    duration: input.duration,
    deadline: input.deadline,
    niceSkillIds: input.niceSkillIds,
  };

  getDb().jobs.push(job);
  notifyAdmins({
    title: `${student.name} shared a job for review`,
    body: `“${job.title}” at ${job.organiser}. Student-shared, with an outside link.`,
    link: '/admin/jobs?status=pending',
    dedupeKey: `review-request:${job.id}`,
  });

  await persist();
  return detailOf(ctx, job);
}
