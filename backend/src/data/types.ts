/**
 * Domain entities for the file-backed store.
 *
 * These are deliberately shaped like relational rows — string ids, foreign keys,
 * no nesting — so that swapping the store for Prisma later is a change of
 * `data/store.ts` and the service queries, not of the domain model.
 */

export type Role = 'student' | 'teacher' | 'admin';

/** Credentials only. Never send this to the client — map it through a service. */
export interface UserRow {
  id: string;
  /** Roll number for students, staff ID for teachers and admins. Unique, case-insensitive. */
  loginId: string;
  role: Role;
  name: string;
  /** bcrypt hash, cost 10. A plaintext password is never stored. */
  passwordHash: string;
  createdAt: string;
}

export interface StudentRow {
  id: string;
  userId: string;
  rollNo: string;
  name: string;
  /** ISO date, `YYYY-MM-DD`. */
  dob: string;
  gender: string;
  department: string;
  /** Current semester, 1–8. */
  semester: number;
  section: string;
  admissionYear: number;
  bloodGroup: string;
  email: string;
  phone: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  /** Null until file upload exists — the UI falls back to initials. */
  photoUrl: string | null;
}

export interface SubjectRow {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  internalMax: number;
  externalMax: number;
}

export interface MarkRow {
  id: string;
  studentId: string;
  subjectId: string;
  /** Denormalised so a student's history survives a subject moving semester. */
  semester: number;
  internal: number;
  external: number;
}

export type AttendanceStatus = 'present' | 'absent';

/**
 * One row per student, per subject, per date — never a running counter.
 * `(studentId, subjectId, date)` is unique; the store enforces it.
 */
export interface AttendanceRow {
  id: string;
  studentId: string;
  subjectId: string;
  /** ISO date, `YYYY-MM-DD`. No time component — a day is the unit. */
  date: string;
  status: AttendanceStatus;
  markedBy: string;
}

/** The whole database, as one JSON document. */
export interface Database {
  users: UserRow[];
  students: StudentRow[];
  subjects: SubjectRow[];
  marks: MarkRow[];
  attendance: AttendanceRow[];
}
