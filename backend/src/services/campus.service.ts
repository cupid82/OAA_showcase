/**
 * The four content modules a student reads but does not own: timetable,
 * announcements, events and assignments.
 *
 * All four are scoped to the signed-in student — their section's grid, the
 * notices addressed to them, their own registrations and their own submissions.
 * Scoping is done here rather than in the route, for the same reason as
 * everywhere else in this project: the query and the check stay in one place.
 */
import { getDb } from '../data/store.js';
import type { StudentRow, SubmissionStatus } from '../data/types.js';
import { HttpError } from '../lib/httpError.js';

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

/** Period boundaries. Index 0 is unused so period 1 reads as `PERIODS[1]`. */
export const PERIOD_TIMES: readonly string[] = [
  '',
  '09:00 – 09:55',
  '09:55 – 10:50',
  '11:10 – 12:05',
  '12:05 – 13:00',
  '13:45 – 14:40',
  '14:40 – 15:35',
  '15:35 – 16:30',
];

function findStudent(studentId: string): StudentRow {
  const student = getDb().students.find((row) => row.id === studentId);
  if (!student) throw HttpError.notFound('Student not found.');
  return student;
}

const today = () => new Date().toISOString().slice(0, 10);

// --- Timetable ---------------------------------------------------------------

export interface TimetableEntry {
  period: number;
  time: string;
  subjectId: string;
  code: string;
  name: string;
  teacher: string;
  room: string;
}

export interface TimetableDay {
  day: number;
  name: string;
  periods: TimetableEntry[];
}

export interface Timetable {
  semester: number;
  section: string;
  /** Every period number in use, so the UI can build a consistent grid. */
  periodNumbers: number[];
  periodTimes: string[];
  days: TimetableDay[];
}

export function getTimetable(studentId: string): Timetable {
  const student = findStudent(studentId);
  const db = getDb();

  const slots = db.timetable.filter(
    (slot) =>
      slot.department === student.department &&
      slot.semester === student.semester &&
      slot.section === student.section,
  );

  const days: TimetableDay[] = [1, 2, 3, 4, 5].map((day) => ({
    day,
    name: DAY_NAMES[day] ?? `Day ${day}`,
    periods: slots
      .filter((slot) => slot.day === day)
      .sort((a, b) => a.period - b.period)
      .map((slot) => {
        const subject = db.subjects.find((row) => row.id === slot.subjectId);
        const teacher = db.teachers.find((row) => row.id === slot.teacherId);

        return {
          period: slot.period,
          time: PERIOD_TIMES[slot.period] ?? '',
          subjectId: slot.subjectId,
          code: subject?.code ?? '—',
          name: subject?.name ?? 'Unknown subject',
          teacher: teacher?.name ?? 'Unassigned',
          room: slot.room,
        };
      }),
  }));

  const periodNumbers = [...new Set(slots.map((slot) => slot.period))].sort((a, b) => a - b);

  return {
    semester: student.semester,
    section: student.section,
    periodNumbers,
    periodTimes: [...PERIOD_TIMES],
    days,
  };
}

// --- Announcements -----------------------------------------------------------

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  postedBy: string;
  postedAt: string;
  pinned: boolean;
}

export function getAnnouncements(studentId: string): Announcement[] {
  const student = findStudent(studentId);
  const db = getDb();

  return (
    db.announcements
      .filter((row) => {
        if (row.audience === 'all') return true;
        if (row.department !== student.department) return false;
        return row.audience === 'department' || row.semester === student.semester;
      })
      // Pinned first, then newest. A pinned notice that scrolled away is not pinned.
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.postedAt.localeCompare(a.postedAt))
      .map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        category: row.category,
        postedBy: row.postedBy,
        postedAt: row.postedAt,
        pinned: row.pinned,
      }))
  );
}

// --- Events ------------------------------------------------------------------

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  date: string;
  time: string;
  venue: string;
  capacity: number;
  organiser: string;
  socialPoints: number;
  registered: boolean;
  registrationCount: number;
  /** False once the date has passed — the UI shows it, but not a register button. */
  upcoming: boolean;
  full: boolean;
}

export function getEvents(studentId: string): CampusEvent[] {
  findStudent(studentId);
  const db = getDb();
  const now = today();

  return (
    db.events
      .map((event) => {
        const registrations = db.eventRegistrations.filter((row) => row.eventId === event.id);
        const count = registrations.length;

        return {
          id: event.id,
          title: event.title,
          description: event.description,
          type: event.type,
          date: event.date,
          time: event.time,
          venue: event.venue,
          capacity: event.capacity,
          organiser: event.organiser,
          socialPoints: event.socialPoints,
          registered: registrations.some((row) => row.studentId === studentId),
          registrationCount: count,
          upcoming: event.date >= now,
          full: count >= event.capacity,
        };
      })
      // Upcoming first and soonest-first within that; past events newest-first.
      .sort((a, b) => {
        if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
        return a.upcoming ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      })
  );
}

// --- Assignments -------------------------------------------------------------

export interface StudentAssignment {
  id: string;
  code: string;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  maxMarks: number;
  teacher: string;
  status: SubmissionStatus;
  submittedAt: string | null;
  marks: number | null;
  feedback: string;
  /** Pending and past its due date — the only state that needs chasing. */
  overdue: boolean;
}

export interface AssignmentsSummary {
  assignments: StudentAssignment[];
  pending: number;
  overdue: number;
  graded: number;
}

export function getAssignments(studentId: string): AssignmentsSummary {
  findStudent(studentId);
  const db = getDb();
  const now = today();

  const assignments: StudentAssignment[] = db.assignments
    .map((assignment) => {
      const subject = db.subjects.find((row) => row.id === assignment.subjectId);
      const teacher = db.teachers.find((row) => row.id === assignment.teacherId);
      const submission = db.submissions.find(
        (row) => row.assignmentId === assignment.id && row.studentId === studentId,
      );

      const status: SubmissionStatus = submission?.status ?? 'pending';

      return {
        id: assignment.id,
        code: subject?.code ?? '—',
        subject: subject?.name ?? 'Unknown subject',
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        maxMarks: assignment.maxMarks,
        teacher: teacher?.name ?? 'Unassigned',
        status,
        submittedAt: submission?.submittedAt ?? null,
        marks: submission?.marks ?? null,
        feedback: submission?.feedback ?? '',
        overdue: status === 'pending' && assignment.dueDate < now,
      };
    })
    // Anything still owed first, soonest deadline at the top.
    .sort((a, b) => {
      const owed = (entry: StudentAssignment) => (entry.status === 'pending' ? 0 : 1);
      return owed(a) - owed(b) || a.dueDate.localeCompare(b.dueDate);
    });

  return {
    assignments,
    pending: assignments.filter((entry) => entry.status === 'pending').length,
    overdue: assignments.filter((entry) => entry.overdue).length,
    graded: assignments.filter((entry) => entry.status === 'graded').length,
  };
}
