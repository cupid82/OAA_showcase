/**
 * Client-side mirrors of the API's read models. Each block names the backend
 * service it mirrors — keep the two in step. A field the server can send as
 * `null` is typed `null` here too, and the UI must say "not yet", never 0.
 */

export type Role = 'student' | 'admin';

export interface User {
  id: string;
  /** Roll number for students, staff ID for admins. */
  loginId: string;
  name: string;
  role: Role;
  department?: string;
  /** Students only. */
  onboarded?: boolean;
}

/** Wire shape of a failed response. The thrown error class lives in lib/api.ts. */
export interface ApiErrorResponse {
  error: { message: string; details?: Record<string, string[]> };
}

export interface AuthSession {
  token: string;
  user: User;
}

// --- Shared --------------------------------------------------------------------

export interface SkillRef {
  id: string;
  name: string;
}

export type Interest =
  | 'internships'
  | 'jobs'
  | 'hackathons'
  | 'workshops'
  | 'contests'
  | 'meetups'
  | 'research'
  | 'fellowships';

export type NotificationCategory =
  'opportunities' | 'events' | 'projects' | 'wellbeing' | 'reminders';

export type Verification = 'college' | 'partner' | 'student' | 'external';
export type ListingStatus = 'published' | 'pending' | 'rejected' | 'archived';

/** `/api/meta` */
export interface Meta {
  erp: { name: string; url: string };
  academicYear: string;
}

/** `/api/catalog` */
export interface Catalog {
  skills: { id: string; name: string; category: string; description: string }[];
  tracks: { id: string; name: string; summary: string; skillIds: string[] }[];
}

// --- profile.service -------------------------------------------------------------

export interface Me {
  profile: {
    id: string;
    rollNo: string;
    name: string;
    department: string;
    year: number;
    email: string;
    handle: string;
    headline: string;
    bio: string;
    trackId: string | null;
    interests: Interest[];
    weeklyHours: number | null;
    onboardedAt: string | null;
  };
  records: { source: string; url: string; syncedAt: string };
  track: { id: string; name: string; summary: string } | null;
  preferences: {
    notify: Record<NotificationCategory, boolean>;
    emailDigest: 'off' | 'weekly';
    leaderboardVisible: boolean;
    portfolioPublic: boolean;
    snoozeUntil: string | null;
  };
}

// --- dashboard.service ------------------------------------------------------------

export type ActionKind =
  | 'setup'
  | 'request'
  | 'deadline'
  | 'event'
  | 'milestone'
  | 'match'
  | 'portfolio'
  | 'project'
  | 'skill'
  | 'wellbeing';

export interface TodayAction {
  key: string;
  kind: ActionKind;
  title: string;
  why: string;
  action: { label: string; to: string };
  due: string | null;
  urgent: boolean;
}

export interface Commitment {
  kind: 'event' | 'register' | 'deadline' | 'milestone';
  title: string;
  detail: string;
  date: string;
  daysUntil: number;
  link: string;
}

export interface LedgerView {
  source: string;
  label: string;
  points: number;
  at: string;
}

export type BurnoutLevel = 'steady' | 'stretched' | 'at-risk';

export interface Today {
  student: { name: string; firstName: string; handle: string };
  goal: { id: string; name: string } | null;
  date: string;
  actions: TodayAction[];
  heldBack: number;
  focus: 'snoozed' | 'at-risk' | null;
  stats: {
    momentum: { month: number; all: number; rank: number | null; visible: boolean; ranked: number };
    projects: { building: number; shipped: number };
    skills: { listed: number; proven: number; trackProven: number; trackTotal: number };
    tracking: { applications: number; events: number };
  };
  upcoming: Commitment[];
  recentWins: LedgerView[];
  wellbeing: { level: BurnoutLevel | null; checkedInThisWeek: boolean; lastCheckin: string | null };
  connections: { id: Provider; name: string; connected: boolean }[];
  portfolio: { public: boolean; handle: string };
}

// --- skill.service ------------------------------------------------------------------

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type ProofStage = 'claimed' | 'practising' | 'proven';
export type TrackStage = 'foundation' | 'core' | 'advanced';

export interface EvidenceRef {
  id: string;
  title: string;
}

export interface ProofView {
  stage: ProofStage;
  provenAt: string | null;
  shippedProjects: EvidenceRef[];
  activeProjects: EvidenceRef[];
  certificates: EvidenceRef[];
  events: EvidenceRef[];
  practiceMinutes30d: number;
}

export interface MySkill {
  id: string;
  name: string;
  category: string;
  level: SkillLevel;
  proof: ProofView;
  inTrack: boolean;
  lastPractisedOn: string | null;
}

