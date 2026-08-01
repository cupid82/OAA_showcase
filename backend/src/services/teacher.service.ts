/**
 * The teacher write path.
 *
 * Every function here starts from the signed-in user and resolves their teacher
 * record, then their assignments. That ordering is deliberate: a class is only
 * addressable if it appears in `teacherAssignments` for *this* teacher, so a
 * subject id sent by the client can never widen what they may touch.
 *
 * Reads are derived from the raw rows, exactly as in `student.service.ts` —
 * nothing aggregate is stored.
 */
import { getDb, persist } from '../data/store.js';
import type {
  AdaptabilityAssessmentRow,
  AdaptabilityCriterion,
  AttendanceRow,
  MarkRow,
  SocialRecordRow,
  StudentRow,
  SubjectRow,
  TeacherRow,
} from '../data/types.js';
import { gradeFor } from '../lib/grading.js';
import { HttpError } from '../lib/httpError.js';
import type { AuthenticatedUser } from '../middleware/requireAuth.js';
import type {
  AdaptabilityInput,
  BulkAttendanceInput,
  MarksEntryInput,
  MarksUpdateInput,
  SocialRecordInput,
  StudentSearchInput,
} from '../models/teacher.model.js';
import { recordAudit, recentAudits } from './audit.service.js';
import { recomputeStudent } from './oaa.service.js';

/**
 * How far back a class may be marked. Long enough to cover a teacher catching up
 * after leave, short enough that a term's attendance cannot be quietly rewritten
 * months later. Future dates are never allowed — a class that has not happened
 * cannot have been attended.
 */
export const ATTENDANCE_BACKDATE_DAYS = 30;

const DAY_MS = 86_400_000;

export const today = (): string => new Date().toISOString().slice(0, 10);

// --- Lookups -----------------------------------------------------------------

function teacherFor(user: AuthenticatedUser): TeacherRow {
  const teacher = getDb().teachers.find((row) => row.userId === user.id);
  if (!teacher) throw HttpError.forbidden('This account is not linked to a teacher record.');
  return teacher;
}

function subjectById(subjectId: string): SubjectRow {
  const subject = getDb().subjects.find((row) => row.id === subjectId);
  if (!subject) throw HttpError.notFound('Subject not found.');
  return subject;
}

/**
 * The single authorisation check for every write below. Throws 403 unless this
 * teacher is assigned to this exact (subject, section).
 */
function assertOwnsClass(teacher: TeacherRow, subjectId: string, section: string): SubjectRow {
  const subject = subjectById(subjectId);

  const owns = getDb().teacherAssignments.some(
    (row) => row.teacherId === teacher.id && row.subjectId === subjectId && row.section === section,
  );

  if (!owns) {
    throw HttpError.forbidden(
      `${subject.code} section ${section} is not assigned to you. Ask an administrator if this is wrong.`,
    );
  }

  return subject;
}

/** Students in a class: same department and semester as the subject, same section. */
function rosterFor(subject: SubjectRow, section: string): StudentRow[] {
  return getDb()
    .students.filter(
      (student) =>
        student.department === subject.department &&
        student.semester === subject.semester &&
        student.section === section,
    )
    .sort((a, b) => a.rollNo.localeCompare(b.rollNo));
}

/** Resolves the class a student sits in for a subject, then checks ownership. */
function assertOwnsStudent(
  teacher: TeacherRow,
  subjectId: string,
  studentId: string,
): {
  subject: SubjectRow;
  student: StudentRow;
} {
  const student = getDb().students.find((row) => row.id === studentId);
  if (!student) throw HttpError.notFound('Student not found.');

  const subject = assertOwnsClass(teacher, subjectId, student.section);

  if (student.department !== subject.department) {
    throw HttpError.forbidden(
      `${student.rollNo} is not in the department that studies ${subject.code}.`,
    );
  }

  return { subject, student };
}

// --- My classes --------------------------------------------------------------

export interface TeacherClass {
  assignmentId: string;
  subjectId: string;
  code: string;
  name: string;
  department: string;
  semester: number;
  section: string;
  credits: number;
  internalMax: number;
  externalMax: number;
  studentCount: number;
  /** Whether attendance has already been recorded for this class today. */
  markedToday: boolean;
}

