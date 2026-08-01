/**
 * Rankings over the stored OAA scores.
 *
 * Nothing is recalculated here — the scores were computed on write and stored in
 * `oaaScores`, so ranking is a sort over rows that already exist. That is the
 * whole reason the recompute-on-write strategy matters: a leaderboard over ten
 * thousand students stays a sort, not ten thousand recalculations.
 */
import { getDb } from '../data/store.js';
import type { StudentRow } from '../data/types.js';
import { HttpError } from '../lib/httpError.js';
import type { OaaDimension } from '../lib/oaa.js';

export type LeaderboardScope = 'college' | 'department' | 'section';
export type LeaderboardCategory = 'oaa' | OaaDimension | 'attendance';

export interface LeaderboardRow {
  rank: number;
  studentId: string;
  rollNo: string;
  name: string;
  department: string;
  semester: number;
  section: string;
  value: number | null;
  grade: string | null;
  /** The signed-in student, so the UI can highlight their row without guessing. */
  isYou: boolean;
}

export interface Leaderboard {
  scope: LeaderboardScope;
  category: LeaderboardCategory;
  label: string;
  /** What the ranking is drawn from, e.g. "Computer Science & Engineering". */
  within: string;
  rows: LeaderboardRow[];
  /** The viewer's own position, even when it falls outside the visible page. */
  you: LeaderboardRow | null;
  total: number;
}

const CATEGORY_LABEL: Record<LeaderboardCategory, string> = {
  oaa: 'Overall ability',
  academic: 'Academic',
  adaptability: 'Adaptability',
  physical: 'Physical',
  social: 'Social',
  attendance: 'Attendance',
};

/** Attendance percentage, counted from the dated rows like everywhere else. */
function attendanceFor(studentId: string): number | null {
  const rows = getDb().attendance.filter((row) => row.studentId === studentId);
  if (rows.length === 0) return null;

  const attended = rows.filter((row) => row.status === 'present').length;
  return Math.round((attended / rows.length) * 1000) / 10;
}

function valueFor(
  student: StudentRow,
  category: LeaderboardCategory,
): { value: number | null; grade: string | null } {
  if (category === 'attendance') {
    return { value: attendanceFor(student.id), grade: null };
  }

  const row = getDb().oaaScores.find(
    (entry) => entry.studentId === student.id && entry.semester === student.semester,
  );
  if (!row) return { value: null, grade: null };

  if (category === 'oaa') return { value: row.score, grade: row.grade };
  return { value: row[category], grade: null };
}

/**
 * Standard competition ranking: equal values share a rank and the next distinct
 * value skips ahead (1, 2, 2, 4). Dense ranking would tell the fourth student
 * they are third, which is not what a rank means.
 */
function assignRanks<T extends { value: number | null }>(entries: T[]): (T & { rank: number })[] {
  let lastValue: number | null = null;
  let lastRank = 0;

  return entries.map((entry, index) => {
    const rank = entry.value !== null && entry.value === lastValue ? lastRank : index + 1;
    lastValue = entry.value;
    lastRank = rank;
    return { ...entry, rank };
  });
}

export function getLeaderboard(
  viewerStudentId: string,
  scope: LeaderboardScope,
  category: LeaderboardCategory,
): Leaderboard {
  const db = getDb();

  const viewer = db.students.find((row) => row.id === viewerStudentId);
  if (!viewer) throw HttpError.notFound('Student not found.');

  const pool = db.students.filter((student) => {
    if (scope === 'college') return true;
    if (scope === 'department') return student.department === viewer.department;
    return (
      student.department === viewer.department &&
      student.semester === viewer.semester &&
      student.section === viewer.section
    );
  });

  const scored = pool
    .map((student) => {
      const { value, grade } = valueFor(student, category);
      return {
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.name,
        department: student.department,
        semester: student.semester,
        section: student.section,
        value,
        grade,
        isYou: student.id === viewerStudentId,
      };
    })
    // Unscored students sort last rather than being dropped — "no score yet" is a
    // real position in a class list, and hiding them would silently change ranks.
    .sort((a, b) => {
      if (a.value === null && b.value === null) return a.rollNo.localeCompare(b.rollNo);
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return b.value - a.value || a.rollNo.localeCompare(b.rollNo);
    });

  const rows = assignRanks(scored);

  const within =
    scope === 'college'
      ? 'the whole college'
      : scope === 'department'
        ? viewer.department
        : `semester ${viewer.semester}, section ${viewer.section}`;

  return {
    scope,
    category,
    label: CATEGORY_LABEL[category],
    within,
    rows,
    you: rows.find((row) => row.isYou) ?? null,
    total: rows.length,
  };
}