export interface TrackSkillView {
  id: string;
  name: string;
  why: string;
  level: SkillLevel | null;
  proof: ProofStage | null;
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issuedOn: string;
  url: string | null;
  skills: SkillRef[];
  showOnPortfolio: boolean;
}

export interface SkillsOverview {
  track: {
    id: string;
    name: string;
    summary: string;
    total: number;
    proven: number;
    listed: number;
    stages: { stage: TrackStage; label: string; skills: TrackSkillView[] }[];
  } | null;
  skills: MySkill[];
  suggestions: {
    usedNotListed: SkillRef[];
    nextForGoal: { id: string; name: string; why: string; stage: TrackStage }[];
  };
  certificates: Certificate[];
  practice: {
    thisWeekMinutes: number;
    weeklyTarget: number | null;
    weeks: { week: string; minutes: number }[];
    recent: { id: string; skill: SkillRef; date: string; minutes: number; note: string }[];
  };
  counts: Record<ProofStage, number> & { listed: number };
}

export interface SkillDetail {
  skill: {
    id: string;
    name: string;
    category: string;
    description: string;
    resourceUrl: string | null;
    resourceLabel: string | null;
  };
  listed: boolean;
  level: SkillLevel | null;
  proof: ProofView;
  inTrack: { stage: TrackStage; label: string; why: string } | null;
  practice: { id: string; date: string; minutes: number; note: string }[];
  openings: {
    jobs: {
      id: string;
      title: string;
      organiser: string;
      deadline: string | null;
      required: boolean;
    }[];
    events: { id: string; title: string; organiser: string; startsOn: string }[];
  };
  ideas: { id: string; title: string; difficulty: string; hours: number }[];
}

// --- project.service ---------------------------------------------------------------

export type ProjectStatus = 'idea' | 'building' | 'shipped' | 'paused';
export type Visibility = 'private' | 'campus' | 'public';

export interface Person {
  studentId: string;
  name: string;
  handle: string;
  department: string;
  year: number;
}

export interface ProjectCard {
  id: string;
  title: string;
  tagline: string;
  status: ProjectStatus;
  visibility: Visibility;
  skills: SkillRef[];
  progress: { done: number; total: number };
  nextTask: { id: string; title: string; dueDate: string | null; overdue: boolean } | null;
  access: 'owner' | 'member';
  team: number;
  openToCollaborators: boolean;
  pendingRequests: number;
  storyComplete: boolean;
  source: 'manual' | 'github' | 'idea';
  repoUrl: string | null;
  demoUrl: string | null;
  updatedAt: string;
  shippedAt: string | null;
  staleDays: number | null;
}

export interface MyProjects {
  projects: ProjectCard[];
  counts: Record<ProjectStatus, number>;
  pendingRequests: number;
  github: { connected: boolean; synced: boolean; importable: number };
}

export interface DiscoverCard {
  id: string;
  title: string;
  tagline: string;
  status: ProjectStatus;
  skills: SkillRef[];
  owner: Person;
  lookingFor: string;
  openToCollaborators: boolean;
  team: number;
  sharedSkills: SkillRef[];
  myRequest: 'pending' | 'declined' | null;
  updatedAt: string;
}

export interface IdeaCard {
  id: string;
  title: string;
  summary: string;
  difficulty: 'starter' | 'intermediate' | 'advanced';
  hours: number;
  milestones: string[];
  skills: SkillRef[];
  tracks: { id: string; name: string }[];
  forYourGoal: boolean;
  startedAs: string | null;
}

export interface ProjectTask {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  doneAt: string | null;
  doneBy: string | null;
  overdue: boolean;
}

export interface ProjectDetail {
  id: string;
  title: string;
  tagline: string;
  problem: string;
  role: string;
  outcome: string;
  status: ProjectStatus;
  visibility: Visibility;
  openToCollaborators: boolean;
  lookingFor: string;
  repoUrl: string | null;
  demoUrl: string | null;
  source: 'manual' | 'github' | 'idea';
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
  shippedAt: string | null;
  skills: SkillRef[];
  access: 'owner' | 'member' | 'viewer';
  owner: Person;
  members: (Person & { role: string; joinedAt: string; isYou: boolean })[];
  tasks: ProjectTask[];
  progress: { done: number; total: number };
  storyComplete: boolean;
  story: { problem: boolean; skills: boolean; role: boolean; link: boolean; outcome: boolean };
  joinRequests: { id: string; student: Person; message: string; createdAt: string }[];
  myRequest: { status: 'pending' | 'declined'; createdAt: string } | null;
  idea: { id: string; title: string } | null;
}

// --- match.service / event.service / job.service ------------------------------------

