/**
 * The in-app inbox — OAA's own record of what happened and what the student did
 * about it (read, dismissed). Email, if the college ever switches it on, is only
 * a delivery channel for this; its read flag never becomes product state.
 *
 * Three rules from the product direction are enforced here:
 *
 * 1. Every notification has a purpose and a link to act on it.
 * 2. A student who turned a category off never gets that category — the row is
 *    not created, rather than created and hidden.
 * 3. No duplicates: a `dedupeKey` makes each reminder happen once.
 */
import { getDb, persist } from '../data/store.js';
import type { NotificationKind, NotificationRow } from '../data/types.js';
import { addDays, daysBetween, weekStart } from '../lib/dates.js';
import { HttpError } from '../lib/httpError.js';
import { projectsOf } from './evidence.js';
import { newId, nowISO, preferencesOf, today } from './shared.js';

export interface NotifyInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  dedupeKey?: string;
}

/** Creates one notification, unless muted or already sent. Does not persist. */
export function notify(input: NotifyInput): NotificationRow | null {
  const db = getDb();

  if (input.kind !== 'moderation') {
    const student = db.students.find((row) => row.userId === input.userId);
    if (student && !preferencesOf(student.id).notify[input.kind]) return null;
  }

  if (
    input.dedupeKey &&
    db.notifications.some((row) => row.userId === input.userId && row.dedupeKey === input.dedupeKey)
  ) {
    return null;
  }

  const row: NotificationRow = {
    id: newId('ntf'),
    userId: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    link: input.link,
    dedupeKey: input.dedupeKey ?? null,
    createdAt: nowISO(),
    readAt: null,
    dismissedAt: null,
  };

  db.notifications.push(row);
  return row;
}

/** Every admin gets moderation items. */
export function notifyAdmins(input: Omit<NotifyInput, 'userId' | 'kind'>): void {
  for (const admin of getDb().users.filter((user) => user.role === 'admin')) {
    notify({ ...input, userId: admin.id, kind: 'moderation' });
  }
}

