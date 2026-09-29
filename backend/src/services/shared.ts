/**
 * Small lookups every service needs. Kept here so a "student not found" means the
 * same thing — and returns the same status — everywhere.
 */
import { randomUUID } from 'node:crypto';

import { getDb } from '../data/store.js';
import type {
  EventType,
  Interest,
  JobKind,
  PreferencesRow,
  SkillRow,
  StudentRow,
  TrackRow,
  Verification,
} from '../data/types.js';
import { todayISO } from '../lib/dates.js';
import { HttpError } from '../lib/httpError.js';

export const nowISO = () => new Date().toISOString();
export const today = () => todayISO();

/** `prj-3f9c…` — random, so two students creating at once cannot collide. */
export function newId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function findStudent(studentId: string): StudentRow {
  const student = getDb().students.find((row) => row.id === studentId);
  if (!student) throw HttpError.notFound('Student not found.');
  return student;
}

export function userIdOfStudent(studentId: string): string {
  return findStudent(studentId).userId;
}

/** The student's preferences, created with privacy-first defaults if missing. */
export function preferencesOf(studentId: string): PreferencesRow {
  const db = getDb();
  let row = db.preferences.find((entry) => entry.studentId === studentId);

  if (!row) {
    row = {
      id: `prf-${studentId}`,
      studentId,
      notify: {
        opportunities: true,
        events: true,
        projects: true,
        wellbeing: true,
        reminders: true,
      },
      emailDigest: 'off',
      leaderboardVisible: false,
      portfolioPublic: false,
      snoozeUntil: null,
    };
    db.preferences.push(row);
  }

  return row;
}

// --- Catalogue ------------------------------------------------------------------

export function skillIndex(): Map<string, SkillRow> {
  return new Map(getDb().skills.map((skill) => [skill.id, skill]));
}

export interface SkillRef {
  id: string;
  name: string;
}

/** Ids to `{ id, name }`, dropping any the catalogue no longer has. */
export function skillRefs(ids: readonly string[], index = skillIndex()): SkillRef[] {
  return ids.flatMap((id) => {
    const skill = index.get(id);
    return skill ? [{ id: skill.id, name: skill.name }] : [];
  });
}

/** Rejects unknown skill ids with a 400 rather than storing a dangling reference. */
export function assertSkillsExist(ids: readonly string[]): void {
  const index = skillIndex();
  const unknown = ids.filter((id) => !index.has(id));
  if (unknown.length > 0) {
    throw HttpError.badRequest(
      `Unknown skill${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}`,
    );
  }
}

export function findTrack(trackId: string): TrackRow {
  const track = getDb().tracks.find((row) => row.id === trackId);
  if (!track) throw HttpError.badRequest('That goal does not exist.');
  return track;
}

export function assertTracksExist(ids: readonly string[]): void {
  const known = new Set(getDb().tracks.map((track) => track.id));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) throw HttpError.badRequest(`Unknown goal: ${unknown.join(', ')}`);
}

/** "React, Node.js and SQL" */
export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// --- Dismissals -------------------------------------------------------------------

/** Keys the student has waved away — `event:<id>`, `job:<id>`, `today:<key>`. */
export function dismissedKeys(studentId: string): Set<string> {
  return new Set(
    getDb()
      .dismissals.filter((row) => row.studentId === studentId)
      .map((row) => row.key),
  );
}

/** Adds or lifts a dismissal. Does not persist. */
export function setDismissal(
  studentId: string,
  key: string,
  kind: 'not-interested' | 'dismissed',
  on: boolean,
): void {
  const db = getDb();
  db.dismissals = db.dismissals.filter((row) => !(row.studentId === studentId && row.key === key));
  if (on) db.dismissals.push({ id: newId('dis'), studentId, key, kind, at: nowISO() });
}

// --- Opportunities -----------------------------------------------------------------

/** Never "verified" — the label names who the listing came from. */
export const VERIFICATION_LABEL: Record<Verification, string> = {
  college: 'College-posted',
  partner: 'Partner-posted',
  student: 'Student-shared',
  external: 'Unverified external link',
};

export const EVENT_INTEREST: Record<EventType, Interest> = {
  hackathon: 'hackathons',
  workshop: 'workshops',
  bootcamp: 'workshops',
  contest: 'contests',
  talk: 'meetups',
  meetup: 'meetups',
};

export const JOB_INTEREST: Record<JobKind, Interest> = {
  internship: 'internships',
  'full-time': 'jobs',
  'part-time': 'jobs',
  'campus-drive': 'jobs',
  fellowship: 'fellowships',
  research: 'research',
};
