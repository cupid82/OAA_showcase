/**
 * Domain entities.
 *
 * OAA is the student's growth layer, not a second ERP: marks, attendance, fees and
 * timetables stay in the college's system of record. What lives here is what the
 * student creates — projects, skills and their evidence, the opportunities they
 * track, their check-ins and their connected accounts.
 *
 * Rows are shaped like relational rows — string ids, foreign keys, very little
 * nesting. Each table maps one-to-one onto a Postgres table in `data/schema.ts`;
 * the JSON file and Supabase Postgres store exactly the same shapes.
 */

export type Role = 'student' | 'admin';

/**
 * Bumped whenever a table is added, removed or reshaped. The JSON store sets an
 * older file aside; the Postgres store refuses to start against an older schema.
 */
export const SCHEMA_VERSION = 3;

export interface MetaRow {
  id: 'singleton';
  schemaVersion: number;
  seededAt: string;
}

/** Credentials only. Never send this to the client — map it through a service. */
export interface UserRow {
  id: string;
  /**
   * Roll number for seeded students, staff ID for seeded admins, the email address
   * for anyone who joined with Google. Unique, case-insensitive.
   */
  loginId: string;
  role: Role;
  name: string;
  /** Lowercase. How a Google sign-in finds an existing account. */
  email: string | null;
  /** The Supabase Auth user id, once this account has signed in with Google. */
  authId: string | null;
  /** bcrypt hash, cost 10. Null for Google-only accounts. Never plaintext. */
  passwordHash: string | null;
  createdAt: string;
}

/**
 * What a student is looking for. Event types and job kinds both map onto these,
 * so one "interested in hackathons" answer can steer both lists.
 */
export const INTERESTS = [
  'internships',
  'jobs',
  'hackathons',
  'workshops',
  'contests',
  'meetups',
  'research',
  'fellowships',
] as const;

export type Interest = (typeof INTERESTS)[number];

export interface StudentRow {
  id: string;
  userId: string;
  /*
   * These come from the college's records and are read-only in OAA, and
   * `recordsSyncedAt` is shown next to them — ERP-derived data always says where
   * it came from and when. A student who joined with Google has no college record
   * yet: `recordsSyncedAt` is null, the details are self-reported at onboarding,
   * and they can correct them in Settings.
   */
  rollNo: string | null;
  name: string;
  department: string | null;
  /** Year of study, 1–4. */
  year: number | null;
  recordsSyncedAt: string | null;

  email: string;
  /** Public portfolio address, `/p/<handle>`. Lowercase, unique. */
  handle: string;
  headline: string;
  bio: string;
  /** The goal the student is working towards. Null until they pick one. */
  trackId: string | null;
  interests: Interest[];
  /** Hours a week the student wants to give to projects and learning. */
  weeklyHours: number | null;
  /** Null until onboarding is finished — the app routes there first. */
  onboardedAt: string | null;
  createdAt: string;
}