export function getClasses(user: AuthenticatedUser): TeacherClass[] {
  const teacher = teacherFor(user);
  const db = getDb();
  const date = today();

  return db.teacherAssignments
    .filter((assignment) => assignment.teacherId === teacher.id)
    .flatMap((assignment) => {
      const subject = db.subjects.find((row) => row.id === assignment.subjectId);
      if (!subject) return []; // Orphaned assignment — a deleted subject must not 500 the page.

      const roster = rosterFor(subject, assignment.section);

      return [
        {
          assignmentId: assignment.id,
          subjectId: subject.id,
          code: subject.code,
          name: subject.name,
          department: subject.department,
          semester: subject.semester,
          section: assignment.section,
          credits: subject.credits,
          internalMax: subject.internalMax,
          externalMax: subject.externalMax,
          studentCount: roster.length,
          markedToday: db.attendance.some(
            (row) =>
              row.subjectId === subject.id &&
              row.date === date &&
              roster.some((student) => student.id === row.studentId),
          ),
        },
      ];
    })
    .sort((a, b) => a.code.localeCompare(b.code) || a.section.localeCompare(b.section));
}

// --- Dashboard ---------------------------------------------------------------

export interface TeacherActivity {
  id: string;
  action: string;
  at: string;
  studentName: string;
  rollNo: string;
  summary: string;
}

export interface TeacherDashboard {
  teacher: { name: string; staffId: string; department: string; designation: string };
  date: string;
  classCount: number;
  subjectCount: number;
  studentCount: number;
  /** Classes with no attendance recorded for today — the actual to-do list. */
  unmarkedToday: TeacherClass[];
  recentActivity: TeacherActivity[];
}

export function getDashboard(user: AuthenticatedUser): TeacherDashboard {
  const teacher = teacherFor(user);
  const classes = getClasses(user);
  const db = getDb();

  const students = new Set<string>();
  for (const entry of classes) {
    const subject = db.subjects.find((row) => row.id === entry.subjectId);
    if (!subject) continue;
    for (const student of rosterFor(subject, entry.section)) students.add(student.id);
  }

  const recentActivity: TeacherActivity[] = recentAudits(user.id, 8).map((row) => {
    const student = db.students.find((entry) => entry.id === row.studentId);

    return {
      id: row.id,
      action: row.action,
      at: row.at,
      studentName: student?.name ?? 'Unknown student',
      rollNo: student?.rollNo ?? '—',
      summary: describeAudit(row.action, row.before, row.after),
    };
  });

  return {
    teacher: {
      name: teacher.name,
      staffId: teacher.staffId,
      department: teacher.department,
      designation: teacher.designation,
    },
    date: today(),
    classCount: classes.length,
    subjectCount: new Set(classes.map((entry) => entry.subjectId)).size,
    studentCount: students.size,
    unmarkedToday: classes.filter((entry) => !entry.markedToday),
    recentActivity,
  };
}

function describeAudit(
  action: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
): string {
  if (action.startsWith('attendance')) {
    const to = String(after.status ?? '');
    return before ? `Attendance changed from ${String(before.status)} to ${to}` : `Marked ${to}`;
  }

  const total = `${String(after.internal)} + ${String(after.external)}`;
  return before
    ? `Marks changed from ${String(before.internal)} + ${String(before.external)} to ${total}`
    : `Marks entered: ${total}`;
}

// --- Attendance --------------------------------------------------------------

export interface RosterEntry {
  studentId: string;
  rollNo: string;
  name: string;
  /** The existing row for this date, if the class has already been marked. */
  attendanceId: string | null;
  status: 'present' | 'absent' | null;
  /** Percentage in this subject so far, so a teacher sees who is at risk. */
  percentage: number;
  held: number;
  attended: number;
}

export interface ClassAttendance {
  subject: { id: string; code: string; name: string; semester: number };
  section: string;
  date: string;
  /** True once any row exists for this class and date — the page switches to edit mode. */
  alreadyMarked: boolean;
  earliestDate: string;
  latestDate: string;
  roster: RosterEntry[];
}

