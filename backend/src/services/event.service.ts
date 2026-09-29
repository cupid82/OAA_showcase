/**
 * Events — hackathons, workshops, contests, talks, meetups and bootcamps.
 *
 * Every listing says where it came from (college-posted, partner-posted,
 * student-shared, or an unverified external link) and never claims more than
 * that. A student can save an event, mark it registered, and afterwards mark it
 * attended — with a reflection and the skills they used, which is what turns
 * turning up into evidence.
 */
import { getDb, persist } from '../data/store.js';
import type { EventRow, EventParticipationRow, ListingStatus } from '../data/types.js';
import { daysBetween } from '../lib/dates.js';
import { HttpError } from '../lib/httpError.js';
import { isRecommended } from '../lib/matching.js';
import type { MatchStudent } from '../lib/matching.js';
import type { ParticipationInput, ShareEventInput } from '../models/opportunity.model.js';
import { matchEvent, matchStudentOf } from './match.service.js';
import type { MatchView } from './match.service.js';
import { recomputeMomentum } from './momentum.service.js';
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

export interface EventCard {
  id: string;
  title: string;
  organiser: string;
  type: EventRow['type'];
  mode: EventRow['mode'];
  location: string;
  startsOn: string;
  endsOn: string | null;
  time: string;
  registerBy: string | null;
  effort: string;
  capacity: number | null;
  skills: SkillRef[];
  verification: EventRow['verification'];
  verificationLabel: string;
  url: string | null;
  status: ListingStatus;
  sharedByYou: boolean;
  upcoming: boolean;
  registrationOpen: boolean;
  daysUntil: number;
  /** Registered or attended, from this portal. */
  going: number;
  match: MatchView;
  my: {
    status: EventParticipationRow['status'];
    outcome: EventParticipationRow['outcome'];
    reflection: string;
    skills: SkillRef[];
  } | null;
  notInterested: boolean;
}

export interface EventDetail extends EventCard {
  description: string;
  eligibility: string;
  eligibleYears: number[];
  tracks: { id: string; name: string }[];
  /** A moderator's note, shown to the student who shared it. */
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

/** Published events are for everyone; a pending or rejected share, only for its sharer. */
function visibleTo(ctx: Context, event: EventRow): boolean {
  if (event.status === 'published') return true;
  if (event.postedBy === ctx.userId) return true;
  // An archived event stays visible to whoever already had it in their list.
  return (
    event.status === 'archived' &&
    getDb().eventParticipation.some(
      (row) => row.eventId === event.id && row.studentId === ctx.studentId,
    )
  );
}

function cardOf(ctx: Context, event: EventRow, index = skillIndex()): EventCard {
  const db = getDb();
  const mine = db.eventParticipation.find(
    (row) => row.eventId === event.id && row.studentId === ctx.studentId,
  );
  const lastDay = event.endsOn ?? event.startsOn;
  const upcoming = lastDay >= ctx.now;

  return {
    id: event.id,
    title: event.title,
    organiser: event.organiser,
    type: event.type,
    mode: event.mode,
    location: event.location,
    startsOn: event.startsOn,
    endsOn: event.endsOn,
    time: event.time,
    registerBy: event.registerBy,
    effort: event.effort,
    capacity: event.capacity,
    skills: skillRefs(event.skillIds, index),
    verification: event.verification,
    verificationLabel: VERIFICATION_LABEL[event.verification],
    url: event.url,
    status: event.status,
    sharedByYou: event.postedBy === ctx.userId,
    upcoming,
    registrationOpen: upcoming && (event.registerBy === null || event.registerBy >= ctx.now),
    daysUntil: daysBetween(ctx.now, event.startsOn),
    going: db.eventParticipation.filter(
      (row) =>
        row.eventId === event.id && (row.status === 'registered' || row.status === 'attended'),
    ).length,
    match: matchEvent(ctx.match, event),
    my: mine
      ? {
          status: mine.status,
          outcome: mine.outcome,
          reflection: mine.reflection,
          skills: skillRefs(mine.skillIds, index),
        }
      : null,
    notInterested: ctx.dismissed.has(`event:${event.id}`),
  };
}

function detailOf(ctx: Context, event: EventRow): EventDetail {
  const tracks = new Map(getDb().tracks.map((track) => [track.id, track.name]));
  return {
    ...cardOf(ctx, event),
    description: event.description,
    eligibility: event.eligibility,
    eligibleYears: event.eligibleYears,
    tracks: event.trackIds.flatMap((id) => {
      const name = tracks.get(id);
      return name ? [{ id, name }] : [];
    }),
    reviewNote: event.postedBy === ctx.userId ? event.reviewNote : '',
  };
}

export interface EventsOverview {
  /** Upcoming events you saved or registered for, soonest first. */
  mine: EventCard[];
  recommended: EventCard[];
  /** Every published upcoming event, soonest first. */
  upcoming: EventCard[];
  /** Past events you had in your list — attended ones first, for reflections. */
  past: EventCard[];
  /** What you shared that is waiting for review or was turned down. */
  shared: EventCard[];
  counts: { saved: number; registered: number; attended: number };
}

const RECOMMEND_LIMIT = 4;

export function listEvents(studentId: string): EventsOverview {
  const ctx = contextFor(studentId);
  const index = skillIndex();
  const cards = getDb()
    .events.filter((event) => visibleTo(ctx, event))
    .map((event) => cardOf(ctx, event, index));

  const published = cards.filter((card) => card.status === 'published');
  const upcoming = published
    .filter((card) => card.upcoming)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));

  return {
    mine: upcoming.filter((card) => card.my !== null),
    recommended: upcoming
      .filter(
        (card) =>
          card.my === null &&
          !card.notInterested &&
          card.registrationOpen &&
          isRecommended(card.match),
      )
      .sort((a, b) => b.match.score - a.match.score || a.startsOn.localeCompare(b.startsOn))
      .slice(0, RECOMMEND_LIMIT),
    upcoming,
    past: cards
      .filter((card) => !card.upcoming && card.my !== null)
      .sort(
        (a, b) =>
          Number(b.my?.status === 'attended') - Number(a.my?.status === 'attended') ||
          b.startsOn.localeCompare(a.startsOn),
      ),
    shared: cards
      .filter(
        (card) => card.sharedByYou && (card.status === 'pending' || card.status === 'rejected'),
      )
      .sort((a, b) => a.startsOn.localeCompare(b.startsOn)),
    counts: {
      saved: cards.filter((card) => card.upcoming && card.my?.status === 'saved').length,
      registered: cards.filter((card) => card.upcoming && card.my?.status === 'registered').length,
      attended: cards.filter((card) => card.my?.status === 'attended').length,
    },
  };
}

