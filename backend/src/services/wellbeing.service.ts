/**
 * The Burnout page: weekly private check-ins, the reading `lib/burnout.ts` makes
 * of them, and the commitments bearing down on the student this fortnight.
 *
 * Private by construction. Only the student's own routes reach this file; the
 * admin overview gets counts, and only above an aggregation threshold (see
 * `admin.service.ts`). The reading is worked out when the page is opened rather
 * than stored — deadlines move closer every day, and nobody ranks on it.
 */
import { getDb, persist } from '../data/store.js';
import type { SupportContact } from '../data/types.js';
import { addDays, daysBetween, weekStart } from '../lib/dates.js';
import { FACTOR_ADVICE, assessBurnout } from '../lib/burnout.js';
import type { BurnoutLevel, FactorKey } from '../lib/burnout.js';
import type { CheckinInput } from '../models/misc.model.js';
import { projectsOf } from './evidence.js';
import { findStudent, newId, nowISO, preferencesOf, today } from './shared.js';

export const COMMITMENT_WINDOW_DAYS = 14;

export interface Commitment {
  kind: 'event' | 'register' | 'deadline' | 'milestone';
  title: string;
  detail: string;
  date: string;
  daysUntil: number;
  link: string;
}

/**
 * Everything with a date in the next fortnight: events you are going to,
 * registrations and applications about to close, and milestones due — plus
 * milestones already overdue on projects you are still building.
 */