/** Rejects dates outside the editable window. Returns nothing; throws on failure. */
function assertDateInWindow(date: string): void {
  const now = today();
  if (date > now) throw HttpError.badRequest('Attendance cannot be marked for a future date.');

  const earliest = new Date(Date.parse(`${now}T00:00:00Z`) - ATTENDANCE_BACKDATE_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);

  if (date < earliest) {
    throw HttpError.badRequest(
      `Attendance can only be marked up to ${ATTENDANCE_BACKDATE_DAYS} days back (from ${earliest}). Ask an administrator to correct anything older.`,
    );
  }
}

export function getClassAttendance(
  user: AuthenticatedUser,
  subjectId: string,
  section: string,
  date: string,
): ClassAttendance {
  const teacher = teacherFor(user);
  const subject = assertOwnsClass(teacher, subjectId, section);
  const roster = rosterFor(subject, section);
  const rows = getDb().attendance.filter((row) => row.subjectId === subjectId);

  const now = today();
  const earliest = new Date(Date.parse(`${now}T00:00:00Z`) - ATTENDANCE_BACKDATE_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);

  const entries: RosterEntry[] = roster.map((student) => {
    const forStudent = rows.filter((row) => row.studentId === student.id);
    const onDate = forStudent.find((row) => row.date === date);
    const attended = forStudent.filter((row) => row.status === 'present').length;

    return {
      studentId: student.id,
      rollNo: student.rollNo,
      name: student.name,
      attendanceId: onDate?.id ?? null,
      status: onDate?.status ?? null,
      held: forStudent.length,
      attended,
      percentage:
        forStudent.length === 0 ? 0 : Math.round((attended / forStudent.length) * 1000) / 10,
    };
  });

  return {
    subject: { id: subject.id, code: subject.code, name: subject.name, semester: subject.semester },
    section,
    date,
    alreadyMarked: entries.some((entry) => entry.attendanceId !== null),
    earliestDate: earliest,
    latestDate: now,
    roster: entries,
  };
}

export interface BulkAttendanceResult {
  created: number;
  date: string;
}

/**
 * Writes one row per student for a (subject, date). The uniqueness of
 * `(studentId, subjectId, date)` is checked here **before anything is written**,
 * so a partially-applied batch is impossible — the whole submission either lands
 * or is rejected with a 409 naming the students already marked.
 */
export async function markAttendanceBulk(
  user: AuthenticatedUser,
  input: BulkAttendanceInput,
): Promise<BulkAttendanceResult> {
  const teacher = teacherFor(user);
  const subject = assertOwnsClass(teacher, input.subjectId, input.section);
  assertDateInWindow(input.date);

  const db = getDb();
  const roster = rosterFor(subject, input.section);
  const rosterIds = new Set(roster.map((student) => student.id));

  const strangers = input.entries.filter((entry) => !rosterIds.has(entry.studentId));
  if (strangers.length > 0) {
    throw HttpError.forbidden(
      `${strangers.length} of the submitted students are not in ${subject.code} section ${input.section}.`,
    );
  }

  const existing = db.attendance.filter(
    (row) =>
      row.subjectId === input.subjectId && row.date === input.date && rosterIds.has(row.studentId),
  );

  if (existing.length > 0) {
    const names = existing
      .map((row) => roster.find((student) => student.id === row.studentId)?.rollNo ?? row.studentId)
      .sort()
      .join(', ');

    throw HttpError.conflict(
      `${subject.code} section ${input.section} was already marked for ${input.date} (${names}). Edit the existing entries instead of submitting again.`,
    );
  }

  const rows: AttendanceRow[] = input.entries.map((entry) => ({
    id: `att-${entry.studentId}-${subject.code.toLowerCase()}-${input.date}`,
    studentId: entry.studentId,
    subjectId: input.subjectId,
    date: input.date,
    status: entry.status,
    markedBy: user.id,
  }));

  db.attendance.push(...rows);

  for (const row of rows) {
    recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'attendance.create',
      entity: 'attendance',
      entityId: row.id,
      studentId: row.studentId,
      before: null,
      after: { subjectId: row.subjectId, date: row.date, status: row.status },
    });
  }

  await persist();
  return { created: rows.length, date: input.date };
}

