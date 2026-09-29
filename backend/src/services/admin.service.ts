/**
 * The admin console: publishing and reviewing listings, and an aggregated view
 * of how the platform is being used.
 *
 * The product direction is explicit that an admin gains **no access to unrelated
 * student data**. So this file returns counts, never rows about a person — and
 * the one sensitive aggregate, how students are coping, is withheld entirely
 * until enough students check in that no individual could be picked out.
 */
import { getDb, persist } from '../data/store.js';
import type { EventRow, JobRow, ListingStatus, Role } from '../data/types.js';
import { addDays, monthStart, weekStart } from '../lib/dates.js';
import { assessBurnout } from '../lib/burnout.js';
import { HttpError } from '../lib/httpError.js';
import { isRecommended } from '../lib/matching.js';
import type {
  AdminEventInput,
  AdminEventUpdateInput,
  AdminJobInput,
  AdminJobUpdateInput,
  ReviewInput,
} from '../models/opportunity.model.js';
import { recentAudits, recordAudit } from './audit.service.js';
import { skillProofs } from './evidence.js';
import { matchEvent, matchJob, matchStudentOf } from './match.service.js';
import { notify } from './notification.service.js';
import {
  VERIFICATION_LABEL,
  assertSkillsExist,
  assertTracksExist,
  dismissedKeys,
  newId,
  nowISO,
  skillIndex,
  skillRefs,
  today,
} from './shared.js';
import type { SkillRef } from './shared.js';
import { commitmentsFor } from './wellbeing.service.js';

/** Below this many students with a reading, the wellbeing split is not shown. */
export const AGGREGATION_THRESHOLD = 5;

type Kind = 'event' | 'job';

export interface Actor {
  userId: string;
  role: Role;
}

// --- Overview ---------------------------------------------------------------------

export interface AdminOverview {
  students: { total: number; onboarded: number; activeThisMonth: number };
  projects: {
    building: number;
    shipped: number;
    shippedThisMonth: number;
    openToCollaborators: number;
  };
  opportunities: {
    eventsUpcoming: number;
    registrations: number;
    jobsOpen: number;
    applicationsTracked: number;
    offers: number;
  };
  review: { events: number; jobs: number };
  wellbeing: {
    checkinsThisWeek: number;
    participants: number;
    /** Null below the aggregation threshold — too few to share without identifying anyone. */
    levels: { steady: number; stretched: number; atRisk: number } | null;
    threshold: number;
  };
  /** Where open listings and student skills disagree — the campus-wide skill gap. */
  skillDemand: { skill: SkillRef; openings: number; proven: number; listed: number }[];
  recentModeration: { id: string; action: string; title: string; at: string; actor: string }[];
}

