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

/**
 * Teacher read models — these mirror the shapes returned by
 * `backend/src/services/teacher.service.ts`. Keep the two in step.
 */

export type AttendanceStatus = 'present' | 'absent';

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
  markedToday: boolean;
}

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
  unmarkedToday: TeacherClass[];
  recentActivity: TeacherActivity[];
}

export interface RosterEntry {
  studentId: string;
  rollNo: string;
  name: string;
  /** Non-null once this class has been marked for the chosen date. */
  attendanceId: string | null;
  status: AttendanceStatus | null;
  percentage: number;
  held: number;
  attended: number;
}

export interface ClassAttendance {
  subject: { id: string; code: string; name: string; semester: number };
  section: string;
  date: string;
  alreadyMarked: boolean;
  /** Editable window, inclusive — the date input is clamped to it. */
  earliestDate: string;
  latestDate: string;
  roster: RosterEntry[];
}

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

/**
 * OAA read models — these mirror `backend/src/services/oaa.service.ts`.
 * A `null` dimension means "not measured" and must never be drawn as a zero.
 */

export type OaaDimension = 'academic' | 'adaptability' | 'physical' | 'social';

export interface DimensionBreakdown {
  key: OaaDimension;
  label: string;
  value: number | null;
  weight: number;
  cohort: number | null;
}

export interface ContributingRecord {
  label: string;
  activity: string;
  points: number;
}

export interface TrendPoint {
  semester: number;
  score: number | null;
  grade: string | null;
}

export interface OaaSummary {
  semester: number;
  score: number | null;
  grade: string | null;
  label: string | null;
  computedAt: string;
  /** Sum of the weights actually used — 3.5 when all four dimensions are present. */
  divisor: number;
  dimensions: DimensionBreakdown[];
  missing: OaaDimension[];
  strongest: { key: OaaDimension; label: string; value: number } | null;
  weakest: { key: OaaDimension; label: string; value: number; advice: string } | null;
  trend: TrendPoint[];
  physicalRecords: ContributingRecord[];
  socialRecords: ContributingRecord[];
  adaptabilityRatings: { criterion: string; score: number }[];
  ratingScale: { min: number; max: number };
  weights: Record<OaaDimension, number>;
  cohortSize: number;
}

/** Leaderboard, timetable, announcements, events and assignments read models. */

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
  isYou: boolean;
}

export interface Leaderboard {
  scope: LeaderboardScope;
  category: LeaderboardCategory;
  label: string;
  within: string;
  rows: LeaderboardRow[];
  you: LeaderboardRow | null;
  total: number;
}

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
  periodNumbers: number[];
  periodTimes: string[];
  days: TimetableDay[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  postedBy: string;
  postedAt: string;
  pinned: boolean;
}

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
  upcoming: boolean;
  full: boolean;
}

export type SubmissionStatus = 'submitted' | 'graded' | 'late' | 'pending';

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
  overdue: boolean;
}

export interface AssignmentsSummary {
  assignments: StudentAssignment[];
  pending: number;
  overdue: number;
  graded: number;
}

export interface AssessableStudent {
  studentId: string;
  rollNo: string;
  name: string;
  section: string;
  semester: number;
  scores: Record<string, number> | null;
  note: string;
  recordedAt: string | null;
  socialPoints: number;
  socialRecords: { id: string; label: string; activity: string; points: number }[];
}

export interface TeacherStudentResult {
  id: string;
  rollNo: string;
  name: string;
  department: string;
  semester: number;
  section: string;
  email: string;
  subjects: string[];
}