export async function updateAttendance(
  user: AuthenticatedUser,
  attendanceId: string,
  status: 'present' | 'absent',
): Promise<AttendanceRow> {
  const teacher = teacherFor(user);
  const row = getDb().attendance.find((entry) => entry.id === attendanceId);
  if (!row) throw HttpError.notFound('Attendance record not found.');

  assertOwnsStudent(teacher, row.subjectId, row.studentId);
  assertDateInWindow(row.date);

  const before = { status: row.status };
  row.status = status;
  row.markedBy = user.id;

  recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'attendance.update',
    entity: 'attendance',
    entityId: row.id,
    studentId: row.studentId,
    before,
    after: { subjectId: row.subjectId, date: row.date, status },
  });

  await persist();
  return row;
}

// --- Marks -------------------------------------------------------------------

export interface MarksGridRow {
  studentId: string;
  rollNo: string;
  name: string;
  /** Null when nothing has been entered for this student yet. */
  markId: string | null;
  internal: number | null;
  external: number | null;
  total: number | null;
  grade: string | null;
}

export interface ClassMarks {
  subject: {
    id: string;
    code: string;
    name: string;
    semester: number;
    credits: number;
    internalMax: number;
    externalMax: number;
  };
  section: string;
  rows: MarksGridRow[];
}

export function getClassMarks(
  user: AuthenticatedUser,
  subjectId: string,
  section: string,
): ClassMarks {
  const teacher = teacherFor(user);
  const subject = assertOwnsClass(teacher, subjectId, section);
  const marks = getDb().marks.filter((row) => row.subjectId === subjectId);

  const rows: MarksGridRow[] = rosterFor(subject, section).map((student) => {
    const mark = marks.find((row) => row.studentId === student.id);

    if (!mark) {
      return {
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.name,
        markId: null,
        internal: null,
        external: null,
        total: null,
        grade: null,
      };
    }

    const total = mark.internal + mark.external;
    const totalMax = subject.internalMax + subject.externalMax;

    return {
      studentId: student.id,
      rollNo: student.rollNo,
      name: student.name,
      markId: mark.id,
      internal: mark.internal,
      external: mark.external,
      total,
      grade: gradeFor((total / totalMax) * 100).grade,
    };
  });

  return {
    subject: {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      semester: subject.semester,
      credits: subject.credits,
      internalMax: subject.internalMax,
      externalMax: subject.externalMax,
    },
    section,
    rows,
  };
}

/** The per-subject ceiling. Kept out of the zod schema because it is data, not shape. */
function assertWithinMax(subject: SubjectRow, internal: number, external: number): void {
  if (internal > subject.internalMax) {
    throw HttpError.badRequest(
      `Internal marks for ${subject.code} cannot exceed ${subject.internalMax}. Received ${internal}.`,
    );
  }

  if (external > subject.externalMax) {
    throw HttpError.badRequest(
      `External marks for ${subject.code} cannot exceed ${subject.externalMax}. Received ${external}.`,
    );
  }
}

export async function createMark(
  user: AuthenticatedUser,
  input: MarksEntryInput,
): Promise<MarkRow> {
  const teacher = teacherFor(user);
  const { subject, student } = assertOwnsStudent(teacher, input.subjectId, input.studentId);
  assertWithinMax(subject, input.internal, input.external);

  const db = getDb();

  const clash = db.marks.find(
    (row) => row.studentId === input.studentId && row.subjectId === input.subjectId,
  );

  if (clash) {
    throw HttpError.conflict(
      `${student.rollNo} already has marks for ${subject.code}. Edit the existing entry instead.`,
    );
  }

  const row: MarkRow = {
    id: `mrk-${input.studentId}-${subject.code.toLowerCase()}`,
    studentId: input.studentId,
    subjectId: input.subjectId,
    semester: subject.semester,
    internal: input.internal,
    external: input.external,
  };

  db.marks.push(row);

  recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'marks.create',
    entity: 'marks',
    entityId: row.id,
    studentId: row.studentId,
    before: null,
    after: { subjectId: row.subjectId, internal: row.internal, external: row.external },
  });

  // Marks feed the Academic dimension — the stored OAA is now stale.
  await recomputeStudent(input.studentId);
  return row;
}

