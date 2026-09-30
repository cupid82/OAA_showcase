/**
 * The student's own account: profile, goal, preferences and onboarding.
 *
 * Name, roll number, department and year come from the college's records and
 * are read-only here — the response says where they came from and when they were
 * last synced. Everything else is the student's, and every onboarding answer can
 * be changed again from Settings.
 */
import { getDb, persist } from '../data/store.js';
import type { Interest, NotificationCategory, SkillLevel } from '../data/types.js';
import { HttpError } from '../lib/httpError.js';
import type {
  GoalInput,
  OnboardingInput,
  PreferencesInput,
  ProfileInput,
} from '../models/profile.model.js';
import { linkAccount, normaliseAccount } from './connection.service.js';
import { recomputeMomentum } from './momentum.service.js';
import { assertSkillsExist, findStudent, findTrack, nowISO, preferencesOf } from './shared.js';

export interface Me {
  profile: {
    id: string;
    /** These three are null until the student has a college record. */
    rollNo: string | null;
    name: string;
    department: string | null;
    year: number | null;
    email: string;
    handle: string;
    headline: string;
    bio: string;
    trackId: string | null;
    interests: Interest[];
    weeklyHours: number | null;
    onboardedAt: string | null;
  };
  /** Where the read-only fields came from. `syncedAt` is null when never synced. */
  records: { source: string; url: string; syncedAt: string | null };
  track: { id: string; name: string; summary: string } | null;
  preferences: {
    notify: Record<NotificationCategory, boolean>;
    emailDigest: 'off' | 'weekly';
    leaderboardVisible: boolean;
    portfolioPublic: boolean;
    snoozeUntil: string | null;
  };
}

export function getMe(studentId: string): Me {
  const student = findStudent(studentId);
  const settings = getDb().settings;
  const prefs = preferencesOf(studentId);
  const track = student.trackId
    ? getDb().tracks.find((row) => row.id === student.trackId)
    : undefined;

  return {
    profile: {
      id: student.id,
      rollNo: student.rollNo,
      name: student.name,
      department: student.department,
      year: student.year,
      email: student.email,
      handle: student.handle,
      headline: student.headline,
      bio: student.bio,
      trackId: student.trackId,
      interests: student.interests,
      weeklyHours: student.weeklyHours,
      onboardedAt: student.onboardedAt,
    },
    records: { source: settings.erpName, url: settings.erpUrl, syncedAt: student.recordsSyncedAt },
    track: track ? { id: track.id, name: track.name, summary: track.summary } : null,
    preferences: {
      notify: { ...prefs.notify },
      emailDigest: prefs.emailDigest,
      leaderboardVisible: prefs.leaderboardVisible,
      portfolioPublic: prefs.portfolioPublic,
      snoozeUntil: prefs.snoozeUntil,
    },
  };
}

export async function updateProfile(studentId: string, input: ProfileInput): Promise<Me> {
  const student = findStudent(studentId);

  const taken = getDb().students.some(
    (row) => row.id !== studentId && row.handle.toLowerCase() === input.handle,
  );
  if (taken) throw HttpError.conflict('That portfolio address is taken. Try another.');

  student.handle = input.handle;
  student.headline = input.headline;
  student.bio = input.bio;

  await persist();
  return getMe(studentId);
}

export async function updateGoal(studentId: string, input: GoalInput): Promise<Me> {
  const student = findStudent(studentId);
  findTrack(input.trackId);

  student.trackId = input.trackId;
  student.interests = input.interests;
  student.weeklyHours = input.weeklyHours;

  await persist();
  return getMe(studentId);
}

export async function updatePreferences(studentId: string, input: PreferencesInput): Promise<Me> {
  const prefs = preferencesOf(studentId);
  prefs.notify = { ...input.notify };
  prefs.emailDigest = input.emailDigest;
  prefs.leaderboardVisible = input.leaderboardVisible;
  prefs.portfolioPublic = input.portfolioPublic;

  await persist();
  return getMe(studentId);
}

/**
 * Finishes onboarding in one write: goal, skills, preferences and any accounts
 * the student chose to link. Validated in full before anything changes, so a bad
 * GitHub username cannot leave a half-onboarded student behind.
 */
export async function completeOnboarding(studentId: string, input: OnboardingInput): Promise<Me> {
  const student = findStudent(studentId);
  findTrack(input.trackId);
  assertSkillsExist(input.skills.map((entry) => entry.skillId));

  const db = getDb();
  const now = nowISO();

  // Every link is checked before any is written: a malformed second handle must
  // not leave the first one linked and the student still un-onboarded.
  const links = input.connections.filter((entry) => entry.handle.trim().length > 0);
  for (const link of links) normaliseAccount(link.provider, link.handle);
  for (const link of links) {
    linkAccount(studentId, link.provider, { handle: link.handle, showOnPortfolio: true });
  }

  student.trackId = input.trackId;
  student.interests = input.interests;
  student.weeklyHours = input.weeklyHours;
  student.onboardedAt ??= now;

  const levels = new Map<string, SkillLevel>(
    input.skills.map((entry) => [entry.skillId, entry.level]),
  );
  for (const [skillId, level] of levels) {
    const existing = db.studentSkills.find(
      (row) => row.studentId === studentId && row.skillId === skillId,
    );
    if (existing) {
      existing.level = level;
      existing.updatedAt = now;
    } else {
      db.studentSkills.push({
        id: `sks-${studentId}-${skillId}`,
        studentId,
        skillId,
        level,
        addedAt: now,
        updatedAt: now,
      });
    }
  }

  const prefs = preferencesOf(studentId);
  prefs.emailDigest = input.emailDigest;
  prefs.leaderboardVisible = input.leaderboardVisible;
  prefs.portfolioPublic = input.portfolioPublic;

  recomputeMomentum(studentId);
  await persist();
  return getMe(studentId);
}

/** Public, unauthenticated: what the shell needs before anyone signs in. */
export function getMeta(): { erp: { name: string; url: string }; academicYear: string } {
  const settings = getDb().settings;
  return {
    erp: { name: settings.erpName, url: settings.erpUrl },
    academicYear: settings.academicYear,
  };
}

export function getCatalog() {
  const db = getDb();
  return {
    skills: db.skills.map(({ id, name, category, description }) => ({
      id,
      name,
      category,
      description,
    })),
    tracks: db.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      summary: track.summary,
      skillIds: track.skills.map((entry) => entry.skillId),
    })),
  };
}
