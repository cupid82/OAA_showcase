export type Role = 'student' | 'teacher' | 'admin';

export const ROLES: Role[] = ['student', 'teacher', 'admin'];

export interface User {
  id: string;
  /** Roll number for students, staff ID for teachers and admins. */
  loginId: string;
  name: string;
  role: Role;
  department?: string;
}

/** Wire shape of a failed response. The thrown error class lives in lib/api.ts. */
export interface ApiErrorResponse {
  error: { message: string; details?: Record<string, string[]> };
}

export interface AuthSession {
  token: string;
  user: User;
}

/**
 * Student read models — these mirror the shapes returned by
 * `backend/src/services/student.service.ts`. Keep the two in step.
 */

export interface StudentProfile {
  id: string;
  rollNo: string;
  name: string;
  dob: string;
  gender: string;
  department: string;
  semester: number;
  /** Derived from the semester on the server. */
  year: number;
  section: string;
  admissionYear: number;
  bloodGroup: string;
  email: string;
  phone: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  photoUrl: string | null;
}

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
  sgpa: number | null;
}

export interface MarksSummary {
  currentSemester: number;
  semesters: SemesterMarks[];
  cgpa: number | null;
}

export interface AttendanceSlice {
  held: number;
  attended: number;
  percentage: number;
}

export interface SubjectAttendance extends AttendanceSlice {
  subjectId: string;
  code: string;
  name: string;
  belowThreshold: boolean;
}

export interface MonthlyAttendance extends AttendanceSlice {
  month: string;
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
  recentAbsences: AbsenceRecord[];
}