export interface MatchView {
  score: number;
  eligible: boolean;
  have: SkillRef[];
  missing: SkillRef[];
  niceHave: SkillRef[];
  reasons: string[];
}

export type EventType = 'hackathon' | 'workshop' | 'contest' | 'talk' | 'meetup' | 'bootcamp';
export type EventMode = 'in-person' | 'online' | 'hybrid';
export type ParticipationStatus = 'saved' | 'registered' | 'attended';
export type EventOutcome = 'participated' | 'finalist' | 'winner';

export interface EventCard {
  id: string;
  title: string;
  organiser: string;
  type: EventType;
  mode: EventMode;
  location: string;
  startsOn: string;
  endsOn: string | null;
  time: string;
  registerBy: string | null;
  effort: string;
  capacity: number | null;
  skills: SkillRef[];
  verification: Verification;
  verificationLabel: string;
  url: string | null;
  status: ListingStatus;
  sharedByYou: boolean;
  upcoming: boolean;
  registrationOpen: boolean;
  daysUntil: number;
  going: number;
  match: MatchView;
  my: {
    status: ParticipationStatus;
    outcome: EventOutcome | null;
    reflection: string;
    skills: SkillRef[];
  } | null;
  notInterested: boolean;
}

export interface EventDetail extends EventCard {
  description: string;
  eligibility: string;
  eligibleYears: number[];
  tracks: { id: string; name: string }[];
  reviewNote: string;
}

export interface EventsOverview {
  mine: EventCard[];
  recommended: EventCard[];
  upcoming: EventCard[];
  past: EventCard[];
  shared: EventCard[];
  counts: { saved: number; registered: number; attended: number };
}

export type JobKind =
  'internship' | 'full-time' | 'part-time' | 'fellowship' | 'research' | 'campus-drive';
export type WorkMode = 'onsite' | 'remote' | 'hybrid';
export type ApplicationStage =
  'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn';

export interface JobCard {
  id: string;
  title: string;
  organiser: string;
  kind: JobKind;
  mode: WorkMode;
  location: string;
  compensation: string;
  duration: string;
  deadline: string | null;
  effort: string;
  skills: SkillRef[];
  niceSkills: SkillRef[];
  verification: Verification;
  verificationLabel: string;
  url: string | null;
  status: ListingStatus;
  sharedByYou: boolean;
  open: boolean;
  daysLeft: number | null;
  match: MatchView;
  my: {
    stage: ApplicationStage;
    note: string;
    updatedAt: string;
    timeline: { stage: ApplicationStage; at: string }[];
  } | null;
  notInterested: boolean;
}

export interface JobDetail extends JobCard {
  description: string;
  eligibility: string;
  eligibleYears: number[];
  tracks: { id: string; name: string }[];
  reviewNote: string;
}

export interface JobsOverview {
  tracked: JobCard[];
  pipeline: Record<ApplicationStage, number>;
  recommended: JobCard[];
  open: JobCard[];
  shared: JobCard[];
}

// --- wellbeing.service ----------------------------------------------------------------

export type FactorKey =
  'stress' | 'sleep' | 'energy-drop' | 'workload' | 'detachment' | 'deadlines';

export interface CheckinView {
  week: string;
  energy: number;
  stress: number;
  sleepHours: number;
  workload: number;
  enjoyment: number;
  note: string;
}

export interface Wellbeing {
  reading: {
    level: BurnoutLevel | null;
    score: number | null;
    basedOn: number;
    factors: { key: FactorKey; detail: string; advice: string }[];
  };
  thisWeek: { week: string; checkin: CheckinView | null };
  history: CheckinView[];
  commitments: Commitment[];
  capacity: {
    weeklyHours: number | null;
    practiceMinutesThisWeek: number;
    milestonesDueThisWeek: number;
  };
  snoozeUntil: string | null;
  support: { name: string; detail: string; contact: string }[];
  totalCheckins: number;
}

// --- momentum.service -------------------------------------------------------------------

export type LeaderboardWindow = 'month' | 'all';
export type LeaderboardCategory = 'overall' | 'building' | 'learning' | 'events';
export type LeaderboardScope = 'college' | 'department' | 'year';

export interface MomentumPoints {
  projectShipped: number;
  milestoneDone: number;
  milestoneCapPerProject: number;
  skillProven: number;
  certificate: number;
  eventAttended: number;
  hackathonAttended: number;
  eventPlaced: number;
  practicePerHalfHour: number;
  practiceWeeklyCap: number;
}

export interface LeaderboardRow {
  rank: number;
  studentId: string;
  name: string;
  handle: string | null;
  department: string;
  year: number;
  points: number;
  breakdown: { building: number; learning: number; events: number };
  isYou: boolean;
}