export function getOverview(): AdminOverview {
  const db = getDb();
  const now = today();
  const month = monthStart(now);
  const week = weekStart(now);
  const index = skillIndex();

  const onboarded = db.students.filter((row) => row.onboardedAt !== null);
  const openJobs = db.jobs.filter(
    (job) => job.status === 'published' && (job.deadline === null || job.deadline >= now),
  );
  const upcomingEvents = db.events.filter(
    (event) => event.status === 'published' && event.startsOn >= now,
  );
  const upcomingIds = new Set(upcomingEvents.map((event) => event.id));

  // Wellbeing: counts only, and the split only above the threshold.
  const recentSince = addDays(now, -28);
  const participants = new Set(
    db.checkins.filter((row) => row.week > recentSince).map((row) => row.studentId),
  );
  const levels = { steady: 0, stretched: 0, atRisk: 0 };
  let read = 0;
  for (const studentId of participants) {
    const reading = assessBurnout(
      db.checkins.filter((row) => row.studentId === studentId),
      commitmentsFor(studentId).length,
      now,
    );
    if (reading.level === null) continue;
    read += 1;
    if (reading.level === 'steady') levels.steady += 1;
    else if (reading.level === 'stretched') levels.stretched += 1;
    else levels.atRisk += 1;
  }

  // Skill demand across open listings, against how many students can show it.
  const openings = new Map<string, number>();
  for (const job of openJobs)
    for (const id of job.skillIds) openings.set(id, (openings.get(id) ?? 0) + 1);

  const provenCount = new Map<string, number>();
  const listedCount = new Map<string, number>();
  for (const student of onboarded) {
    for (const [skillId, proof] of skillProofs(db, student.id, now)) {
      listedCount.set(skillId, (listedCount.get(skillId) ?? 0) + 1);
      if (proof.stage === 'proven') provenCount.set(skillId, (provenCount.get(skillId) ?? 0) + 1);
    }
  }

  const titles = new Map<string, string>([
    ...db.events.map((event) => [event.id, event.title] as [string, string]),
    ...db.jobs.map((job) => [job.id, job.title] as [string, string]),
  ]);
  const names = new Map(db.users.map((user) => [user.id, user.name]));

  return {
    students: {
      total: db.students.length,
      onboarded: onboarded.length,
      activeThisMonth: new Set(
        db.momentum.filter((row) => row.at.slice(0, 10) >= month).map((row) => row.studentId),
      ).size,
    },
    projects: {
      building: db.projects.filter((row) => row.status === 'building').length,
      shipped: db.projects.filter((row) => row.status === 'shipped').length,
      shippedThisMonth: db.projects.filter(
        (row) => row.status === 'shipped' && (row.shippedAt ?? '').slice(0, 10) >= month,
      ).length,
      openToCollaborators: db.projects.filter((row) => row.openToCollaborators).length,
    },
    opportunities: {
      eventsUpcoming: upcomingEvents.length,
      registrations: db.eventParticipation.filter(
        (row) => row.status === 'registered' && upcomingIds.has(row.eventId),
      ).length,
      jobsOpen: openJobs.length,
      applicationsTracked: db.applications.filter((row) => row.stage !== 'saved').length,
      offers: db.applications.filter((row) => row.stage === 'offer').length,
    },
    review: {
      events: db.events.filter((row) => row.status === 'pending').length,
      jobs: db.jobs.filter((row) => row.status === 'pending').length,
    },
    wellbeing: {
      checkinsThisWeek: db.checkins.filter((row) => row.week === week).length,
      participants: participants.size,
      levels: read >= AGGREGATION_THRESHOLD ? levels : null,
      threshold: AGGREGATION_THRESHOLD,
    },
    skillDemand: [...openings.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .flatMap(([skillId, count]) => {
        const [skill] = skillRefs([skillId], index);
        return skill
          ? [
              {
                skill,
                openings: count,
                proven: provenCount.get(skillId) ?? 0,
                listed: listedCount.get(skillId) ?? 0,
              },
            ]
          : [];
      }),
    recentModeration: recentAudits(8).map((row) => ({
      id: row.id,
      action: row.action,
      title: titles.get(row.entityId) ?? row.entityId,
      at: row.at,
      actor: names.get(row.actorId) ?? 'Unknown',
    })),
  };
}

// --- Listings ----------------------------------------------------------------------

export interface ListingRow {
  id: string;
  kind: Kind;
  title: string;
  organiser: string;
  /** Event type or job kind. */
  category: string;
  verification: EventRow['verification'];
  verificationLabel: string;
  status: ListingStatus;
  /** Start date for an event, deadline for a job. */
  date: string | null;
  sharedBy: string | null;
  createdAt: string;
  reviewNote: string;
  /** How many students have it in their list — a count, never a name. */
  interest: number;
}

function sharerName(postedBy: string): string | null {
  const db = getDb();
  const user = db.users.find((row) => row.id === postedBy);
  return user?.role === 'student' ? user.name : null;
}

const STATUS_ORDER: Record<ListingStatus, number> = {
  pending: 0,
  published: 1,
  rejected: 2,
  archived: 3,
};

export function listListings(kind: Kind, status?: ListingStatus): ListingRow[] {
  const db = getDb();

  const rows: ListingRow[] =
    kind === 'event'
      ? db.events.map((event) => ({
          id: event.id,
          kind,
          title: event.title,
          organiser: event.organiser,
          category: event.type,
          verification: event.verification,
          verificationLabel: VERIFICATION_LABEL[event.verification],
          status: event.status,
          date: event.startsOn,
          sharedBy: sharerName(event.postedBy),
          createdAt: event.createdAt,
          reviewNote: event.reviewNote,
          interest: db.eventParticipation.filter((row) => row.eventId === event.id).length,
        }))
      : db.jobs.map((job) => ({
          id: job.id,
          kind,
          title: job.title,
          organiser: job.organiser,
          category: job.kind,
          verification: job.verification,
          verificationLabel: VERIFICATION_LABEL[job.verification],
          status: job.status,
          date: job.deadline,
          sharedBy: sharerName(job.postedBy),
          createdAt: job.createdAt,
          reviewNote: job.reviewNote,
          interest: db.applications.filter((row) => row.jobId === job.id).length,
        }));

  return rows
    .filter((row) => !status || row.status === status)
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.date ?? '9999').localeCompare(b.date ?? '9999'),
    );
}