export async function updateMark(
  user: AuthenticatedUser,
  markId: string,
  input: MarksUpdateInput,
): Promise<MarkRow> {
  const teacher = teacherFor(user);
  const row = getDb().marks.find((entry) => entry.id === markId);
  if (!row) throw HttpError.notFound('Marks record not found.');

  const { subject } = assertOwnsStudent(teacher, row.subjectId, row.studentId);
  assertWithinMax(subject, input.internal, input.external);

  const before = { internal: row.internal, external: row.external };
  row.internal = input.internal;
  row.external = input.external;

  recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'marks.update',
    entity: 'marks',
    entityId: row.id,
    studentId: row.studentId,
    before,
    after: { subjectId: row.subjectId, internal: row.internal, external: row.external },
  });

  await recomputeStudent(row.studentId);
  return row;
}

// --- Adaptability and social records (OAA inputs) ----------------------------

/**
 * A teacher may assess any student they teach — the check is the same class
 * ownership rule as marks, applied across all of their subjects rather than one.
 */
function assertTeachesStudent(teacher: TeacherRow, studentId: string): StudentRow {
  const db = getDb();

  const student = db.students.find((row) => row.id === studentId);
  if (!student) throw HttpError.notFound('Student not found.');

  const teaches = db.teacherAssignments.some((assignment) => {
    if (assignment.teacherId !== teacher.id) return false;
    if (assignment.section !== student.section) return false;

    const subject = db.subjects.find((row) => row.id === assignment.subjectId);
    return subject?.department === student.department && subject.semester === student.semester;
  });

  if (!teaches) {
    throw HttpError.forbidden(
      `${student.rollNo} is not in any class assigned to you, so you cannot record an assessment for them.`,
    );
  }

  return student;
}

/**
 * Records an adaptability rating. One assessment per teacher, per student, per
 * semester — re-submitting replaces the teacher's own previous rating rather than
 * stacking a second one, so a correction does not double-weight their opinion.
 */
export async function recordAdaptability(
  user: AuthenticatedUser,
  input: AdaptabilityInput,
): Promise<AdaptabilityAssessmentRow> {
  const teacher = teacherFor(user);
  const student = assertTeachesStudent(teacher, input.studentId);

  const db = getDb();
  const id = `adp-${student.id}-${teacher.id}-s${input.semester}`;
  const existing = db.adaptabilityAssessments.find((row) => row.id === id);

  const row: AdaptabilityAssessmentRow = {
    id,
    studentId: student.id,
    teacherId: teacher.id,
    semester: input.semester,
    scores: input.scores,
    note: input.note,
    recordedAt: new Date().toISOString(),
  };

  if (existing) Object.assign(existing, row);
  else db.adaptabilityAssessments.push(row);

  recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: existing ? 'adaptability.update' : 'adaptability.create',
    entity: 'adaptability',
    entityId: id,
    studentId: student.id,
    before: existing ? { scores: existing.scores } : null,
    after: { semester: input.semester, scores: input.scores },
  });

  // The rating is an OAA input, so the score it feeds is now stale.
  await recomputeStudent(student.id);
  return row;
}

export async function recordSocial(
  user: AuthenticatedUser,
  input: SocialRecordInput,
): Promise<SocialRecordRow> {
  const teacher = teacherFor(user);
  const student = assertTeachesStudent(teacher, input.studentId);

  const db = getDb();
  const row: SocialRecordRow = {
    id: `soc-${student.id}-s${input.semester}-${Date.now().toString(36)}`,
    studentId: student.id,
    semester: input.semester,
    activity: input.activity,
    label: input.label,
    points: input.points,
    recordedBy: user.id,
    recordedAt: new Date().toISOString(),
  };

  db.socialRecords.push(row);

  recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'social.create',
    entity: 'social',
    entityId: row.id,
    studentId: student.id,
    before: null,
    after: { activity: row.activity, label: row.label, points: row.points },
  });

  await recomputeStudent(student.id);
  return row;
}