const when = (days: number) => (days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`);

/**
 * Time-based reminders. There is no scheduler in this app, so they are created
 * when the student next looks — deduplicated, so looking twice changes nothing.
 * Returns how many were created; the caller persists if any were.
 */
export function syncReminders(studentId: string): number {
  const db = getDb();
  const student = db.students.find((row) => row.id === studentId);
  if (!student) return 0;

  const now = today();
  const userId = student.userId;
  const snoozed = (() => {
    const until = preferencesOf(studentId).snoozeUntil;
    return until !== null && until > nowISO();
  })();
  let created = 0;
  const add = (input: Omit<NotifyInput, 'userId'>) => {
    if (notify({ ...input, userId })) created += 1;
  };

  // Deadlines are urgent — they arrive even while nudges are snoozed.
  for (const application of db.applications.filter(
    (row) => row.studentId === studentId && row.stage === 'saved',
  )) {
    const job = db.jobs.find((row) => row.id === application.jobId);
    if (!job?.deadline || job.status !== 'published') continue;
    const days = daysBetween(now, job.deadline);
    if (days < 0 || days > 3) continue;

    add({
      kind: 'opportunities',
      title: `${job.title} closes ${when(days)}`,
      body: `${job.organiser} · You saved this but haven’t marked it applied.`,
      link: `/student/jobs/${job.id}`,
      dedupeKey: `deadline:${job.id}:${job.deadline}`,
    });
  }

  for (const participation of db.eventParticipation.filter((row) => row.studentId === studentId)) {
    const event = db.events.find((row) => row.id === participation.eventId);
    if (!event || event.status !== 'published') continue;

    if (participation.status === 'saved' && event.registerBy) {
      const days = daysBetween(now, event.registerBy);
      if (days >= 0 && days <= 3) {
        add({
          kind: 'events',
          title: `Registration for ${event.title} closes ${when(days)}`,
          body: `${event.organiser} · You saved this but haven’t registered yet.`,
          link: `/student/events/${event.id}`,
          dedupeKey: `register:${event.id}:${event.registerBy}`,
        });
      }
    }

    if (participation.status === 'registered') {
      const days = daysBetween(now, event.startsOn);
      if (days >= 0 && days <= 2) {
        add({
          kind: 'events',
          title: `${event.title} is ${when(days)}`,
          body: `${event.time ? `${event.time} · ` : ''}${event.location}`,
          link: `/student/events/${event.id}`,
          dedupeKey: `starts:${event.id}:${event.startsOn}`,
        });
      }
    }
  }

  if (!snoozed) {
    const projectIds = new Set(
      projectsOf(db, studentId)
        .filter((project) => project.status === 'building')
        .map((project) => project.id),
    );

    for (const task of db.projectTasks.filter(
      (row) => projectIds.has(row.projectId) && !row.done && row.dueDate,
    )) {
      const days = daysBetween(now, task.dueDate ?? now);
      if (days < 0 || days > 1) continue;
      const project = db.projects.find((row) => row.id === task.projectId);

      add({
        kind: 'reminders',
        title: `Milestone due ${when(days)}: ${task.title}`,
        body: project ? `On ${project.title}.` : '',
        link: `/student/projects/${task.projectId}`,
        dedupeKey: `due:${task.id}:${task.dueDate}`,
      });
    }

    // One gentle check-in prompt a week, from Thursday, and only for students
    // who have checked in before — never a nag to someone who hasn't opted in.
    const week = weekStart(now);
    const hasCheckedIn = db.checkins.some((row) => row.studentId === studentId);
    const doneThisWeek = db.checkins.some(
      (row) => row.studentId === studentId && row.week === week,
    );
    if (hasCheckedIn && !doneThisWeek && now >= addDays(week, 3)) {
      add({
        kind: 'wellbeing',
        title: 'Two-minute check-in',
        body: 'Five quick questions about your week. Only you ever see the answers.',
        link: '/student/burnout',
        dedupeKey: `checkin:${week}`,
      });
    }
  }

  return created;
}

export interface NotificationView {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
}

export interface Inbox {
  items: NotificationView[];
  unread: number;
}

const INBOX_LIMIT = 40;

export function listNotifications(userId: string): Inbox {
  const rows = getDb()
    .notifications.filter((row) => row.userId === userId && row.dismissedAt === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    items: rows.slice(0, INBOX_LIMIT).map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      link: row.link,
      createdAt: row.createdAt,
      read: row.readAt !== null,
    })),
    unread: rows.filter((row) => row.readAt === null).length,
  };
}

/**
 * Opening the inbox. For a student this is also when time-based reminders are
 * created (see `syncReminders`); the store is written only if one appeared.
 */
export async function openInbox(userId: string): Promise<Inbox> {
  const student = getDb().students.find((row) => row.userId === userId);
  if (student && syncReminders(student.id) > 0) await persist();
  return listNotifications(userId);
}

export async function updateNotification(
  userId: string,
  id: string,
  change: { read?: boolean; dismissed?: boolean },
): Promise<Inbox> {
  const row = getDb().notifications.find((entry) => entry.id === id && entry.userId === userId);
  if (!row) throw HttpError.notFound('No such notification.');

  const at = nowISO();
  if (change.read && !row.readAt) row.readAt = at;
  if (change.dismissed && !row.dismissedAt) {
    row.dismissedAt = at;
    row.readAt ??= at;
  }

  await persist();
  return listNotifications(userId);
}

export async function markAllRead(userId: string): Promise<Inbox> {
  const at = nowISO();
  let count = 0;
  for (const row of getDb().notifications) {
    if (row.userId === userId && row.readAt === null) {
      row.readAt = at;
      count += 1;
    }
  }

  if (count > 0) await persist();
  return listNotifications(userId);
}