export function getEventListing(id: string): EventRow & { sharedBy: string | null } {
  const event = getDb().events.find((row) => row.id === id);
  if (!event) throw HttpError.notFound('Event not found.');
  return { ...event, sharedBy: sharerName(event.postedBy) };
}

export function getJobListing(id: string): JobRow & { sharedBy: string | null } {
  const job = getDb().jobs.find((row) => row.id === id);
  if (!job) throw HttpError.notFound('Listing not found.');
  return { ...job, sharedBy: sharerName(job.postedBy) };
}

/** Tells every student this is a genuine fit for — respecting their mute settings. */
function announceMatches(kind: Kind, listing: EventRow | JobRow): void {
  const db = getDb();

  for (const student of db.students) {
    if (student.onboardedAt === null || student.userId === listing.postedBy) continue;
    if (dismissedKeys(student.id).has(`${kind}:${listing.id}`)) continue;

    const matchStudent = matchStudentOf(student.id);
    const match =
      kind === 'event'
        ? matchEvent(matchStudent, listing as EventRow)
        : matchJob(matchStudent, listing as JobRow);
    if (!isRecommended(match)) continue;

    notify({
      userId: student.userId,
      kind: kind === 'event' ? 'events' : 'opportunities',
      title: `New match: ${listing.title}`,
      body: `${listing.organiser} · ${match.reasons[0] ?? 'It fits what you told us you are looking for.'}`,
      link: `/student/${kind === 'event' ? 'events' : 'jobs'}/${listing.id}`,
      dedupeKey: `match:${listing.id}`,
    });
  }
}

const snapshot = (row: EventRow | JobRow) => ({ ...row }) as Record<string, unknown>;

export async function createEvent(actor: Actor, input: AdminEventInput): Promise<EventRow> {
  assertSkillsExist(input.skillIds);
  assertTracksExist(input.trackIds);

  const event: EventRow = {
    id: newId('evt'),
    ...input,
    status: 'published',
    postedBy: actor.userId,
    createdAt: nowISO(),
    reviewedBy: actor.userId,
    reviewedAt: nowISO(),
    reviewNote: '',
  };

  getDb().events.push(event);
  recordAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'event.create',
    entity: 'event',
    entityId: event.id,
    before: null,
    after: snapshot(event),
  });
  announceMatches('event', event);

  await persist();
  return event;
}

export async function updateEvent(
  actor: Actor,
  id: string,
  input: AdminEventUpdateInput,
): Promise<EventRow> {
  const event = getDb().events.find((row) => row.id === id);
  if (!event) throw HttpError.notFound('Event not found.');
  assertSkillsExist(input.skillIds);
  assertTracksExist(input.trackIds);

  const before = snapshot(event);
  Object.assign(event, input);
  recordAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'event.update',
    entity: 'event',
    entityId: event.id,
    before,
    after: snapshot(event),
  });

  await persist();
  return event;
}