export const NOTIFICATION_CATEGORIES = [
  'opportunities',
  'events',
  'projects',
  'wellbeing',
  'reminders',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/** One row per student. Every choice here is editable from Settings. */
export interface PreferencesRow {
  id: string;
  studentId: string;
  /** In-app notifications, per category. Off means the item is never created. */
  notify: Record<NotificationCategory, boolean>;
  /** Email is an optional digest channel, never the product's source of state. */
  emailDigest: 'off' | 'weekly';
  /** Off by default: nobody is ranked in public without choosing to be. */
  leaderboardVisible: boolean;
  /** Off by default: nothing is published without the student turning it on. */
  portfolioPublic: boolean;
  /** Non-urgent nudges are held back until this instant. Set from the Burnout page. */
  snoozeUntil: string | null;
}

// --- Catalogue ----------------------------------------------------------------

export type SkillCategory =
  'language' | 'frontend' | 'backend' | 'data' | 'devops' | 'design' | 'core' | 'professional';

export interface SkillRow {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  /** One good free place to learn it. Null where no single link is honest. */
  resourceUrl: string | null;
  resourceLabel: string | null;
}

export type TrackStage = 'foundation' | 'core' | 'advanced';

/** A goal a student can work towards, and the skill path that leads there. */
export interface TrackRow {
  id: string;
  name: string;
  summary: string;
  skills: { skillId: string; stage: TrackStage; why: string }[];
}

// --- Skills and their evidence --------------------------------------------------

/** What the student says. Proof is derived separately, from evidence. */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface StudentSkillRow {
  id: string;
  studentId: string;
  skillId: string;
  level: SkillLevel;
  addedAt: string;
  updatedAt: string;
}

/** Time spent practising one skill on one day. */
export interface PracticeLogRow {
  id: string;
  studentId: string;
  skillId: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  minutes: number;
  note: string;
  createdAt: string;
}

export interface CertificateRow {
  id: string;
  studentId: string;
  title: string;
  issuer: string;
  /** ISO date. */
  issuedOn: string;
  url: string | null;
  skillIds: string[];
  showOnPortfolio: boolean;
  createdAt: string;
}

// --- Projects -----------------------------------------------------------------

export type ProjectStatus = 'idea' | 'building' | 'shipped' | 'paused';

/** `campus` is every signed-in student; `public` adds the portfolio page. */
export type Visibility = 'private' | 'campus' | 'public';

export interface ProjectRow {
  id: string;
  ownerId: string;
  title: string;
  /** One line — what it is. */
  tagline: string;
  /** What problem it solves, for whom. The heart of the project's story. */
  problem: string;
  /** What the student personally did. */
  role: string;
  /** What happened — users, results, what was learned. */
  outcome: string;
  status: ProjectStatus;
  skillIds: string[];
  repoUrl: string | null;
  demoUrl: string | null;
  visibility: Visibility;
  openToCollaborators: boolean;
  /** Who the owner is looking for, when open to collaborators. */
  lookingFor: string;
  source: 'manual' | 'github' | 'idea';
  /** The GitHub `owner/repo`, or the idea id it started from. */
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
  shippedAt: string | null;
}

/** One milestone on a project's checklist. */
export interface ProjectTaskRow {
  id: string;
  projectId: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  doneAt: string | null;
  /** The student who ticked it off — on a team project, they earn the milestone. */
  doneBy: string | null;
  createdBy: string;
  createdAt: string;
}

/** Collaborators other than the owner. `(projectId, studentId)` is unique. */
export interface ProjectMemberRow {
  id: string;
  projectId: string;
  studentId: string;
  role: string;
  joinedAt: string;
}

export type JoinRequestStatus = 'pending' | 'accepted' | 'declined';

export interface JoinRequestRow {
  id: string;
  projectId: string;
  studentId: string;
  message: string;
  status: JoinRequestStatus;
  createdAt: string;
  decidedAt: string | null;
}

export type IdeaDifficulty = 'starter' | 'intermediate' | 'advanced';

/** A curated starting point. "Start this" copies it into a real project. */
export interface ProjectIdeaRow {
  id: string;
  title: string;
  summary: string;
  difficulty: IdeaDifficulty;
  /** Rough effort, in hours. */
  hours: number;
  trackIds: string[];
  skillIds: string[];
  milestones: string[];
}

// --- Opportunities: events and jobs ---------------------------------------------

/**
 * Where a listing came from. Nothing is ever described as "verified" without
 * saying by whom — the badge names the source instead.
 */
export type Verification = 'college' | 'partner' | 'student' | 'external';

/** `pending` and `rejected` listings are visible only to the student who shared them. */
export type ListingStatus = 'published' | 'pending' | 'rejected' | 'archived';

interface ListingBase {
  id: string;
  title: string;
  organiser: string;
  description: string;
  /** Free-text eligibility, as the organiser wrote it. */
  eligibility: string;
  /** Years that may apply. Empty means open to everyone. */
  eligibleYears: number[];
  /** The skills it asks for. Drives matching and the skill-gap view. */
  skillIds: string[];
  trackIds: string[];
  /** Expected effort, in the organiser's own words — "36 hours", "20 h/week". */
  effort: string;
  url: string | null;
  verification: Verification;
  status: ListingStatus;
  postedBy: string;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string;
}

export const EVENT_TYPES = [
  'hackathon',
  'workshop',
  'contest',
  'talk',
  'meetup',
  'bootcamp',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type EventMode = 'in-person' | 'online' | 'hybrid';

export interface EventRow extends ListingBase {
  type: EventType;
  mode: EventMode;
  location: string;
  /** ISO date the event starts. */
  startsOn: string;
  endsOn: string | null;
  time: string;
  /** Last day to register. Null when registration is on the day. */
  registerBy: string | null;
  capacity: number | null;
}

export const JOB_KINDS = [
  'internship',
  'full-time',
  'part-time',
  'fellowship',
  'research',
  'campus-drive',
] as const;

export type JobKind = (typeof JOB_KINDS)[number];

export type WorkMode = 'onsite' | 'remote' | 'hybrid';

export interface JobRow extends ListingBase {
  kind: JobKind;
  mode: WorkMode;
  location: string;
  compensation: string;
  duration: string;
  /** Last day to apply. */
  deadline: string | null;
  /** Skills that help but are not required. */
  niceSkillIds: string[];
}

export type ParticipationStatus = 'saved' | 'registered' | 'attended';
export type EventOutcome = 'participated' | 'finalist' | 'winner';

/** A student's relationship with one event. `(eventId, studentId)` is unique. */
export interface EventParticipationRow {
  id: string;
  eventId: string;
  studentId: string;
  status: ParticipationStatus;
  outcome: EventOutcome | null;
  /** What they learned — turns attendance into evidence. */
  reflection: string;
  /** Skills they actually used there, chosen by the student. */
  skillIds: string[];
  updatedAt: string;
}

export const APPLICATION_STAGES = [
  'saved',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

/** A student's private tracker for one job. `(jobId, studentId)` is unique. */
export interface ApplicationRow {
  id: string;
  jobId: string;
  studentId: string;
  stage: ApplicationStage;
  /** Private — never shown to anyone else, including admins. */
  note: string;
  timeline: { stage: ApplicationStage; at: string }[];
  createdAt: string;
  updatedAt: string;
}

/**
 * "Not interested" on a recommendation, or "done" on a Today card. Keys look like
 * `job:<id>` or `today:<action key>`. `(studentId, key)` is unique.
 */
export interface DismissalRow {
  id: string;
  studentId: string;
  key: string;
  kind: 'not-interested' | 'dismissed';
  at: string;
}

// --- Wellbeing ------------------------------------------------------------------

/**
 * One private check-in per ISO week. Visible only to the student — admins see
 * counts, and only above an aggregation threshold, never a single answer.
 */
export interface CheckinRow {
  id: string;
  studentId: string;
  /** Monday of the ISO week, `YYYY-MM-DD`. `(studentId, week)` is unique. */
  week: string;
  /** 1 drained … 5 full of energy. */
  energy: number;
  /** 1 calm … 5 overwhelmed. */
  stress: number;
  /** Average hours a night. */
  sleepHours: number;
  /** 1 light … 5 unmanageable. */
  workload: number;
  /** 1 dreading it … 5 enjoying it. */
  enjoyment: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

// --- Connected apps ---------------------------------------------------------------

export const PROVIDERS = [
  'github',
  'linkedin',
  'x',
  'leetcode',
  'codeforces',
  'kaggle',
  'behance',
  'website',
] as const;

export type Provider = (typeof PROVIDERS)[number];

export interface GithubRepo {
  fullName: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  fork: boolean;
  archived: boolean;
  pushedAt: string | null;
  htmlUrl: string;
  homepage: string | null;
  topics: string[];
}

/** A snapshot of the public GitHub profile, taken when the student syncs. */
export interface GithubSnapshot {
  name: string | null;
  bio: string | null;
  profileUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  topLanguages: { language: string; repos: number }[];
  repos: GithubRepo[];
}

/**
 * A linked account. Created only with the student's explicit consent; nothing is
 * fetched from a provider until they press sync.
 */
export interface ConnectionRow {
  id: string;
  studentId: string;
  provider: Provider;
  handle: string;
  url: string;
  showOnPortfolio: boolean;
  consentAt: string;
  lastSyncedAt: string | null;
  syncError: string | null;
  /** Only GitHub is synced today; every other provider is a link. */
  github: GithubSnapshot | null;
}

// --- Notifications --------------------------------------------------------------

/** Admins receive `moderation`; students, the categories they left switched on. */
export type NotificationKind = NotificationCategory | 'moderation';

/**
 * The in-app inbox is the product's record of what happened — read, dismissed —
 * never an email client's read flag.
 */
export interface NotificationRow {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  /** Stops the same reminder being created twice. `(userId, dedupeKey)` is unique. */
  dedupeKey: string | null;
  createdAt: string;
  readAt: string | null;
  dismissedAt: string | null;
}

// --- Momentum (the leaderboard's ledger) --------------------------------------------

export type MomentumSource =
  | 'project-shipped'
  | 'milestone'
  | 'skill-proven'
  | 'certificate'
  | 'event-attended'
  | 'event-placed'
  | 'practice';

/**
 * One line of a student's points ledger. Derived from their activity by
 * `lib/momentum.ts` and stored — recomputed on write, never on read — so the
 * leaderboard is a sum over rows that already exist.
 */
export interface MomentumEntryRow {
  id: string;
  studentId: string;
  source: MomentumSource;
  refId: string;
  label: string;
  points: number;
  at: string;
}

/** Points per activity. Lives in settings — `lib/momentum.ts` never hardcodes them. */
export interface MomentumPoints {
  projectShipped: number;
  milestoneDone: number;
  /** Milestones beyond this many on one project earn nothing — no padding checklists. */
  milestoneCapPerProject: number;
  skillProven: number;
  certificate: number;
  eventAttended: number;
  hackathonAttended: number;
  /** Extra, on top of attending, for finishing as a finalist or winner. */
  eventPlaced: number;
  /** Per full half-hour of logged practice. */
  practicePerHalfHour: number;
  /** Practice points stop here each week. Rewarding the grind would reward burnout. */
  practiceWeeklyCap: number;
}

// --- Institution ----------------------------------------------------------------

export interface SupportContact {
  name: string;
  detail: string;
  contact: string;
}

/** Institute-wide configuration. One row, id `singleton`. */
export interface SettingsRow {
  id: 'singleton';
  academicYear: string;
  /** Where "Open in ERP" goes — marks, attendance, fees and official notices. */
  erpName: string;
  erpUrl: string;
  momentumPoints: MomentumPoints;
  /** Shown on the Burnout page. */
  wellbeingSupport: SupportContact[];
}

/**
 * An append-only record of every moderation write. Nothing here is ever updated
 * or deleted — a correction is a new row, which is what makes the trail
 * trustworthy.
 */
export interface AuditLogRow {
  id: string;
  actorId: string;
  actorRole: Role;
  /** Verb + entity, e.g. `event.create`, `job.approve`. */
  action: string;
  entity: 'event' | 'job';
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  at: string;
}

/** The whole database, as one JSON document. */
export interface Database {
  meta: MetaRow;
  users: UserRow[];
  students: StudentRow[];
  preferences: PreferencesRow[];
  skills: SkillRow[];
  tracks: TrackRow[];
  studentSkills: StudentSkillRow[];
  practiceLogs: PracticeLogRow[];
  certificates: CertificateRow[];
  projects: ProjectRow[];
  projectTasks: ProjectTaskRow[];
  projectMembers: ProjectMemberRow[];
  joinRequests: JoinRequestRow[];
  projectIdeas: ProjectIdeaRow[];
  events: EventRow[];
  eventParticipation: EventParticipationRow[];
  jobs: JobRow[];
  applications: ApplicationRow[];
  dismissals: DismissalRow[];
  checkins: CheckinRow[];
  connections: ConnectionRow[];
  notifications: NotificationRow[];
  momentum: MomentumEntryRow[];
  settings: SettingsRow;
  auditLogs: AuditLogRow[];
}