/** What the assessments page needs: the roster plus each student's current rating. */
export interface AssessableStudent {
  studentId: string;
  rollNo: string;
  name: string;
  section: string;
  semester: number;
  /** This teacher's own existing rating, if they have made one. */
  scores: Record<AdaptabilityCriterion, number> | null;
  note: string;
  recordedAt: string | null;
  socialPoints: number;
  socialRecords: { id: string; label: string; activity: string; points: number }[];
}

export function getAssessableStudents(
  user: AuthenticatedUser,
  semester: number,
): AssessableStudent[] {
  const teacher = teacherFor(user);
  const db = getDb();

  const reachable = new Map<string, StudentRow>();

  for (const assignment of db.teacherAssignments) {
    if (assignment.teacherId !== teacher.id) continue;

    const subject = db.subjects.find((row) => row.id === assignment.subjectId);
    if (!subject) continue;

    for (const student of rosterFor(subject, assignment.section)) {
      reachable.set(student.id, student);
    }
  }

  return [...reachable.values()]
    .sort((a, b) => a.rollNo.localeCompare(b.rollNo))
    .map((student) => {
      const assessment = db.adaptabilityAssessments.find(
        (row) =>
          row.studentId === student.id && row.teacherId === teacher.id && row.semester === semester,
      );

      const social = db.socialRecords.filter(
        (row) => row.studentId === student.id && row.semester === semester,
      );

      return {
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.name,
        section: student.section,
        semester: student.semester,
        scores: assessment?.scores ?? null,
        note: assessment?.note ?? '',
        recordedAt: assessment?.recordedAt ?? null,
        socialPoints: social.reduce((sum, row) => sum + row.points, 0),
        socialRecords: social.map((row) => ({
          id: row.id,
          label: row.label,
          activity: row.activity,
          points: row.points,
        })),
      };
    });
}

// --- Student search ----------------------------------------------------------

export interface TeacherStudentResult {
  id: string;
  rollNo: string;
  name: string;
  department: string;
  semester: number;
  section: string;
  email: string;
  /** The classes of this teacher's that the student sits in. */
  subjects: string[];
}

/**
 * Only students in classes assigned to this teacher — `docs/03-teacher-module.md`.
 * The filter is applied to the candidate set, never to the authorisation, so an
 * empty filter widens the results to their own students and no further.
 */
export function searchStudents(
  user: AuthenticatedUser,
  filters: StudentSearchInput,
): TeacherStudentResult[] {
  const teacher = teacherFor(user);
  const db = getDb();

  /** studentId → the subject codes this teacher teaches them. */
  const reachable = new Map<string, Set<string>>();

  for (const assignment of db.teacherAssignments) {
    if (assignment.teacherId !== teacher.id) continue;
    if (filters.subjectId && assignment.subjectId !== filters.subjectId) continue;
    if (filters.section && assignment.section !== filters.section) continue;

    const subject = db.subjects.find((row) => row.id === assignment.subjectId);
    if (!subject) continue;

    for (const student of rosterFor(subject, assignment.section)) {
      const codes = reachable.get(student.id) ?? new Set<string>();
      codes.add(subject.code);
      reachable.set(student.id, codes);
    }
  }

  const needle = filters.q?.toLowerCase();

  return db.students
    .filter((student) => reachable.has(student.id))
    .filter((student) => (filters.semester ? student.semester === filters.semester : true))
    .filter((student) =>
      needle
        ? student.rollNo.toLowerCase().includes(needle) ||
          student.name.toLowerCase().includes(needle)
        : true,
    )
    .map((student) => ({
      id: student.id,
      rollNo: student.rollNo,
      name: student.name,
      department: student.department,
      semester: student.semester,
      section: student.section,
      email: student.email,
      subjects: [...(reachable.get(student.id) ?? [])].sort(),
    }))
    .sort((a, b) => a.rollNo.localeCompare(b.rollNo));
}