function findVisible(ctx: Context, eventId: string): EventRow {
  const event = getDb().events.find((row) => row.id === eventId);
  if (!event || !visibleTo(ctx, event)) throw HttpError.notFound('Event not found.');
  return event;
}

export function getEvent(studentId: string, eventId: string): EventDetail {
  const ctx = contextFor(studentId);
  return detailOf(ctx, findVisible(ctx, eventId));
}

export async function setParticipation(
  studentId: string,
  eventId: string,
  input: ParticipationInput,
): Promise<EventDetail> {
  const ctx = contextFor(studentId);
  const event = findVisible(ctx, eventId);
  if (event.status === 'pending' || event.status === 'rejected') {
    throw HttpError.badRequest('This event isn’t live yet — it is waiting for review.');
  }

  const db = getDb();
  const existing = db.eventParticipation.find(
    (row) => row.eventId === eventId && row.studentId === studentId,
  );

  if (input.status === 'none') {
    db.eventParticipation = db.eventParticipation.filter((row) => row !== existing);
  } else {
    const started = event.startsOn <= ctx.now;
    const over = (event.endsOn ?? event.startsOn) < ctx.now;

    if (input.status === 'attended' && !started) {
      throw HttpError.badRequest('You can mark an event attended once it has started.');
    }
    if (input.status !== 'attended' && over) {
      throw HttpError.badRequest(
        'This event is over — mark it attended, or remove it from your list.',
      );
    }
    if (input.skillIds) assertSkillsExist(input.skillIds);

    const attended = input.status === 'attended';
    const row: EventParticipationRow = existing ?? {
      id: newId('par'),
      eventId,
      studentId,
      status: input.status,
      outcome: null,
      reflection: '',
      skillIds: [],
      updatedAt: nowISO(),
    };

    row.status = input.status;
    // Outcome, reflection and skills only mean something once you were there.
    row.outcome = attended ? (input.outcome ?? row.outcome ?? 'participated') : null;
    row.reflection = attended ? (input.reflection ?? row.reflection) : '';
    row.skillIds = attended ? (input.skillIds ?? row.skillIds) : [];
    row.updatedAt = nowISO();

    if (!existing) db.eventParticipation.push(row);
    // Acting on an event you once waved away un-waves it.
    setDismissal(studentId, `event:${eventId}`, 'not-interested', false);
  }

  recomputeMomentum(studentId);
  await persist();
  return detailOf(ctx, event);
}

export async function setEventInterest(
  studentId: string,
  eventId: string,
  notInterested: boolean,
): Promise<EventDetail> {
  const ctx = contextFor(studentId);
  const event = findVisible(ctx, eventId);
  setDismissal(studentId, `event:${eventId}`, 'not-interested', notInterested);
  await persist();
  return detailOf(contextFor(studentId), event);
}

/**
 * A student shares an outside event. It is stored as `pending` and labelled
 * student-shared; nobody else sees it until a moderator approves it.
 */
export async function shareEvent(studentId: string, input: ShareEventInput): Promise<EventDetail> {
  const ctx = contextFor(studentId);
  const student = findStudent(studentId);
  assertSkillsExist(input.skillIds);
  if (input.startsOn < ctx.now) throw HttpError.badRequest('That event has already started.');

  const event: EventRow = {
    id: newId('evt'),
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
    type: input.type,
    mode: input.mode,
    location: input.location,
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    time: input.time,
    registerBy: input.registerBy,
    capacity: input.capacity,
  };

  getDb().events.push(event);
  notifyAdmins({
    title: `${student.name} shared an event for review`,
    body: `“${event.title}” — ${event.organiser}. Student-shared, with an outside link.`,
    link: '/admin/events?status=pending',
    dedupeKey: `review-request:${event.id}`,
  });

  await persist();
  return detailOf(ctx, event);
}