export interface Leaderboard {
  window: LeaderboardWindow;
  category: LeaderboardCategory;
  scope: LeaderboardScope;
  within: string;
  since: string | null;
  rows: LeaderboardRow[];
  you: {
    points: number;
    breakdown: { building: number; learning: number; events: number };
    rank: number | null;
    visible: boolean;
  };
  total: number;
  pointsTable: MomentumPoints;
}

// --- connection.service -------------------------------------------------------------------

export type Provider =
  'github' | 'linkedin' | 'x' | 'leetcode' | 'codeforces' | 'kaggle' | 'behance' | 'website';

export interface GithubSummary {
  name: string | null;
  profileUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  topLanguages: { language: string; repos: number }[];
  importable: number;
  skillHints: { skill: SkillRef; repos: number }[];
}

export interface ProviderView {
  id: Provider;
  name: string;
  kind: 'sync' | 'link';
  blurb: string;
  placeholder: string;
  connection: {
    handle: string;
    url: string;
    showOnPortfolio: boolean;
    consentAt: string;
    lastSyncedAt: string | null;
    syncError: string | null;
    github: GithubSummary | null;
  } | null;
}

export interface ImportableRepo {
  fullName: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  fork: boolean;
  archived: boolean;
  pushedAt: string | null;
  htmlUrl: string;
  homepage: string | null;
  skills: SkillRef[];
  importedAs: string | null;
}

// --- notification.service ------------------------------------------------------------------

export interface NotificationView {
  id: string;
  kind: NotificationCategory | 'moderation';
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
}

export interface Inbox {
  items: NotificationView[];
  unread: number;
}

// --- portfolio.service -------------------------------------------------------------------------

export interface Portfolio {
  handle: string;
  name: string;
  headline: string;
  bio: string;
  department: string;
  year: number;
  track: string | null;
  projects: {
    id: string;
    title: string;
    tagline: string;
    problem: string;
    role: string;
    outcome: string;
    status: string;
    skills: SkillRef[];
    repoUrl: string | null;
    demoUrl: string | null;
    shippedAt: string | null;
    team: number;
  }[];
  skills: { id: string; name: string; stage: 'proven' | 'practising'; evidence: number }[];
  certificates: {
    title: string;
    issuer: string;
    issuedOn: string;
    url: string | null;
    skills: SkillRef[];
  }[];
  achievements: {
    title: string;
    organiser: string;
    date: string;
    outcome: 'finalist' | 'winner';
  }[];
  links: { provider: string; url: string; label: string }[];
}

// --- admin.service ---------------------------------------------------------------------------------

export interface AdminOverview {
  students: { total: number; onboarded: number; activeThisMonth: number };
  projects: {
    building: number;
    shipped: number;
    shippedThisMonth: number;
    openToCollaborators: number;
  };
  opportunities: {
    eventsUpcoming: number;
    registrations: number;
    jobsOpen: number;
    applicationsTracked: number;
    offers: number;
  };
  review: { events: number; jobs: number };
  wellbeing: {
    checkinsThisWeek: number;
    participants: number;
    levels: { steady: number; stretched: number; atRisk: number } | null;
    threshold: number;
  };
  skillDemand: { skill: SkillRef; openings: number; proven: number; listed: number }[];
  recentModeration: { id: string; action: string; title: string; at: string; actor: string }[];
}

export interface ListingRow {
  id: string;
  kind: 'event' | 'job';
  title: string;
  organiser: string;
  category: string;
  verification: Verification;
  verificationLabel: string;
  status: ListingStatus;
  date: string | null;
  sharedBy: string | null;
  createdAt: string;
  reviewNote: string;
  interest: number;
}

interface ListingFields {
  id: string;
  title: string;
  organiser: string;
  description: string;
  eligibility: string;
  eligibleYears: number[];
  skillIds: string[];
  trackIds: string[];
  effort: string;
  url: string | null;
  verification: Verification;
  status: ListingStatus;
  sharedBy: string | null;
  reviewNote: string;
}

/** `GET /api/admin/events/:id` — the raw row, for the edit form. */
export interface AdminEvent extends ListingFields {
  type: EventType;
  mode: EventMode;
  location: string;
  startsOn: string;
  endsOn: string | null;
  time: string;
  registerBy: string | null;
  capacity: number | null;
}

/** `GET /api/admin/jobs/:id` */
export interface AdminJob extends ListingFields {
  kind: JobKind;
  mode: WorkMode;
  location: string;
  compensation: string;
  duration: string;
  deadline: string | null;
  niceSkillIds: string[];
}
