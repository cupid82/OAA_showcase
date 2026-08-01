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

export interface TeacherRow {
  id: string;
  userId: string;
  /** Staff ID, e.g. `TCH01`. Matches the user's loginId. */
  staffId: string;
  name: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
}

/**
 * One class a teacher owns: a subject taught to one section.
 *
 * This is the whole authorisation model for the teacher write path — a teacher may
 * only mark attendance or enter marks for a (subject, section) pair listed here.
 * `(teacherId, subjectId, section)` is unique.
 */
export interface TeacherAssignmentRow {
  id: string;
  teacherId: string;
  subjectId: string;
  section: string;
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

/**
 * The seven teacher-rated adaptability sub-criteria, each scored 1–5.
 *
 * ⚠️ Invented during the Step 7 build — `docs/07-oaa-spec.md` left them as TODO.
 * They are a working default, not the college's rubric. Changing this list changes
 * the Adaptability dimension for every student, so change it deliberately.
 */
export const ADAPTABILITY_CRITERIA = [
  'communication',
  'teamwork',
  'problemSolving',
  'initiative',
  'resilience',
  'timeManagement',
  'leadership',
] as const;

export type AdaptabilityCriterion = (typeof ADAPTABILITY_CRITERIA)[number];

/** One teacher's rating of one student, for one semester. 1–5 per criterion. */
export interface AdaptabilityAssessmentRow {
  id: string;
  studentId: string;
  teacherId: string;
  semester: number;
  scores: Record<AdaptabilityCriterion, number>;
  note: string;
  recordedAt: string;
}

export type PhysicalActivity = 'fitnessTest' | 'sport' | 'peAttendance' | 'tournament';

/** Points are awarded per record and capped at 100 — see `lib/oaa.ts`. */
export interface PhysicalRecordRow {
  id: string;
  studentId: string;
  semester: number;
  activity: PhysicalActivity;
  label: string;
  points: number;
  recordedAt: string;
}

export type SocialActivity = 'event' | 'volunteering' | 'club' | 'mentoring' | 'outreach';

export interface SocialRecordRow {
  id: string;
  studentId: string;
  semester: number;
  activity: SocialActivity;
  label: string;
  points: number;
  recordedBy: string;
  recordedAt: string;
}

/**
 * A stored OAA result. Recomputed on writes to its inputs and read from here —
 * never recalculated on page load, per the spec's recompute strategy.
 */
export interface OaaScoreRow {
  id: string;
  studentId: string;
  semester: number;
  academic: number | null;
  adaptability: number | null;
  physical: number | null;
  social: number | null;
  /** Null when no dimension has data at all. Never silently 0. */
  score: number | null;
  grade: string | null;
  computedAt: string;
}

/**
 * One period in the weekly grid. `(department, semester, section, day, period)`
 * is unique — a class cannot be in two rooms at once.
 */
export interface TimetableSlotRow {
  id: string;
  department: string;
  semester: number;
  section: string;
  /** 1 = Monday … 5 = Friday. The week has no weekend teaching. */
  day: number;
  /** 1-indexed period within the day. */
  period: number;
  subjectId: string;
  teacherId: string;
  room: string;
}

export type AnnouncementCategory = 'academic' | 'examination' | 'event' | 'general' | 'urgent';

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  /** `all`, or scoped to one department, or to one semester within it. */
  audience: 'all' | 'department' | 'semester';
  department: string | null;
  semester: number | null;
  postedBy: string;
  postedAt: string;
  pinned: boolean;
}

export type EventType = 'technical' | 'workshop' | 'sports' | 'social' | 'cultural';

export interface EventRow {
  id: string;
  title: string;
  description: string;
  type: EventType;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  time: string;
  venue: string;
  capacity: number;
  organiser: string;
  /** Points awarded to the Social dimension for attending. */
  socialPoints: number;
}

export interface EventRegistrationRow {
  id: string;
  eventId: string;
  studentId: string;
  registeredAt: string;
}

export type SubmissionStatus = 'submitted' | 'graded' | 'late' | 'pending';

export interface AssignmentRow {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  /** ISO date. */
  dueDate: string;
  maxMarks: number;
  teacherId: string;
  postedAt: string;
}

export interface AssignmentSubmissionRow {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string | null;
  status: SubmissionStatus;
  marks: number | null;
  feedback: string;
}

/**
 * Institute-wide configuration. One row, id `singleton`.
 *
 * The OAA weights live here rather than in code because the admin module promises
 * configurable weights — `lib/oaa.ts` must never hardcode the 0.5 social weight.
 */
export interface SettingsRow {
  id: 'singleton';
  academicYear: string;
  currentSemester: number;
  attendanceThreshold: number;
  oaaWeights: {
    academic: number;
    adaptability: number;
    physical: number;
    social: number;
  };
}

/**
 * An append-only record of every staff write. Nothing here is ever updated or
 * deleted — a correction is a new row, which is what makes the trail trustworthy.
 */
export interface AuditLogRow {
  id: string;
  /** The user id of whoever performed the action, plus their role at the time. */
  actorId: string;
  actorRole: Role;
  /** Verb + entity, e.g. `attendance.update`, `marks.create`. */
  action: string;
  /** The row that changed, so the trail can be filtered per record. */
  entity: 'attendance' | 'marks' | 'adaptability' | 'social';
  entityId: string;
  /** Which student the change was about — the question most often asked of a log. */
  studentId: string;
  /** Field-level before/after. `null` on a create. */
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  at: string;
}

/** The whole database, as one JSON document. */
export interface Database {
  users: UserRow[];
  students: StudentRow[];
  teachers: TeacherRow[];
  teacherAssignments: TeacherAssignmentRow[];
  subjects: SubjectRow[];
  marks: MarkRow[];
  attendance: AttendanceRow[];
  adaptabilityAssessments: AdaptabilityAssessmentRow[];
  physicalRecords: PhysicalRecordRow[];
  socialRecords: SocialRecordRow[];
  oaaScores: OaaScoreRow[];
  timetable: TimetableSlotRow[];
  announcements: AnnouncementRow[];
  events: EventRow[];
  eventRegistrations: EventRegistrationRow[];
  assignments: AssignmentRow[];
  submissions: AssignmentSubmissionRow[];
  settings: SettingsRow;
  auditLogs: AuditLogRow[];
}