export async function createJob(actor: Actor, input: AdminJobInput): Promise<JobRow> {
  assertSkillsExist([...input.skillIds, ...input.niceSkillIds]);
  assertTracksExist(input.trackIds);

  const job: JobRow = {
    id: newId('job'),
    ...input,
    status: 'published',
    postedBy: actor.userId,
    createdAt: nowISO(),
    reviewedBy: actor.userId,
    reviewedAt: nowISO(),
    reviewNote: '',
  };

  getDb().jobs.push(job);
  recordAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'job.create',
    entity: 'job',
    entityId: job.id,
    before: null,
    after: snapshot(job),
  });
  announceMatches('job', job);

  await persist();
  return job;
}

export async function updateJob(
  actor: Actor,
  id: string,
  input: AdminJobUpdateInput,
): Promise<JobRow> {
  const job = getDb().jobs.find((row) => row.id === id);
  if (!job) throw HttpError.notFound('Listing not found.');
  assertSkillsExist([...input.skillIds, ...input.niceSkillIds]);
  assertTracksExist(input.trackIds);

  const before = snapshot(job);
  Object.assign(job, input);
  recordAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'job.update',
    entity: 'job',
    entityId: job.id,
    before,
    after: snapshot(job),
  });

  await persist();
  return job;
}

const ALLOWED: Record<ReviewInput['decision'], ListingStatus[]> = {
  approve: ['pending', 'rejected'],
  reject: ['pending'],
  archive: ['published'],
  restore: ['archived'],
};

const RESULT: Record<ReviewInput['decision'], ListingStatus> = {
  approve: 'published',
  reject: 'rejected',
  archive: 'archived',
  restore: 'published',
};

/**
 * Approve, reject, archive or restore. The student who shared a listing hears
 * the outcome either way — with the moderator's note when it was turned down.
 */
export async function reviewListing(
  actor: Actor,
  kind: Kind,
  id: string,
  input: ReviewInput,
): Promise<ListingRow> {
  const db = getDb();
  const listing: EventRow | JobRow | undefined =
    kind === 'event'
      ? db.events.find((row) => row.id === id)
      : db.jobs.find((row) => row.id === id);
  if (!listing) throw HttpError.notFound('Listing not found.');

  if (!ALLOWED[input.decision].includes(listing.status)) {
    throw HttpError.conflict(`A ${listing.status} listing can’t be ${input.decision}d.`);
  }
  if (input.decision === 'reject' && input.note.trim() === '') {
    throw HttpError.badRequest('Say why, briefly — the student who shared it will see your note.');
  }

  const before = snapshot(listing);
  listing.status = RESULT[input.decision];
  if (input.decision === 'approve' || input.decision === 'reject') {
    listing.reviewedBy = actor.userId;
    listing.reviewedAt = nowISO();
    listing.reviewNote = input.note;
  }

  recordAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: `${kind}.${input.decision}`,
    entity: kind,
    entityId: listing.id,
    before,
    after: snapshot(listing),
  });

  const sharer = db.students.find((row) => row.userId === listing.postedBy);
  const path = `/student/${kind === 'event' ? 'events' : 'jobs'}/${listing.id}`;
  if (sharer && input.decision === 'approve') {
    notify({
      userId: sharer.userId,
      kind: kind === 'event' ? 'events' : 'opportunities',
      title: 'Your shared listing is live',
      body: `“${listing.title}” was reviewed and is now visible to everyone.`,
      link: path,
      dedupeKey: `review:${listing.id}:approve`,
    });
  }
  if (sharer && input.decision === 'reject') {
    notify({
      userId: sharer.userId,
      kind: kind === 'event' ? 'events' : 'opportunities',
      title: 'Your shared listing wasn’t published',
      body: `“${listing.title}” — ${input.note}`,
      link: path,
      dedupeKey: `review:${listing.id}:reject:${listing.reviewedAt}`,
    });
  }
  if (listing.status === 'published') announceMatches(kind, listing);

  await persist();
  const row = listListings(kind).find((entry) => entry.id === listing.id);
  if (!row) throw HttpError.notFound('Listing not found.');
  return row;
}