export function commitmentsFor(studentId: string, days = COMMITMENT_WINDOW_DAYS): Commitment[] {
  const db = getDb();
  const now = today();
  const until = addDays(now, days);
  const inWindow = (date: string) => date >= now && date <= until;
  const items: Commitment[] = [];

  for (const row of db.eventParticipation.filter((entry) => entry.studentId === studentId)) {
    const event = db.events.find((entry) => entry.id === row.eventId);
    if (!event || event.status !== 'published') continue;

    if (row.status === 'registered' && inWindow(event.startsOn)) {
      items.push({
        kind: 'event',
        title: event.title,
        detail: `${event.time ? `${event.time} · ` : ''}${event.location}`,
        date: event.startsOn,
        daysUntil: daysBetween(now, event.startsOn),
        link: `/student/events/${event.id}`,
      });
    }
    if (row.status === 'saved' && event.registerBy && inWindow(event.registerBy)) {
      items.push({
        kind: 'register',
        title: `Register for ${event.title}`,
        detail: `Registration closes · ${event.organiser}`,
        date: event.registerBy,
        daysUntil: daysBetween(now, event.registerBy),
        link: `/student/events/${event.id}`,
      });
    }
  }

  for (const row of db.applications.filter(
    (entry) => entry.studentId === studentId && entry.stage === 'saved',
  )) {
    const job = db.jobs.find((entry) => entry.id === row.jobId);
    if (!job?.deadline || job.status !== 'published' || !inWindow(job.deadline)) continue;
    items.push({
      kind: 'deadline',
      title: `Apply: ${job.title}`,
      detail: `Applications close · ${job.organiser}`,
      date: job.deadline,
      daysUntil: daysBetween(now, job.deadline),
      link: `/student/jobs/${job.id}`,
    });
  }

  const building = new Map(
    projectsOf(db, studentId)
      .filter((project) => project.status === 'building')
      .map((project) => [project.id, project]),
  );
  for (const task of db.projectTasks) {
    const project = building.get(task.projectId);
    if (!project || task.done || !task.dueDate || task.dueDate > until) continue;
    items.push({
      kind: 'milestone',
      title: task.title,
      detail: task.dueDate < now ? `Overdue · ${project.title}` : project.title,
      date: task.dueDate,
      daysUntil: daysBetween(now, task.dueDate),
      link: `/student/projects/${project.id}`,
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export interface CheckinView {
  week: string;
  energy: number;
  stress: number;
  sleepHours: number;
  workload: number;
  enjoyment: number;
  note: string;
}

export interface Wellbeing {
  reading: {
    level: BurnoutLevel | null;
    score: number | null;
    basedOn: number;
    factors: { key: FactorKey; detail: string; advice: string }[];
  };
  thisWeek: { week: string; checkin: CheckinView | null };
  /** Up to twelve weeks, oldest first. Weeks without a check-in are simply absent. */
  history: CheckinView[];
  commitments: Commitment[];
  capacity: {
    weeklyHours: number | null;
    practiceMinutesThisWeek: number;
    milestonesDueThisWeek: number;
  };
  snoozeUntil: string | null;
  support: SupportContact[];
  totalCheckins: number;
}

const HISTORY_WEEKS = 12;

const view = (row: CheckinView): CheckinView => ({
  week: row.week,
  energy: row.energy,
  stress: row.stress,
  sleepHours: row.sleepHours,
  workload: row.workload,
  enjoyment: row.enjoyment,
  note: row.note,
});

export function getWellbeing(studentId: string): Wellbeing {
  const db = getDb();
  const student = findStudent(studentId);
  const now = today();
  const week = weekStart(now);
  const checkins = db.checkins
    .filter((row) => row.studentId === studentId)
    .sort((a, b) => a.week.localeCompare(b.week));
  const commitments = commitmentsFor(studentId);
  const reading = assessBurnout(checkins, commitments.length, now);

  const weekEnd = addDays(week, 6);
  const prefs = preferencesOf(studentId);
  const snoozeActive = prefs.snoozeUntil !== null && prefs.snoozeUntil > nowISO();

  return {
    reading: {
      ...reading,
      factors: reading.factors.map((factor) => ({ ...factor, advice: FACTOR_ADVICE[factor.key] })),
    },
    thisWeek: {
      week,
      checkin: (() => {
        const row = checkins.find((entry) => entry.week === week);
        return row ? view(row) : null;
      })(),
    },
    history: checkins.filter((row) => row.week > addDays(week, -7 * HISTORY_WEEKS)).map(view),
    commitments,
    capacity: {
      weeklyHours: student.weeklyHours,
      practiceMinutesThisWeek: db.practiceLogs
        .filter((row) => row.studentId === studentId && row.date >= week && row.date <= weekEnd)
        .reduce((sum, row) => sum + row.minutes, 0),
      milestonesDueThisWeek: commitments.filter(
        (item) => item.kind === 'milestone' && item.date <= weekEnd,
      ).length,
    },
    snoozeUntil: snoozeActive ? prefs.snoozeUntil : null,
    support: db.settings.wellbeingSupport,
    totalCheckins: checkins.length,
  };
}

/** One check-in per week: a second one this week replaces the first. */
export async function submitCheckin(studentId: string, input: CheckinInput): Promise<Wellbeing> {
  findStudent(studentId);
  const db = getDb();
  const week = weekStart(today());
  const now = nowISO();
  const existing = db.checkins.find((row) => row.studentId === studentId && row.week === week);

  if (existing) {
    Object.assign(existing, input, { updatedAt: now });
  } else {
    db.checkins.push({
      id: newId('chk'),
      studentId,
      week,
      ...input,
      createdAt: now,
      updatedAt: now,
    });
  }

  await persist();
  return getWellbeing(studentId);
}

/** Holds back non-urgent nudges. Deadlines still come through. */
export async function setSnooze(studentId: string, days: number): Promise<Wellbeing> {
  const prefs = preferencesOf(studentId);
  prefs.snoozeUntil = days === 0 ? null : new Date(Date.now() + days * 86_400_000).toISOString();
  await persist();
  return getWellbeing(studentId);
}

/** The student's right to take it all back. Nothing is kept. */
export async function deleteCheckins(studentId: string): Promise<Wellbeing> {
  const db = getDb();
  db.checkins = db.checkins.filter((row) => row.studentId !== studentId);
  await persist();
  return getWellbeing(studentId);
}
