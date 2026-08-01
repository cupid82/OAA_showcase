/**
 * Read models for the student module.
 *
 * Everything here is derived on read from the raw rows — attendance percentages
 * from individual dated records, grades and CGPA from marks. Nothing aggregate is
 * stored, so nothing aggregate can go stale or be hand-edited.
 */
import { getDb } from '../data/store.js';
import type { StudentRow, SubjectRow } from '../data/types.js';
import { creditWeightedAverage, gradeFor } from '../lib/grading.js';
import { HttpError } from '../lib/httpError.js';

/**
 * Minimum attendance to sit an exam. Confirmed at 75% in `plans.md`.
 * Moves to the admin settings table when Step 9 lands.
 */
export const ATTENDANCE_THRESHOLD = 75;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** One decimal place. `0/0` is 0, not NaN. */
function percentage(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function findStudent(studentId: string): StudentRow {
  const student = getDb().students.find((row) => row.id === studentId);
  if (!student) throw HttpError.notFound('Student not found.');
  return student;
}

function subjectIndex(): Map<string, SubjectRow> {
  return new Map(getDb().subjects.map((subject) => [subject.id, subject]));
}

// --- Profile -----------------------------------------------------------------

export interface StudentProfile extends StudentRow {
  /** Derived from the semester — semesters 1–2 are year 1, and so on. */
  year: number;
}

export function getProfile(studentId: string): StudentProfile {
  const student = findStudent(studentId);
  return { ...student, year: Math.ceil(student.semester / 2) };
}

// --- Marks -------------------------------------------------------------------

export interface SubjectMark {
  subjectId: string;
  code: string;
  name: string;
  credits: number;
  internal: number;
  internalMax: number;
  external: number;
  externalMax: number;
  total: number;
  totalMax: number;
  grade: string;
  gradePoint: number;
}

export interface SemesterMarks {
  semester: number;
  subjects: SubjectMark[];
  credits: number;
  /** Credit-weighted grade point average for this semester alone. */
  sgpa: number | null;
}

export interface MarksSummary {
  currentSemester: number;
  semesters: SemesterMarks[];
  cgpa: number | null;
}

export function getMarks(studentId: string): MarksSummary {
  const student = findStudent(studentId);
  const subjects = subjectIndex();

  const bySemester = new Map<number, SubjectMark[]>();

  for (const mark of getDb().marks) {
    if (mark.studentId !== studentId) continue;

    const subject = subjects.get(mark.subjectId);
    if (!subject) continue; // Orphaned row — a deleted subject must not 500 the page.

    const total = mark.internal + mark.external;
    const totalMax = subject.internalMax + subject.externalMax;
    // Grade bands are defined against a 0–100 total, so normalise first.
    const { grade, point } = gradeFor((total / totalMax) * 100);

    const entry: SubjectMark = {
      subjectId: subject.id,
      code: subject.code,
      name: subject.name,
      credits: subject.credits,
      internal: mark.internal,
      internalMax: subject.internalMax,
      external: mark.external,
      externalMax: subject.externalMax,
      total,
      totalMax,
      grade,
      gradePoint: point,
    };

    const bucket = bySemester.get(mark.semester);
    if (bucket) bucket.push(entry);
    else bySemester.set(mark.semester, [entry]);
  }

  const semesters: SemesterMarks[] = [...bySemester.entries()]
    .sort(([a], [b]) => a - b)
    .map(([semester, list]) => {
      const sorted = [...list].sort((a, b) => a.code.localeCompare(b.code));

      return {
        semester,
        subjects: sorted,
        credits: sorted.reduce((sum, subject) => sum + subject.credits, 0),
        sgpa: creditWeightedAverage(
          sorted.map((subject) => ({ credits: subject.credits, point: subject.gradePoint })),
        ),
      };
    });

  const cgpa = creditWeightedAverage(
    semesters.flatMap((entry) =>
      entry.subjects.map((subject) => ({ credits: subject.credits, point: subject.gradePoint })),
    ),
  );

  return { currentSemester: student.semester, semesters, cgpa };
}

// --- Attendance --------------------------------------------------------------

interface Tally {
  held: number;
  attended: number;
}

export interface AttendanceSlice extends Tally {
  percentage: number;
}

export interface SubjectAttendance extends AttendanceSlice {
  subjectId: string;
  code: string;
  name: string;
  belowThreshold: boolean;
}

export interface MonthlyAttendance extends AttendanceSlice {
  /** `YYYY-MM`, for sorting and as a stable React key. */
  month: string;
  /** `Apr 2026`, for the chart axis. */
  label: string;
}

export interface AbsenceRecord {
  date: string;
  code: string;
  name: string;
}

export interface AttendanceSummary {
  threshold: number;
  overall: AttendanceSlice;
  belowThreshold: boolean;
  subjects: SubjectAttendance[];
  monthly: MonthlyAttendance[];
  /** Most recent absences, newest first — the dated rows behind the percentage. */
  recentAbsences: AbsenceRecord[];
}

const RECENT_ABSENCE_LIMIT = 10;

function bump(map: Map<string, Tally>, key: string, attended: boolean): void {
  const tally = map.get(key) ?? { held: 0, attended: 0 };
  tally.held += 1;
  if (attended) tally.attended += 1;
  map.set(key, tally);
}

export function getAttendance(studentId: string): AttendanceSummary {
  findStudent(studentId); // 404 before doing any work.

  const subjects = subjectIndex();
  const rows = getDb().attendance.filter((row) => row.studentId === studentId);

  const perSubject = new Map<string, Tally>();
  const perMonth = new Map<string, Tally>();
  const overall: Tally = { held: 0, attended: 0 };
  const absences: AbsenceRecord[] = [];

  for (const row of rows) {
    const subject = subjects.get(row.subjectId);
    if (!subject) continue;

    const present = row.status === 'present';

    overall.held += 1;
    if (present) overall.attended += 1;

    bump(perSubject, row.subjectId, present);
    bump(perMonth, row.date.slice(0, 7), present);

    if (!present) absences.push({ date: row.date, code: subject.code, name: subject.name });
  }

  const subjectRows: SubjectAttendance[] = [...perSubject.entries()]
    .map(([subjectId, tally]) => {
      const subject = subjects.get(subjectId);
      const percent = percentage(tally.attended, tally.held);

      return {
        subjectId,
        code: subject?.code ?? '—',
        name: subject?.name ?? 'Unknown subject',
        held: tally.held,
        attended: tally.attended,
        percentage: percent,
        belowThreshold: percent < ATTENDANCE_THRESHOLD,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const monthly: MonthlyAttendance[] = [...perMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, tally]) => {
      const [year, monthNumber] = month.split('-');
      const label = `${MONTHS[Number(monthNumber) - 1] ?? month} ${year}`;

      return {
        month,
        label,
        held: tally.held,
        attended: tally.attended,
        percentage: percentage(tally.attended, tally.held),
      };
    });

  const overallPercentage = percentage(overall.attended, overall.held);

  return {
    threshold: ATTENDANCE_THRESHOLD,
    overall: { ...overall, percentage: overallPercentage },
    // Only meaningful once some classes have been held.
    belowThreshold: overall.held > 0 && overallPercentage < ATTENDANCE_THRESHOLD,
    subjects: subjectRows,
    monthly,
    recentAbsences: absences
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, RECENT_ABSENCE_LIMIT),
  };
}
