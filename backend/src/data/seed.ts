/**
 * First-run dataset. Runs once, when no data file exists yet.
 *
 * Dates are generated **relative to the day the seed runs** — deadlines land a few
 * days out, check-ins cover the last eight weeks — so a freshly seeded app always
 * looks alive rather than frozen on the day it was written. Everything else is
 * fixed or drawn from a fixed PRNG seed, so two machines seeded on the same day get
 * the same data. Delete `backend/data/oaa-data.json` to reseed.
 *
 * A few students carry deliberate states, the way a test fixture would:
 *
 * - **22CS001 Ananya** — the demo account. Active builder; GitHub deliberately
 *   *not* connected, so the real connect-and-import flow can be tried on her.
 * - **22CS002 Rohan** — overloaded. Rising stress, short sleep, a crowded fortnight:
 *   the Burnout page reads "at risk" with its reasons.
 * - **22CS006 Karthik** — has chosen to stay off the public leaderboard.
 * - **22CS007 Sneha** — has never checked in. Burnout says "not enough data", never
 *   "steady": not-measured is not the same as fine. Don't "fix" it.
 * - **22CS010 Arjun** — has never signed in before; lands on onboarding.
 */
import { hash as bcryptHash } from 'bcryptjs';

import { DEFAULT_POINTS } from '../lib/momentum.js';
import { addDays, toISODate, weekStart } from '../lib/dates.js';
import { rebuildLedger } from '../services/evidence.js';
import { IDEA_SEEDS, SKILL_SEEDS, TRACK_SEEDS } from './catalog.js';
import { SCHEMA_VERSION } from './types.js';
import type {
  ApplicationRow,
  ApplicationStage,
  CertificateRow,
  CheckinRow,
  Database,
  EventOutcome,
  EventParticipationRow,
  EventRow,
  Interest,
  JobRow,
  JoinRequestRow,
  NotificationRow,
  ParticipationStatus,
  PracticeLogRow,
  PreferencesRow,
  ProjectMemberRow,
  ProjectRow,
  ProjectTaskRow,
  SkillLevel,
  StudentRow,
  StudentSkillRow,
  UserRow,
} from './types.js';

const BCRYPT_COST = 10;

const CSE = 'Computer Science & Engineering';
const AIDS = 'Artificial Intelligence & Data Science';
const ECE = 'Electronics & Communication Engineering';

/** Deterministic PRNG (mulberry32). Seeded once, consumed in a fixed order. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// --- Students -------------------------------------------------------------------

interface CheckinProfile {
  /** Week offsets back from this week — 0 is this week. */
  weeks: number[];
  /** Answers at the oldest listed week and at the newest; interpolated between. */
  from: Omit<CheckinRow, 'id' | 'studentId' | 'week' | 'note' | 'createdAt' | 'updatedAt'>;
  to?: Omit<CheckinRow, 'id' | 'studentId' | 'week' | 'note' | 'createdAt' | 'updatedAt'>;
}

interface StudentSeed {
  rollNo: string;
  name: string;
  department: string;
  year: number;
  handle: string;
  headline: string;
  bio: string;
  trackId: string | null;
  interests: Interest[];
  weeklyHours: number | null;
  onboarded: boolean;
  leaderboardVisible: boolean;
  portfolioPublic: boolean;
  emailDigest: 'off' | 'weekly';
  skills: [string, SkillLevel][];
  /** skillId → practice sessions as [days ago, minutes]. */
  practice?: Record<string, [number, number][]>;
  certificates?: { title: string; issuer: string; daysAgo: number; skillIds: string[] }[];
  checkins?: CheckinProfile;
}

const STUDENT_SEEDS: StudentSeed[] = [
  {
    rollNo: '22CS001',
    name: 'Ananya Sharma',
    department: CSE,
    year: 3,
    handle: 'ananya',
    headline: 'Full-stack student developer — I build things people on campus actually use.',
    bio: 'Third-year CSE. I like small tools with real users: Campus Eats started as a rant about the canteen queue. Learning TypeScript properly this semester and looking for a frontend internship from January.',
    trackId: 'fullstack',
    interests: ['internships', 'hackathons', 'workshops'],
    weeklyHours: 10,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: true,
    emailDigest: 'weekly',
    skills: [
      ['react', 'advanced'],
      ['javascript', 'advanced'],
      ['html-css', 'advanced'],
      ['nodejs', 'intermediate'],
      ['sql', 'intermediate'],
      ['rest-apis', 'intermediate'],
      ['typescript', 'beginner'],
      ['git', 'intermediate'],
      ['figma', 'beginner'],
    ],
    practice: {
      typescript: [
        [2, 60],
        [5, 45],
        [9, 90],
        [13, 60],
        [20, 75],
      ],
      react: [
        [4, 40],
        [16, 60],
      ],
    },
    certificates: [
      {
        title: 'Responsive Web Design',
        issuer: 'freeCodeCamp',
        daysAgo: 210,
        skillIds: ['html-css'],
      },
    ],
    checkins: {
      weeks: [1, 2, 3, 4, 5, 6, 7],
      from: { energy: 4, stress: 2, sleepHours: 7, workload: 3, enjoyment: 4 },
      to: { energy: 4, stress: 3, sleepHours: 6.5, workload: 3, enjoyment: 4 },
    },
  },
  {
    rollNo: '22CS002',
    name: 'Rohan Verma',
    department: CSE,
    year: 3,
    handle: 'rohan',
    headline: 'Data analysis, cricket statistics and too many tabs open.',
    bio: 'I got into data through IPL scorecards and never left. Trying to turn that into an analyst internship — and to finish one project before starting the next.',
    trackId: 'data-analyst',
    interests: ['internships', 'workshops', 'meetups', 'fellowships'],
    weeklyHours: 6,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: false,
    emailDigest: 'off',
    skills: [
      ['python', 'intermediate'],
      ['pandas', 'intermediate'],
      ['sql', 'intermediate'],
      ['excel', 'advanced'],
      ['data-viz', 'beginner'],
      ['power-bi', 'beginner'],
      ['statistics', 'beginner'],
    ],
    practice: {
      sql: [
        [40, 90],
        [47, 60],
      ],
    },
    certificates: [
      { title: 'SQL (Intermediate)', issuer: 'HackerRank', daysAgo: 120, skillIds: ['sql'] },
    ],
    // Worsening week on week — the at-risk reading, with its reasons, on screen.
    checkins: {
      weeks: [0, 1, 2, 3, 4, 5, 6, 7],
      from: { energy: 4, stress: 2, sleepHours: 7, workload: 3, enjoyment: 4 },
      to: { energy: 2, stress: 5, sleepHours: 5, workload: 5, enjoyment: 2 },
    },
  },
  {
    rollNo: '22CS003',
    name: 'Meera Iyer',
    department: CSE,
    year: 3,
    handle: 'meera',
    headline: 'Product design — research first, pixels second.',
    bio: 'I redesign campus services nobody asked me to redesign, then go and ask. Figma by day, interview notes by night.',
    trackId: 'product-designer',
    interests: ['internships', 'workshops', 'hackathons'],
    weeklyHours: 8,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: true,
    emailDigest: 'off',
    skills: [
      ['figma', 'advanced'],
      ['ui-design', 'intermediate'],
      ['ux-research', 'intermediate'],
      ['html-css', 'intermediate'],
      ['communication', 'intermediate'],
      ['public-speaking', 'beginner'],
    ],
    practice: {
      figma: [
        [3, 90],
        [10, 60],
      ],
    },
    checkins: {
      weeks: [0, 1, 2, 3, 4, 5],
      from: { energy: 4, stress: 2, sleepHours: 7.5, workload: 2, enjoyment: 5 },
    },
  },
  {
    rollNo: '22CS004',
    name: 'Aditya Nair',
    department: CSE,
    year: 3,
    handle: 'aditya',
    headline: 'Systems, algorithms and a contest every Sunday.',
    bio: 'I like understanding things all the way down — which is how I ended up writing a key-value store for fun. Competitive programming club lead.',
    trackId: 'software-engineer',
    interests: ['internships', 'contests', 'hackathons'],
    weeklyHours: 14,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: true,
    emailDigest: 'off',
    skills: [
      ['dsa', 'advanced'],
      ['cpp', 'advanced'],
      ['python', 'advanced'],
      ['git', 'advanced'],
      ['testing', 'intermediate'],
      ['linux', 'intermediate'],
      ['sql', 'intermediate'],
      ['rest-apis', 'intermediate'],
      ['system-design', 'beginner'],
      ['docker', 'beginner'],
    ],
    practice: {
      dsa: [
        [1, 120],
        [3, 90],
        [8, 120],
        [11, 60],
        [15, 90],
        [22, 120],
        [29, 90],
      ],
      'system-design': [
        [6, 60],
        [13, 45],
        [19, 60],
      ],
    },
    certificates: [
      {
        title: 'Programming, Data Structures and Algorithms using Python',
        issuer: 'NPTEL',
        daysAgo: 300,
        skillIds: ['dsa', 'python'],
      },
    ],
    checkins: {
      weeks: [0, 1, 2, 3, 4, 5, 6, 7],
      from: { energy: 4, stress: 3, sleepHours: 6.5, workload: 3, enjoyment: 5 },
    },
  },
  {
    rollNo: '22CS005',
    name: 'Priya Menon',
    department: CSE,
    year: 3,
    handle: 'priya',
    headline: 'Machine learning — mostly tabular, occasionally Kannada handwriting.',
    bio: 'I care more about the validation split than the model. Running the ML study circle this term.',
    trackId: 'ml-engineer',
    interests: ['internships', 'research', 'workshops'],
    weeklyHours: 10,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: false,
    emailDigest: 'off',
    skills: [
      ['python', 'advanced'],
      ['pandas', 'advanced'],
      ['machine-learning', 'intermediate'],
      ['statistics', 'intermediate'],
      ['sql', 'beginner'],
      ['git', 'intermediate'],
    ],
    practice: {
      'machine-learning': [
        [2, 90],
        [9, 60],
        [16, 90],
        [23, 60],
      ],
    },
    certificates: [
      {
        title: 'Machine Learning Specialization',
        issuer: 'Coursera',
        daysAgo: 150,
        skillIds: ['machine-learning'],
      },
    ],
    checkins: {
      weeks: [1, 2, 3, 4, 5, 6],
      from: { energy: 3, stress: 3, sleepHours: 7, workload: 3, enjoyment: 4 },
    },
  },
  {
    rollNo: '22CS006',
    name: 'Karthik Reddy',
    department: CSE,
    year: 3,
    handle: 'karthik',
    headline: 'Still figuring it out, one small thing at a time.',
    bio: '',
    trackId: 'exploring',
    interests: ['contests', 'workshops'],
    weeklyHours: 4,
    onboarded: true,
    // Chose to stay off the public board — ranked only in his own view.
    leaderboardVisible: false,
    portfolioPublic: false,
    emailDigest: 'off',
    skills: [
      ['python', 'beginner'],
      ['html-css', 'beginner'],
      ['git', 'beginner'],
    ],
    checkins: {
      weeks: [1, 3],
      from: { energy: 3, stress: 2, sleepHours: 8, workload: 2, enjoyment: 3 },
    },
  },
  {
    rollNo: '22CS007',
    name: 'Sneha Kulkarni',
    department: CSE,
    year: 3,
    handle: 'sneha',
    headline: 'Data stories about the city I live in.',
    bio: 'Maps, medians and the occasional argument about averages. My air-quality story ended up in an NSS campaign.',
    trackId: 'data-analyst',
    interests: ['internships', 'fellowships', 'meetups'],
    weeklyHours: 8,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: true,
    emailDigest: 'off',
    skills: [
      ['sql', 'advanced'],
      ['data-viz', 'advanced'],
      ['python', 'intermediate'],
      ['pandas', 'intermediate'],
      ['communication', 'intermediate'],
      ['power-bi', 'intermediate'],
      ['statistics', 'intermediate'],
    ],
    practice: {
      'power-bi': [
        [5, 60],
        [12, 45],
      ],
    },
    certificates: [
      {
        title: 'Google Data Analytics Certificate',
        issuer: 'Coursera',
        daysAgo: 240,
        skillIds: ['sql', 'data-viz'],
      },
    ],
    // No check-ins at all — the "not enough data" rule, visible in the app.
  },
  {
    rollNo: '22CS008',
    name: 'Vikram Singh',
    department: CSE,
    year: 3,
    handle: 'vikram',
    headline: 'Backend-curious, currently reading about distributed systems.',
    bio: '',
    trackId: 'fullstack',
    interests: ['internships', 'hackathons'],
    weeklyHours: 5,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: false,
    emailDigest: 'off',
    skills: [
      ['javascript', 'intermediate'],
      ['nodejs', 'beginner'],
      ['react', 'beginner'],
      ['sql', 'beginner'],
      ['git', 'beginner'],
    ],
    checkins: {
      weeks: [0, 1, 2, 3],
      from: { energy: 3, stress: 2, sleepHours: 7, workload: 2, enjoyment: 3 },
    },
  },
  {
    rollNo: '22CS009',
    name: 'Divya Pillai',
    department: CSE,
    year: 3,
    handle: 'divya',
    headline: 'Computer vision, and aiming for an MS in machine learning.',
    bio: 'I run the ML paper-reading group and spend too long on error analysis. Research internship at Juniper Health from January.',
    trackId: 'higher-studies',
    interests: ['research', 'fellowships', 'internships'],
    weeklyHours: 12,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: true,
    emailDigest: 'weekly',
    skills: [
      ['python', 'advanced'],
      ['machine-learning', 'advanced'],
      ['deep-learning', 'intermediate'],
      ['statistics', 'advanced'],
      ['pandas', 'intermediate'],
      ['communication', 'intermediate'],
      ['public-speaking', 'intermediate'],
    ],
    practice: {
      'deep-learning': [
        [3, 120],
        [10, 90],
        [17, 60],
        [24, 90],
      ],
    },
    certificates: [
      { title: 'Deep Learning', issuer: 'NPTEL', daysAgo: 90, skillIds: ['deep-learning'] },
    ],
    checkins: {
      weeks: [0, 1, 2, 3, 4, 5, 6, 7],
      from: { energy: 4, stress: 3, sleepHours: 7, workload: 4, enjoyment: 5 },
    },
  },
  {
    rollNo: '22CS010',
    name: 'Arjun Bose',
    department: CSE,
    year: 3,
    handle: 'arjun',
    headline: '',
    bio: '',
    // First sign-in still to come: no goal, no skills — onboarding is the first screen.
    trackId: null,
    interests: [],
    weeklyHours: null,
    onboarded: false,
    leaderboardVisible: false,
    portfolioPublic: false,
    emailDigest: 'off',
    skills: [],
  },
  {
    rollNo: '23AD011',
    name: 'Nisha Rao',
    department: AIDS,
    year: 2,
    handle: 'nisha',
    headline: 'Second year, learning to ask better questions of data.',
    bio: '',
    trackId: 'data-analyst',
    interests: ['internships', 'workshops', 'meetups'],
    weeklyHours: 6,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: false,
    emailDigest: 'off',
    skills: [
      ['python', 'intermediate'],
      ['pandas', 'beginner'],
      ['excel', 'intermediate'],
      ['sql', 'beginner'],
      ['statistics', 'beginner'],
    ],
    practice: {
      sql: [
        [2, 45],
        [6, 60],
        [12, 30],
      ],
      pandas: [
        [4, 60],
        [11, 45],
      ],
    },
    checkins: {
      weeks: [0, 1, 2, 3],
      from: { energy: 4, stress: 2, sleepHours: 7.5, workload: 2, enjoyment: 4 },
    },
  },
  {
    rollNo: '23AD012',
    name: 'Farhan Qureshi',
    department: AIDS,
    year: 2,
    handle: 'farhan',
    headline: 'Cricket, cameras and convolutional nets.',
    bio: '',
    trackId: 'ml-engineer',
    interests: ['hackathons', 'workshops', 'research'],
    weeklyHours: 8,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: false,
    emailDigest: 'off',
    skills: [
      ['python', 'intermediate'],
      ['machine-learning', 'beginner'],
      ['pandas', 'beginner'],
      ['git', 'beginner'],
    ],
    practice: {
      python: [
        [3, 60],
        [7, 45],
        [14, 60],
      ],
      'machine-learning': [
        [5, 60],
        [12, 30],
      ],
    },
    checkins: {
      weeks: [1, 2, 3, 4],
      from: { energy: 4, stress: 2, sleepHours: 7, workload: 2, enjoyment: 5 },
    },
  },
  {
    rollNo: '21CS013',
    name: 'Kavya Hegde',
    department: CSE,
    year: 4,
    handle: 'kavya',
    headline: 'Final-year backend engineer. Shipping, then sleeping.',
    bio: 'Java and Postgres by preference. Six merged pull requests to a Python library I use every day. Joining Tessellate after graduation.',
    trackId: 'software-engineer',
    interests: ['jobs', 'internships'],
    weeklyHours: 10,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: true,
    emailDigest: 'weekly',
    skills: [
      ['java', 'advanced'],
      ['sql', 'advanced'],
      ['rest-apis', 'advanced'],
      ['dsa', 'advanced'],
      ['git', 'advanced'],
      ['nodejs', 'intermediate'],
      ['docker', 'intermediate'],
      ['system-design', 'intermediate'],
      ['python', 'intermediate'],
      ['communication', 'intermediate'],
      ['cloud', 'beginner'],
    ],
    practice: {
      'system-design': [
        [4, 90],
        [11, 60],
        [18, 90],
      ],
    },
    certificates: [
      {
        title: 'AWS Certified Cloud Practitioner',
        issuer: 'Amazon Web Services',
        daysAgo: 60,
        skillIds: ['cloud'],
      },
    ],
    checkins: {
      weeks: [0, 1, 2, 3, 4, 5, 6, 7],
      from: { energy: 3, stress: 4, sleepHours: 6, workload: 4, enjoyment: 3 },
    },
  },
  {
    rollNo: '24EC014',
    name: 'Siddharth Joshi',
    department: ECE,
    year: 1,
    handle: 'siddharth',
    headline: 'First year. Saying yes to things.',
    bio: '',
    trackId: 'exploring',
    interests: ['hackathons', 'workshops', 'contests'],
    weeklyHours: 6,
    onboarded: true,
    leaderboardVisible: true,
    portfolioPublic: false,
    emailDigest: 'off',
    skills: [
      ['python', 'beginner'],
      ['git', 'beginner'],
      ['html-css', 'beginner'],
    ],
    practice: {
      git: [
        [1, 45],
        [6, 60],
      ],
      python: [
        [3, 60],
        [9, 45],
        [15, 60],
      ],
    },
    checkins: {
      weeks: [0, 1, 2],
      from: { energy: 5, stress: 2, sleepHours: 7, workload: 2, enjoyment: 5 },
    },
  },
];

/** Index into STUDENT_SEEDS → `stu-001` … */
const sid = (index: number) => `stu-${String(index + 1).padStart(3, '0')}`;
const S = Object.fromEntries(STUDENT_SEEDS.map((seed, index) => [seed.handle, sid(index)]));
const student = (handle: string): string => {
  const id = S[handle];
  if (!id) throw new Error(`Seed refers to unknown student "${handle}"`);
  return id;
};

// --- Projects ---------------------------------------------------------------------

interface TaskSeed {
  title: string;
  /** Days relative to today; negative is past. */
  due?: number;
  /** Set when done — days relative to today. */
  done?: number;
  /** Who ticked it — defaults to the owner. */
  doneBy?: string;
}

interface ProjectSeed extends Omit<
  ProjectRow,
  | 'ownerId'
  | 'createdAt'
  | 'updatedAt'
  | 'shippedAt'
  | 'sourceRef'
  | 'source'
  | 'repoUrl'
  | 'demoUrl'
> {
  owner: string;
  created: number;
  updated: number;
  shipped?: number;
  fromIdea?: string;
  demoUrl?: string;
  tasks: TaskSeed[];
  members?: { handle: string; role: string; joined: number }[];
}

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    id: 'prj-campus-eats',
    owner: 'ananya',
    title: 'Campus Eats',
    tagline: 'Pre-order from the college canteen and skip the lunch queue.',
    problem:
      'The canteen queue eats twenty minutes of a forty-five-minute lunch break, and nobody can see what has already sold out.',
    role: 'Built the React front end and the ordering API, and ran the two-week pilot with the canteen.',
    outcome:
      'Piloted with 140 students over two weeks. Average wait at the counter fell from 18 minutes to 6, and the canteen wants it for the hostel mess next.',
    status: 'shipped',
    skillIds: ['react', 'nodejs', 'sql', 'rest-apis'],
    demoUrl: 'https://campus-eats.example',
    visibility: 'public',
    openToCollaborators: false,
    lookingFor: '',
    created: -120,
    updated: -40,
    shipped: -40,
    members: [{ handle: 'vikram', role: 'Backend — order status API', joined: -100 }],
    tasks: [
      { title: 'Interview the canteen manager', done: -110 },
      { title: 'Menu and ordering screens', done: -95 },
      { title: 'Ordering API with live order status', done: -80, doneBy: 'vikram' },
      { title: 'Pilot with two sections', done: -55 },
      { title: 'Launch to the whole campus', done: -40 },
    ],
  },
  {
    id: 'prj-studysync',
    owner: 'ananya',
    title: 'StudySync',
    tagline: 'Study rooms with a shared Pomodoro timer and one to-do list for the group.',
    problem:
      'Group study over video calls drifts — nobody keeps time, and half the room ends up on their phones.',
    role: 'Front end, the WebSocket layer and the timer sync.',
    outcome: '',
    status: 'building',
    skillIds: ['react', 'typescript', 'nodejs'],
    visibility: 'campus',
    openToCollaborators: true,
    lookingFor: 'A designer for the room screens, and anyone who has used WebRTC.',
    fromIdea: 'idea-study-rooms',
    created: -35,
    updated: -3,
    tasks: [
      { title: 'Create and join rooms by link', done: -28 },
      { title: 'Sync the timer across everyone in a room', done: -14 },
      { title: 'Add a shared task list', done: -3 },
      { title: 'Persist rooms in Postgres', due: 4 },
      { title: 'Invite links that expire', due: 10 },
      { title: 'Run one real study session', due: 18 },
    ],
  },
  {
    id: 'prj-prep-tracker',
    owner: 'ananya',
    title: 'Placement prep tracker',
    tagline: 'Track DSA practice by topic, not by streak.',
    problem: '',
    role: '',
    outcome: '',
    status: 'idea',
    skillIds: [],
    visibility: 'private',
    openToCollaborators: false,
    lookingFor: '',
    created: -6,
    updated: -6,
    tasks: [],
  },
  {
    id: 'prj-ipl-auction',
    owner: 'rohan',
    title: 'IPL auction analysis',
    tagline: 'Which IPL auction buys actually paid off?',
    problem:
      'Franchises spend crores on reputation. I want to know which buys returned runs and wickets per rupee, and which were hype.',
    role: 'Solo — scraping, cleaning and the analysis.',
    outcome: '',
    status: 'building',
    skillIds: ['python', 'pandas', 'data-viz'],
    visibility: 'private',
    openToCollaborators: false,
    lookingFor: '',
    created: -50,
    updated: -18,
    tasks: [
      { title: 'Scrape five seasons of auction prices', done: -44 },
      { title: 'Join prices to match performance', due: -5 },
      { title: 'Value-per-crore chart for each team', due: -2 },
      { title: 'Write up the five worst buys', due: 6 },
      { title: 'Share it on the department forum', due: 12 },
    ],
  },
  {
    id: 'prj-mess-dashboard',
    owner: 'rohan',
    title: 'Hostel mess feedback dashboard',
    tagline: 'Turn the mess feedback forms into something the warden reads.',
    problem:
      'Mess feedback is collected on paper every week and never looked at. The same complaints repeat because nobody can see the pattern.',
    role: 'Collecting the forms and building the dashboard.',
    outcome: '',
    status: 'building',
    skillIds: ['excel', 'power-bi'],
    visibility: 'campus',
    openToCollaborators: false,
    lookingFor: '',
    created: -20,
    updated: -4,
    tasks: [
      { title: 'Digitise six weeks of forms', due: 3 },
      { title: 'Categorise the complaints', due: 7 },
      { title: 'Build the weekly dashboard', due: 11 },
      { title: 'Present it to the warden', due: 16 },
    ],
  },
  {
    id: 'prj-library-redesign',
    owner: 'meera',
    title: 'Library booking redesign',
    tagline: 'Booking a discussion room in thirty seconds instead of four screens.',
    problem:
      'Booking a library discussion room takes four screens, a login and a phone call to confirm. Most students give up and sit in the corridor.',
    role: 'Ran eight interviews, mapped the journey, then designed and tested the prototype.',
    outcome:
      'Presented to the librarian. Two of the five changes — one-tap booking and a live availability grid — are in for this semester.',
    status: 'shipped',
    skillIds: ['ux-research', 'figma', 'ui-design', 'communication'],
    visibility: 'public',
    openToCollaborators: false,
    lookingFor: '',
    created: -130,
    updated: -70,
    shipped: -70,
    tasks: [
      { title: 'Interview eight students and two librarians', done: -120 },
      { title: 'Map the current booking journey', done: -105 },
      { title: 'Prototype the new flow in Figma', done: -88 },
      { title: 'Test with five people and present', done: -70 },
    ],
  },
  {
    id: 'prj-a11y-audit',
    owner: 'meera',
    title: 'Accessibility audit: the college website',
    tagline: 'Can a screen-reader user get through the college website?',
    problem:
      'The college website fails basic keyboard navigation — the admissions form is unreachable without a mouse — and nobody has written down how bad it is.',
    role: 'Leading the audit and the write-up.',
    outcome: '',
    status: 'building',
    skillIds: ['html-css', 'ui-design', 'communication'],
    visibility: 'campus',
    openToCollaborators: true,
    lookingFor: 'A developer who wants to fix the ten worst issues we find.',
    created: -15,
    updated: -2,
    members: [{ handle: 'siddharth', role: 'Screen-reader testing', joined: -12 }],
    tasks: [
      { title: 'Keyboard-only walkthrough', done: -10 },
      { title: 'Screen-reader pass on the main pages', done: -4, doneBy: 'siddharth' },
      { title: 'Write up the ten worst problems', due: 5 },
      { title: 'Fix three of them in a fork', due: 14 },
    ],
  },
  {
    id: 'prj-interval-scheduler',
    owner: 'aditya',
    title: 'Interval scheduler',
    tagline: 'A tiny, well-tested library for booking non-overlapping time slots.',
    problem:
      'Every campus booking tool I looked at reimplemented overlap checks badly. I wanted one that was small, fast and tested against the nasty cases.',
    role: 'Everything — the design, the implementation and the test suite.',
    outcome:
      'Used by two other student projects. Forty test cases cover touching, nested and zero-length intervals.',
    status: 'shipped',
    skillIds: ['python', 'dsa', 'testing'],
    visibility: 'public',
    openToCollaborators: false,
    lookingFor: '',
    created: -200,
    updated: -150,
    shipped: -150,
    tasks: [
      { title: 'Pick the interval representation', done: -195 },
      { title: 'Overlap detection', done: -185 },
      { title: 'Property-based tests for edge cases', done: -165 },
      { title: 'Publish with a README', done: -150 },
    ],
  },
  {
    id: 'prj-kv-store',
    owner: 'aditya',
    title: 'Tiny KV store',
    tagline: 'A Redis-shaped key-value store with an append-only log.',
    problem:
      'I wanted to understand how a database survives a crash, so I built one small enough to reason about end to end.',
    role: 'Solo — the storage engine, the wire protocol and the crash tests.',
    outcome:
      'Recovers correctly from kill -9 in every crash test; about 60,000 ops/sec on a laptop.',
    status: 'shipped',
    skillIds: ['cpp', 'dsa', 'linux', 'testing'],
    visibility: 'public',
    openToCollaborators: false,
    lookingFor: '',
    created: -110,
    updated: -60,
    shipped: -60,
    tasks: [
      { title: 'In-memory hash table', done: -104 },
      { title: 'Append-only log', done: -92 },
      { title: 'Crash recovery', done: -80 },
      { title: 'Wire protocol', done: -70 },
      { title: 'Crash tests with kill -9', done: -60 },
    ],
  },
  {
    id: 'prj-rating-predictor',
    owner: 'aditya',
    title: 'Contest rating predictor',
    tagline: 'Predicts your rating change before contest results are final.',
    problem:
      'Rating changes arrive hours after a contest ends. Everyone in our club wants to know sooner whether a round went well.',
    role: 'Built the predictor and the small API the club’s bot calls.',
    outcome: 'Within ±15 rating points for 90% of the club over six contests.',
    status: 'shipped',
    skillIds: ['python', 'sql', 'rest-apis'],
    visibility: 'public',
    openToCollaborators: false,
    lookingFor: '',
    created: -45,
    updated: -20,
    shipped: -20,
    tasks: [
      { title: 'Collect past contest standings', done: -42 },
      { title: 'Reimplement the rating formula', done: -35 },
      { title: 'API for the club bot', done: -26 },
      { title: 'Validate over six contests', done: -20 },
    ],
  },
  {
    id: 'prj-rate-limiter',
    owner: 'aditya',
    title: 'Distributed rate limiter',
    tagline: 'A rate limiter that stays correct across three nodes.',
    problem:
      'A single-node token bucket is easy. I want to learn what breaks when the counter lives on three machines and the network lies.',
    role: 'Design and implementation; looking for a partner for the chaos tests.',
    outcome: '',
    status: 'building',
    skillIds: ['docker', 'system-design', 'rest-apis'],
    visibility: 'campus',
    openToCollaborators: true,
    lookingFor: 'Someone curious about distributed systems — Go or Rust welcome.',
    created: -12,
    updated: -1,
    tasks: [
      { title: 'Single-node token bucket', done: -9 },
      { title: 'Share state across three nodes', due: 6 },
      { title: 'Chaos tests with network partitions', due: 15 },
      { title: 'Write up what broke', due: 21 },
    ],
  },
  {
    id: 'prj-demand-forecast',
    owner: 'priya',
    title: 'Canteen demand forecaster',
    tagline: 'Predict tomorrow’s demand per dish — and say how wrong we are.',
    problem:
      'The canteen throws away a tray of food most afternoons and runs out of dosa by 12:30. Better forecasts mean less waste and fewer disappointed students.',
    role: 'Modelling and evaluation. Farhan is handling data collection.',
    outcome: '',
    status: 'building',
    skillIds: ['python', 'pandas', 'machine-learning', 'statistics'],
    visibility: 'campus',
    openToCollaborators: false,
    lookingFor: '',
    fromIdea: 'idea-canteen-forecast',
    created: -25,
    updated: -5,
    members: [{ handle: 'farhan', role: 'Data collection', joined: -22 }],
    tasks: [
      { title: 'Collect two months of sales', done: -18, doneBy: 'farhan' },
      { title: 'Build a naive baseline to beat', done: -9 },
      { title: 'Train and compare two models', due: 5 },
      { title: 'Report the error honestly, with a chart', due: 12 },
    ],
  },
  {
    id: 'prj-kannada-ocr',
    owner: 'priya',
    title: 'Kannada handwriting recogniser',
    tagline: 'Recognise handwritten Kannada characters from phone photos.',
    problem: '',
    role: '',
    outcome: '',
    status: 'idea',
    skillIds: ['deep-learning'],
    visibility: 'private',
    openToCollaborators: false,
    lookingFor: '',
    created: -8,
    updated: -8,
    tasks: [],
  },
  {
    id: 'prj-karthik-site',
    owner: 'karthik',
    title: 'Personal website',
    tagline: 'My corner of the internet.',
    problem: 'I needed one place to point people to that is not a PDF résumé.',
    role: 'Built and deployed it.',
    outcome: '',
    status: 'shipped',
    skillIds: ['html-css', 'git'],
    demoUrl: 'https://karthik.example',
    visibility: 'public',
    openToCollaborators: false,
    lookingFor: '',
    created: -40,
    updated: -30,
    shipped: -30,
    tasks: [
      { title: 'One-page layout', done: -36 },
      { title: 'Deploy it', done: -30 },
    ],
  },
  {
    id: 'prj-air-quality',
    owner: 'sneha',
    title: 'Bengaluru air-quality story',
    tagline: 'Where and when the city’s air is worst — in one page.',
    problem:
      'Air-quality reports give city-wide averages. I wanted to know which neighbourhoods, which months, and whether the lockdown dip was real.',
    role: 'Solo — the data, the analysis and the visual story.',
    outcome:
      'Featured in the department newsletter. The ward-level map was reused by the NSS unit for a clean-air campaign.',
    status: 'shipped',
    skillIds: ['sql', 'data-viz', 'communication', 'python'],
    visibility: 'public',
    openToCollaborators: false,
    lookingFor: '',
    created: -80,
    updated: -45,
    shipped: -45,
    tasks: [
      { title: 'Load five years of sensor readings', done: -76 },
      { title: 'Clean the gaps honestly', done: -66 },
      { title: 'Ward-level map', done: -55 },
      { title: 'Publish the one-page story', done: -45 },
    ],
  },
  {
    id: 'prj-placement-dashboard',
    owner: 'sneha',
    title: 'Placement statistics, honestly averaged',
    tagline: 'Five years of placement data, as medians instead of the highest package.',
    problem:
      'Placement brochures quote the highest package. Students planning their year need medians, by branch and by year.',
    role: 'Solo.',
    outcome: '',
    status: 'building',
    skillIds: ['power-bi', 'sql'],
    visibility: 'private',
    openToCollaborators: false,
    lookingFor: '',
    created: -10,
    updated: -2,
    tasks: [
      { title: 'Collect five years of anonymised data', done: -6 },
      { title: 'Clean and normalise the packages', due: 4 },
      { title: 'Median by branch and year', due: 9 },
    ],
  },
  {
    id: 'prj-expense-splitter',
    owner: 'vikram',
    title: 'Expense splitter',
    tagline: 'Split trip expenses without the awkward maths.',
    problem:
      'Every trip ends in a group-chat argument about who owes whom. The maths is simple; nobody wants to do it.',
    role: 'Solo.',
    outcome: '',
    status: 'paused',
    skillIds: ['javascript', 'react'],
    visibility: 'private',
    openToCollaborators: false,
    lookingFor: '',
    created: -70,
    updated: -40,
    tasks: [
      { title: 'Add people and expenses', done: -60 },
      { title: 'Settle-up algorithm', due: -35 },
      { title: 'Share a trip by link' },
      { title: 'Deploy it' },
    ],
  },
  {
    id: 'prj-plant-disease',
    owner: 'divya',
    title: 'Plant disease classifier',
    tagline: 'Spotting tomato leaf diseases from a phone photo.',
    problem:
      'Farmers near our campus lose crops to diseases that are treatable when caught early, but an agronomist visit takes days.',
    role: 'Model training, evaluation, and the field test with twenty photos from a nearby farm.',
    outcome:
      '94% accuracy on the held-out split, but 71% on our own field photos. The write-up on that gap is what the department research day remembered.',
    status: 'shipped',
    skillIds: ['python', 'deep-learning', 'machine-learning'],
    visibility: 'public',
    openToCollaborators: false,
    lookingFor: '',
    fromIdea: 'idea-plant-disease',
    created: -100,
    updated: -35,
    shipped: -35,
    tasks: [
      { title: 'Pick a dataset and a baseline model', done: -95 },
      { title: 'Fine-tune and evaluate on a held-out split', done: -70 },
      { title: 'Test on twenty photos of your own', done: -50 },
      { title: 'Write up where and why it fails', done: -35 },
    ],
  },
  {
    id: 'prj-reading-group',
    owner: 'divya',
    title: 'ML paper reading group',
    tagline: 'One machine-learning paper a week, explained in plain words.',
    problem:
      'Papers are hard to read alone. A weekly group with a one-page summary makes them approachable, even for second-years.',
    role: 'Organiser and editor of the summaries.',
    outcome: '',
    status: 'building',
    skillIds: ['communication', 'machine-learning'],
    visibility: 'campus',
    openToCollaborators: true,
    lookingFor: 'Anyone willing to present one paper this semester.',
    created: -28,
    updated: -6,
    tasks: [
      { title: 'Pick the semester’s papers', done: -25 },
      { title: 'Summaries for weeks 1–4', done: -6 },
      { title: 'Summaries for weeks 5–8', due: 20 },
    ],
  },
  {
    id: 'prj-finance-tracker',
    owner: 'nisha',
    title: 'Where my pocket money goes',
    tagline: 'A personal finance tracker with charts.',
    problem: 'I run out of money in the last week of every month and I have no idea why.',
    role: 'Solo.',
    outcome: '',
    status: 'building',
    skillIds: ['python', 'pandas', 'data-viz'],
    visibility: 'private',
    openToCollaborators: false,
    lookingFor: '',
    fromIdea: 'idea-finance-tracker',
    created: -14,
    updated: -3,
    tasks: [
      { title: 'Export three months of transactions', done: -10 },
      { title: 'Clean and categorise them with pandas', due: 3 },
      { title: 'Chart monthly spend by category', due: 8 },
      { title: 'Write up three things you learned', due: 12 },
    ],
  },
  {
    id: 'prj-shot-classifier',
    owner: 'farhan',
    title: 'Cricket shot classifier',
    tagline: 'Classify cricket shots from nets footage.',
    problem: '',
    role: '',
    outcome: '',
    status: 'idea',
    skillIds: ['python', 'deep-learning'],
    visibility: 'private',
    openToCollaborators: false,
    lookingFor: '',
    created: -4,
    updated: -4,
    tasks: [],
  },
  {
    id: 'prj-url-shortener',
    owner: 'kavya',
    title: 'Club link shortener',
    tagline: 'Short links with click analytics, for every club on campus.',
    problem:
      'Club posters need short links we can track, and the free shorteners cap their analytics.',
    role: 'Solo — the API, the database, the dashboard and the deployment.',
    outcome: 'Used by four clubs; 12,000 redirects served last semester.',
    status: 'shipped',
    skillIds: ['nodejs', 'sql', 'rest-apis', 'docker'],
    visibility: 'public',
    openToCollaborators: false,
    lookingFor: '',
    fromIdea: 'idea-url-shortener',
    created: -120,
    updated: -90,
    shipped: -90,
    tasks: [
      { title: 'Design the API and the tables', done: -115 },
      { title: 'Build create and redirect endpoints', done: -108 },
      { title: 'Count clicks and show them on a dashboard', done: -99 },
      { title: 'Containerise it and deploy', done: -90 },
    ],
  },
  {
    id: 'prj-oss-docs',
    owner: 'kavya',
    title: 'Quick-start rewrite for an open-source library',
    tagline: 'Six merged pull requests to a Python data-validation library’s docs.',
    problem:
      'The library’s getting-started guide skipped the step every beginner got stuck on, and half its examples no longer ran.',
    role: 'Contributor — rewrote the quick-start and fixed the broken examples across six PRs.',
    outcome: 'The rewritten quick-start is now the project’s most-visited docs page.',
    status: 'shipped',
    skillIds: ['git', 'python', 'communication'],
    visibility: 'public',
    openToCollaborators: false,
    lookingFor: '',
    created: -160,
    updated: -130,
    shipped: -130,
    tasks: [
      { title: 'Reproduce every example in the docs', done: -155 },
      { title: 'Rewrite the quick-start', done: -142 },
      { title: 'Get the six PRs reviewed and merged', done: -130 },
    ],
  },
  {
    id: 'prj-events-api',
    owner: 'kavya',
    title: 'Campus events API',
    tagline: 'One API for every club’s events.',
    problem:
      'Clubs post their events across six group chats. The student council’s app needed one source it could read.',
    role: 'Designed the API and wrote the Java service.',
    outcome: 'The student council’s app reads from it; forty clubs are on board.',
    status: 'shipped',
    skillIds: ['java', 'sql', 'rest-apis'],
    visibility: 'public',
    openToCollaborators: false,
    lookingFor: '',
    created: -75,
    updated: -30,
    shipped: -30,
    tasks: [
      { title: 'Interview five club leads', done: -70 },
      { title: 'Design the schema and endpoints', done: -60 },
      { title: 'Build the service', done: -45 },
      { title: 'Onboard the first ten clubs', done: -30 },
    ],
  },
  {
    id: 'prj-first-oss',
    owner: 'siddharth',
    title: 'My first open-source contribution',
    tagline: 'Landing my first pull request in someone else’s project.',
    problem:
      'I have never contributed to someone else’s code. I want to learn how real projects review and accept changes.',
    role: 'Solo.',
    outcome: '',
    status: 'building',
    skillIds: ['git', 'communication'],
    visibility: 'private',
    openToCollaborators: false,
    lookingFor: '',
    fromIdea: 'idea-first-oss',
    created: -9,
    updated: -1,
    tasks: [
      { title: 'Pick a project with good-first-issue labels', done: -7 },
      { title: 'Get it running on your machine', done: -1 },
      { title: 'Open your first pull request', due: 5 },
      { title: 'Respond to the review and get it merged', due: 14 },
    ],
  },
];

const JOIN_REQUEST_SEEDS: {
  project: string;
  handle: string;
  message: string;
  status: JoinRequestRow['status'];
  created: number;
  decided?: number;
}[] = [
  {
    project: 'prj-studysync',
    handle: 'meera',
    message:
      'I can take the room screens — I have done two Figma redesigns this year and would love to see one of mine actually get built.',
    status: 'pending',
    created: -1,
  },
  {
    project: 'prj-rate-limiter',
    handle: 'vikram',
    message:
      'I have been reading Designing Data-Intensive Applications and want to build something real with it. Happy to own the chaos tests.',
    status: 'pending',
    created: -2,
  },
  {
    project: 'prj-campus-eats',
    handle: 'vikram',
    message: 'I can build the order-status API.',
    status: 'accepted',
    created: -102,
    decided: -100,
  },
  {
    project: 'prj-demand-forecast',
    handle: 'farhan',
    message: 'I eat at the canteen every day — I can collect the sales data.',
    status: 'accepted',
    created: -23,
    decided: -22,
  },
  {
    project: 'prj-a11y-audit',
    handle: 'siddharth',
    message: 'I use a screen reader for reading PDFs — I could do the testing.',
    status: 'accepted',
    created: -13,
    decided: -12,
  },
];

// --- Events ------------------------------------------------------------------------

type EventSeed = Omit<
  EventRow,
  | 'startsOn'
  | 'endsOn'
  | 'registerBy'
  | 'postedBy'
  | 'createdAt'
  | 'reviewedBy'
  | 'reviewedAt'
  | 'reviewNote'
  | 'status'
> & {
  starts: number;
  ends?: number;
  registerBy?: number;
  sharedBy?: string;
  status?: EventRow['status'];
  created: number;
};

const EVENT_SEEDS: EventSeed[] = [
  {
    id: 'evt-avelin-hack-26',
    title: 'Avelin Hack 2026',
    organiser: 'Avelin Coding Club',
    description:
      'The college’s own 36-hour build weekend. Three open tracks this year — campus life, climate, and open data. Alumni mentors are on the floor all night, and every team demos to judges from partner companies on Sunday afternoon.',
    eligibility:
      'Any year, any branch. Teams of two to four — register alone and you will be matched with a team.',
    eligibleYears: [],
    skillIds: ['javascript', 'react', 'nodejs', 'python'],
    trackIds: ['fullstack', 'ml-engineer', 'software-engineer', 'product-designer', 'exploring'],
    effort: '36-hour hackathon · teams of 2–4',
    url: null,
    verification: 'college',
    type: 'hackathon',
    mode: 'in-person',
    location: 'Main Auditorium',
    starts: 11,
    ends: 12,
    time: 'Sat 09:00 – Sun 21:00',
    registerBy: 6,
    capacity: 240,
    created: -20,
  },
  {
    id: 'evt-react-workshop',
    title: 'Hands-on React: from components to a deployed app',
    organiser: 'Department of CSE',
    description:
      'Build and deploy a small React app in one afternoon: components, state, fetching data, and shipping it to a free host. Taught by final-year students who used it in their internships.',
    eligibility: 'Years 1–3. You should be comfortable with basic JavaScript.',
    eligibleYears: [1, 2, 3],
    skillIds: ['react', 'javascript'],
    trackIds: ['fullstack', 'exploring'],
    effort: '3 hours · bring a laptop',
    url: null,
    verification: 'college',
    type: 'workshop',
    mode: 'in-person',
    location: 'Lab CS-204',
    starts: 4,
    time: '14:00 – 17:00',
    registerBy: 2,
    capacity: 60,
    created: -12,
  },
  {
    id: 'evt-data-meetup',
    title: 'Bengaluru Data Meetup: analytics in public health',
    organiser: 'DataCircle Bengaluru',
    description:
      'Two short talks from analysts working on district health data, then open networking. A good look at what analysis is like outside a classroom.',
    eligibility: 'Open to all.',
    eligibleYears: [],
    skillIds: ['statistics', 'data-viz', 'sql'],
    trackIds: ['data-analyst', 'ml-engineer', 'higher-studies'],
    effort: '2 hours',
    url: 'https://datacircle.example/meetups/public-health',
    verification: 'partner',
    type: 'meetup',
    mode: 'hybrid',
    location: 'Koramangala, and online',
    starts: 8,
    time: '18:00 – 20:00',
    registerBy: 7,
    capacity: 120,
    created: -10,
  },
  {
    id: 'evt-codesprint-9',
    title: 'CodeSprint #9',
    organiser: 'Avelin Competitive Programming Club',
    description:
      'The monthly rated contest — six problems in two and a half hours. Editorials go up the next morning, and the club reviews the hardest problem on Monday.',
    eligibility: 'Open to all students.',
    eligibleYears: [],
    skillIds: ['dsa', 'cpp', 'python'],
    trackIds: ['software-engineer'],
    effort: '2.5 hours',
    url: null,
    verification: 'college',
    type: 'contest',
    mode: 'online',
    location: 'Online',
    starts: 2,
    time: '20:00 – 22:30',
    registerBy: 2,
    capacity: null,
    created: -14,
  },
  {
    id: 'evt-typescript-deep-dive',
    title: 'TypeScript deep-dive: types that catch real bugs',
    organiser: 'Avelin Coding Club',
    description:
      'Take a small, buggy React app and make the compiler find the bugs for you: discriminated unions, narrowing, and typing API responses you don’t control.',
    eligibility: 'Comfortable with JavaScript; some React helps.',
    eligibleYears: [],
    skillIds: ['typescript', 'react'],
    trackIds: ['fullstack', 'software-engineer'],
    effort: '2.5 hours · bring a laptop',
    url: null,
    verification: 'college',
    type: 'workshop',
    mode: 'in-person',
    location: 'Lab CS-201',
    starts: 6,
    time: '15:00 – 17:30',
    registerBy: 5,
    capacity: 45,
    created: -5,
  },
  {
    id: 'evt-design-jam',
    title: 'Design Jam: redesign the campus app',
    organiser: 'Design Society',
    description:
      'Interview real users in the morning, prototype in the afternoon, present at four. Mentors from two design studios will be in the room.',
    eligibility: 'Open to all — no design experience needed.',
    eligibleYears: [],
    skillIds: ['figma', 'ui-design', 'ux-research'],
    trackIds: ['product-designer', 'exploring'],
    effort: 'One day · teams of three',
    url: null,
    verification: 'college',
    type: 'workshop',
    mode: 'in-person',
    location: 'Design Studio, Block C',
    starts: 15,
    time: '10:00 – 16:00',
    registerBy: 12,
    capacity: 40,
    created: -7,
  },
  {
    id: 'evt-ml-study-jam',
    title: 'ML Study Jam: tabular competitions',
    organiser: 'ML Study Circle',
    description:
      'Four weekly sessions working through a past tabular competition together — feature engineering, validation, and not fooling yourself with a leaky split.',
    eligibility: 'You should be comfortable with pandas.',
    eligibleYears: [],
    skillIds: ['machine-learning', 'pandas', 'python'],
    trackIds: ['ml-engineer', 'data-analyst'],
    effort: '4 Saturdays · 2 hours each',
    url: 'https://studyjam.example/tabular',
    verification: 'student',
    type: 'bootcamp',
    mode: 'online',
    location: 'Online',
    starts: 18,
    ends: 39,
    time: 'Saturdays 10:00 – 12:00',
    registerBy: 16,
    capacity: 50,
    sharedBy: 'priya',
    created: -11,
  },
  {
    id: 'evt-oss-week',
    title: 'Open Source Contribution Week',
    organiser: 'Open Source Circle',
    description:
      'A week of guided first contributions. Each day brings a curated list of beginner-friendly issues and an hour of mentor office hours.',
    eligibility: 'Anyone with a GitHub account.',
    eligibleYears: [],
    skillIds: ['git', 'communication'],
    trackIds: ['exploring', 'software-engineer', 'fullstack'],
    effort: 'One week · about an hour a day',
    url: 'https://oss-week.example',
    verification: 'external',
    type: 'bootcamp',
    mode: 'online',
    location: 'Online',
    starts: 20,
    ends: 26,
    time: 'Self-paced, with daily office hours',
    registerBy: 19,
    capacity: null,
    created: -9,
  },
  {
    id: 'evt-payments-talk',
    title: 'How a payments system survives a festival sale',
    organiser: 'Fernleaf Labs engineering',
    description:
      'An engineering lead walks through the architecture behind a 40× traffic spike: queues, idempotency keys, and what they got wrong the first year.',
    eligibility: 'Years 3 and 4.',
    eligibleYears: [3, 4],
    skillIds: ['system-design', 'cloud'],
    trackIds: ['software-engineer', 'fullstack'],
    effort: '90 minutes',
    url: null,
    verification: 'partner',
    type: 'talk',
    mode: 'in-person',
    location: 'Seminar Hall B',
    starts: 9,
    time: '15:00 – 16:30',
    capacity: 150,
    created: -8,
  },
  {
    id: 'evt-cloud-resume',
    title: 'Cloud Resume Challenge study group',
    organiser: 'Rohan Verma (student)',
    description:
      'A peer study group working through the Cloud Resume Challenge together — a résumé site with a real backend, CI and infrastructure as code.',
    eligibility: 'Anyone.',
    eligibleYears: [],
    skillIds: ['cloud', 'docker'],
    trackIds: ['software-engineer', 'fullstack'],
    effort: '6 weeks · 3 hours a week',
    url: 'https://cloud-resume.example',
    verification: 'student',
    type: 'bootcamp',
    mode: 'online',
    location: 'Online',
    starts: 14,
    ends: 42,
    time: 'Wednesdays 19:00',
    registerBy: 13,
    capacity: 20,
    sharedBy: 'rohan',
    status: 'pending',
    created: -3,
  },
  // Already held — attendance and reflections hang off these.
  {
    id: 'evt-avelin-hack-25',
    title: 'Avelin Hack 2025',
    organiser: 'Avelin Coding Club',
    description: 'Last year’s edition: 52 teams across three tracks, 36 hours.',
    eligibility: 'Any year, any branch.',
    eligibleYears: [],
    skillIds: ['javascript', 'python', 'react', 'nodejs'],
    trackIds: ['fullstack', 'ml-engineer', 'software-engineer'],
    effort: '36-hour hackathon',
    url: null,
    verification: 'college',
    type: 'hackathon',
    mode: 'in-person',
    location: 'Main Auditorium',
    starts: -60,
    ends: -59,
    time: 'Sat 09:00 – Sun 21:00',
    capacity: 220,
    created: -90,
  },
  {
    id: 'evt-git-teams',
    title: 'Git & GitHub for teams',
    organiser: 'Avelin Coding Club',
    description:
      'Branches, pull requests, reviews and resolving your first merge conflict without panicking.',
    eligibility: 'Open to all.',
    eligibleYears: [],
    skillIds: ['git'],
    trackIds: ['exploring', 'fullstack', 'software-engineer'],
    effort: '2 hours',
    url: null,
    verification: 'college',
    type: 'workshop',
    mode: 'in-person',
    location: 'Lab CS-201',
    starts: -25,
    time: '14:00 – 16:00',
    capacity: 80,
    created: -40,
  },
  {
    id: 'evt-codesprint-8',
    title: 'CodeSprint #8',
    organiser: 'Avelin Competitive Programming Club',
    description: 'Last month’s rated contest.',
    eligibility: 'Open to all students.',
    eligibleYears: [],
    skillIds: ['dsa', 'cpp', 'python'],
    trackIds: ['software-engineer'],
    effort: '2.5 hours',
    url: null,
    verification: 'college',
    type: 'contest',
    mode: 'online',
    location: 'Online',
    starts: -28,
    time: '20:00 – 22:30',
    capacity: null,
    created: -45,
  },
  {
    id: 'evt-data-storytelling',
    title: 'Data storytelling workshop',
    organiser: 'DataCircle Bengaluru',
    description: 'How to lead with the finding, not the method — with before-and-after rewrites.',
    eligibility: 'Open to all.',
    eligibleYears: [],
    skillIds: ['data-viz', 'communication'],
    trackIds: ['data-analyst', 'higher-studies'],
    effort: '3 hours',
    url: 'https://datacircle.example/workshops/storytelling',
    verification: 'partner',
    type: 'workshop',
    mode: 'in-person',
    location: 'Seminar Hall A',
    starts: -18,
    time: '10:00 – 13:00',
    capacity: 60,
    created: -35,
  },
];

const PARTICIPATION_SEEDS: {
  handle: string;
  event: string;
  status: ParticipationStatus;
  outcome?: EventOutcome;
  reflection?: string;
  skillIds?: string[];
}[] = [
  { handle: 'ananya', event: 'evt-avelin-hack-26', status: 'registered' },
  { handle: 'ananya', event: 'evt-react-workshop', status: 'registered' },
  {
    handle: 'ananya',
    event: 'evt-avelin-hack-25',
    status: 'attended',
    outcome: 'finalist',
    reflection:
      'We built a lost-and-found app in 36 hours. I learned to cut scope hard at hour twenty — the feature we dropped was the one the judges asked about, and we had a good answer for why.',
    skillIds: ['react', 'nodejs'],
  },
  // Attended, but no reflection yet — Today nudges her to write one.
  { handle: 'ananya', event: 'evt-git-teams', status: 'attended', outcome: 'participated' },
  { handle: 'rohan', event: 'evt-avelin-hack-26', status: 'registered' },
  { handle: 'rohan', event: 'evt-data-meetup', status: 'registered' },
  { handle: 'rohan', event: 'evt-codesprint-9', status: 'registered' },
  { handle: 'rohan', event: 'evt-react-workshop', status: 'saved' },
  { handle: 'rohan', event: 'evt-avelin-hack-25', status: 'attended', outcome: 'participated' },
  {
    handle: 'rohan',
    event: 'evt-data-storytelling',
    status: 'attended',
    outcome: 'participated',
    reflection: 'Lead with the conclusion, not the method. Rewrote my IPL chart titles afterwards.',
    skillIds: ['data-viz'],
  },
  { handle: 'meera', event: 'evt-design-jam', status: 'registered' },
  {
    handle: 'meera',
    event: 'evt-git-teams',
    status: 'attended',
    outcome: 'participated',
    reflection: 'Finally understood rebasing well enough to explain it.',
    skillIds: [],
  },
  { handle: 'aditya', event: 'evt-codesprint-9', status: 'registered' },
  { handle: 'aditya', event: 'evt-avelin-hack-26', status: 'registered' },
  { handle: 'aditya', event: 'evt-payments-talk', status: 'saved' },
  {
    handle: 'aditya',
    event: 'evt-avelin-hack-25',
    status: 'attended',
    outcome: 'winner',
    reflection:
      'Won the open-data track with a bus-arrival predictor. The model was simple; the win came from cleaning the GPS data properly.',
    skillIds: ['python'],
  },
  {
    handle: 'aditya',
    event: 'evt-codesprint-8',
    status: 'attended',
    outcome: 'winner',
    reflection: 'Solved all six. Problem F was a segment tree in disguise.',
    skillIds: ['dsa', 'cpp'],
  },
  { handle: 'priya', event: 'evt-ml-study-jam', status: 'registered' },
  { handle: 'priya', event: 'evt-data-meetup', status: 'saved' },
  { handle: 'karthik', event: 'evt-codesprint-8', status: 'attended', outcome: 'participated' },
  {
    handle: 'sneha',
    event: 'evt-data-storytelling',
    status: 'attended',
    outcome: 'participated',
    reflection: 'Rewrote the first chart of my air-quality story after this.',
    skillIds: ['data-viz', 'communication'],
  },
  { handle: 'sneha', event: 'evt-data-meetup', status: 'registered' },
  { handle: 'vikram', event: 'evt-avelin-hack-26', status: 'saved' },
  {
    handle: 'divya',
    event: 'evt-git-teams',
    status: 'attended',
    outcome: 'participated',
    reflection: 'Set up branch protection for the reading-group repo afterwards.',
    skillIds: [],
  },
  { handle: 'divya', event: 'evt-ml-study-jam', status: 'saved' },
  { handle: 'nisha', event: 'evt-data-storytelling', status: 'attended', outcome: 'participated' },
  { handle: 'nisha', event: 'evt-data-meetup', status: 'saved' },
  { handle: 'farhan', event: 'evt-ml-study-jam', status: 'registered' },
  { handle: 'kavya', event: 'evt-avelin-hack-25', status: 'attended', outcome: 'participated' },
  { handle: 'kavya', event: 'evt-codesprint-8', status: 'attended', outcome: 'participated' },
  { handle: 'kavya', event: 'evt-payments-talk', status: 'registered' },
  { handle: 'siddharth', event: 'evt-oss-week', status: 'registered' },
  {
    handle: 'siddharth',
    event: 'evt-git-teams',
    status: 'attended',
    outcome: 'participated',
    reflection: 'First time using branches properly.',
    skillIds: ['git'],
  },
];

// --- Jobs --------------------------------------------------------------------------

type JobSeed = Omit<
  JobRow,
  'deadline' | 'postedBy' | 'createdAt' | 'reviewedBy' | 'reviewedAt' | 'reviewNote' | 'status'
> & {
  deadline: number;
  sharedBy?: string;
  status?: JobRow['status'];
  created: number;
};

const JOB_SEEDS: JobSeed[] = [
  {
    id: 'job-fernleaf-frontend',
    title: 'Frontend Engineering Intern',
    organiser: 'Fernleaf Labs',
    kind: 'internship',
    mode: 'hybrid',
    location: 'Bengaluru (HSR Layout)',
    compensation: '₹30,000 / month',
    duration: '6 months, from January',
    deadline: 5,
    effort: 'Full-time, 6 months',
    skillIds: ['react', 'typescript', 'javascript'],
    niceSkillIds: ['testing', 'tailwind'],
    trackIds: ['fullstack'],
    eligibleYears: [3, 4],
    eligibility: 'Third- and fourth-year students of any branch, available full-time from January.',
    description:
      'Work on the merchant dashboard used by 30,000 small businesses. You will ship real features behind flags in your first month, pair with a senior engineer, and own one feature end to end by the finish.',
    url: null,
    verification: 'college',
    created: -14,
  },
  {
    id: 'job-quillbyte-backend',
    title: 'Backend Developer Intern (Node.js)',
    organiser: 'Quillbyte',
    kind: 'internship',
    mode: 'remote',
    location: 'Remote (India)',
    compensation: '₹25,000 / month',
    duration: '3 months',
    deadline: 12,
    effort: 'Full-time, 3 months',
    skillIds: ['nodejs', 'sql', 'rest-apis'],
    niceSkillIds: ['docker', 'testing'],
    trackIds: ['fullstack', 'software-engineer'],
    eligibleYears: [3, 4],
    eligibility: 'Years 3–4. You should be comfortable building a small REST API.',
    description:
      'Quillbyte builds document tooling for publishers. Interns join the API team, write production endpoints with tests, and join the code-review rotation from week two.',
    url: 'https://careers.quillbyte.example/backend-intern',
    verification: 'partner',
    created: -16,
  },
  {
    id: 'job-tinkerbox-fullstack',
    title: 'Full-stack Developer Intern',
    organiser: 'Tinkerbox Learning',
    kind: 'internship',
    mode: 'hybrid',
    location: 'Bengaluru (Indiranagar)',
    compensation: '₹28,000 / month',
    duration: '6 months',
    deadline: 18,
    effort: 'Full-time, 6 months',
    skillIds: ['react', 'nodejs', 'sql'],
    niceSkillIds: ['typescript', 'docker'],
    trackIds: ['fullstack'],
    eligibleYears: [3, 4],
    eligibility: 'Years 3–4. Show us something you have shipped.',
    description:
      'Tinkerbox builds practice tools for school teachers. Interns ship to production in their first week and own one feature — from the database table to the button — by the end.',
    url: 'https://tinkerbox.example/careers/fullstack-intern',
    verification: 'partner',
    created: -4,
  },
  {
    id: 'job-northwind-analyst',
    title: 'Data Analyst Intern',
    organiser: 'Northwind Analytics',
    kind: 'internship',
    mode: 'onsite',
    location: 'Bengaluru (Whitefield)',
    compensation: '₹20,000 / month',
    duration: '4 months',
    deadline: 3,
    effort: 'Full-time, 4 months',
    skillIds: ['sql', 'excel', 'data-viz'],
    niceSkillIds: ['power-bi', 'python'],
    trackIds: ['data-analyst'],
    eligibleYears: [2, 3, 4],
    eligibility: 'Years 2–4, any branch. The first round includes a SQL test.',
    description:
      'Support the retail analytics team: weekly sales reporting, ad-hoc analysis for store managers, and one project of your own that you present at the end.',
    url: null,
    verification: 'college',
    created: -18,
  },
  {
    id: 'job-juniper-ml-research',
    title: 'Machine Learning Research Intern',
    organiser: 'Juniper Health AI',
    kind: 'research',
    mode: 'hybrid',
    location: 'Bengaluru',
    compensation: '₹35,000 / month',
    duration: '6 months',
    deadline: 20,
    effort: 'Full-time, 6 months',
    skillIds: ['python', 'machine-learning', 'statistics'],
    niceSkillIds: ['deep-learning', 'pandas'],
    trackIds: ['ml-engineer', 'higher-studies'],
    eligibleYears: [3, 4],
    eligibility: 'Years 3–4, with a project or paper you can discuss in depth.',
    description:
      'Work with a small research team on models that triage chest X-rays. Heavy on evaluation — expect to spend as long on failure analysis as on training.',
    url: 'https://juniperhealth.example/careers/ml-research-intern',
    verification: 'partner',
    created: -40,
  },
  {
    id: 'job-tessellate-get',
    title: 'Graduate Engineer Trainee — campus drive',
    organiser: 'Tessellate Systems',
    kind: 'campus-drive',
    mode: 'onsite',
    location: 'Pune',
    compensation: '₹7.5 LPA',
    duration: 'Full-time',
    deadline: 9,
    effort: 'Online test, then two interviews',
    skillIds: ['dsa', 'java', 'sql'],
    niceSkillIds: ['system-design'],
    trackIds: ['software-engineer'],
    eligibleYears: [4],
    eligibility: 'Final-year students graduating in 2027, all branches.',
    description:
      'Tessellate is hiring forty graduate engineers this cycle for its banking-platform teams: six months of paid training, then placement into a product team.',
    url: null,
    verification: 'college',
    created: -45,
  },
  {
    id: 'job-kitebird-design',
    title: 'Product Design Intern',
    organiser: 'Kitebird',
    kind: 'internship',
    mode: 'remote',
    location: 'Remote',
    compensation: '₹18,000 / month',
    duration: '3 months',
    deadline: 14,
    effort: '25 hours a week',
    skillIds: ['figma', 'ui-design', 'ux-research'],
    niceSkillIds: ['html-css'],
    trackIds: ['product-designer'],
    eligibleYears: [2, 3, 4],
    eligibility: 'Years 2–4, with a portfolio that includes at least one case study.',
    description:
      'Kitebird makes a travel-planning app. You will run usability tests every week and own the redesign of one flow from research to shipped.',
    url: 'https://kitebird.example/jobs/design-intern',
    verification: 'partner',
    created: -10,
  },
  {
    id: 'job-cv-lab-ra',
    title: 'Undergraduate Research Assistant — Computer Vision Lab',
    organiser: 'Avelin CV Lab, Department of CSE',
    kind: 'research',
    mode: 'onsite',
    location: 'On campus',
    compensation: '₹8,000 / month',
    duration: 'One semester, renewable',
    deadline: 7,
    effort: '10–12 hours a week',
    skillIds: ['python', 'deep-learning'],
    niceSkillIds: ['machine-learning'],
    trackIds: ['ml-engineer', 'higher-studies'],
    eligibleYears: [2, 3],
    eligibility: 'Years 2–3, with an interest in a research career.',
    description:
      'Help build a dataset of Indian road scenes and benchmark detection models on it. Sustained contributors are co-authors on the dataset paper.',
    url: null,
    verification: 'college',
    created: -12,
  },
  {
    id: 'job-oss-fellowship',
    title: 'Open Source Fellowship',
    organiser: 'Open Source Circle',
    kind: 'fellowship',
    mode: 'remote',
    location: 'Remote',
    compensation: '₹40,000 stipend in total',
    duration: '12 weeks',
    deadline: 25,
    effort: '15 hours a week',
    skillIds: ['git', 'communication'],
    niceSkillIds: ['python', 'javascript'],
    trackIds: ['exploring', 'software-engineer', 'fullstack'],
    eligibleYears: [],
    eligibility: 'Any year. You need at least one merged pull request, anywhere.',
    description:
      'Twelve weeks contributing to a mentored open-source project, with a weekly check-in and a public write-up at the end.',
    url: 'https://oss-circle.example/fellowship',
    verification: 'external',
    created: -6,
  },
  {
    id: 'job-cse-ta',
    title: 'Teaching Assistant — first-year programming lab',
    organiser: 'Department of CSE',
    kind: 'part-time',
    mode: 'onsite',
    location: 'On campus',
    compensation: '₹5,000 / month',
    duration: 'This semester',
    deadline: 4,
    effort: '6 hours a week',
    skillIds: ['python', 'communication'],
    niceSkillIds: [],
    trackIds: ['higher-studies', 'software-engineer', 'exploring'],
    eligibleYears: [3, 4],
    eligibility: 'Years 3–4.',
    description:
      'Run one lab section a week for first-years: help them debug, check weekly exercises, and hold one office hour.',
    url: null,
    verification: 'college',
    created: -8,
  },
  {
    id: 'job-quillbyte-sde',
    title: 'Software Engineer I',
    organiser: 'Quillbyte',
    kind: 'full-time',
    mode: 'hybrid',
    location: 'Bengaluru',
    compensation: '₹12 LPA',
    duration: 'Full-time',
    deadline: 30,
    effort: 'Full-time',
    skillIds: ['dsa', 'system-design', 'nodejs'],
    niceSkillIds: ['docker', 'cloud'],
    trackIds: ['software-engineer', 'fullstack'],
    eligibleYears: [4],
    eligibility: 'Graduating in 2027.',
    description:
      'Join the platform team behind Quillbyte’s document pipeline. Four rounds: coding, system design, a code-review exercise and a conversation about how you work.',
    url: 'https://careers.quillbyte.example/sde-1',
    verification: 'partner',
    created: -15,
  },
  {
    id: 'job-civiclens-fellow',
    title: 'Public Policy Data Fellowship',
    organiser: 'CivicLens Foundation',
    kind: 'fellowship',
    mode: 'remote',
    location: 'Remote',
    compensation: '₹15,000 / month',
    duration: '6 months',
    deadline: 16,
    effort: '20 hours a week',
    skillIds: ['sql', 'statistics', 'communication'],
    niceSkillIds: ['data-viz'],
    trackIds: ['data-analyst', 'higher-studies'],
    eligibleYears: [3, 4],
    eligibility: 'Years 3–4, with a writing sample.',
    description:
      'Work with a policy research team on open government data — one published analysis every six weeks, edited by a senior researcher.',
    url: 'https://civiclens.example/fellowship',
    verification: 'student',
    sharedBy: 'sneha',
    created: -30,
  },
  {
    id: 'job-paperfold-frontend',
    title: 'Frontend Intern',
    organiser: 'Paperfold',
    kind: 'internship',
    mode: 'remote',
    location: 'Remote',
    compensation: '₹20,000 / month',
    duration: '3 months',
    deadline: 10,
    effort: 'Full-time',
    skillIds: ['react', 'html-css'],
    niceSkillIds: [],
    trackIds: ['fullstack'],
    eligibleYears: [],
    eligibility: 'Not stated.',
    description:
      'Spotted on the Paperfold careers page — a small team building a note-taking app. They ask for React and a portfolio link.',
    url: 'https://paperfold.example/careers',
    verification: 'student',
    sharedBy: 'ananya',
    status: 'pending',
    created: -1,
  },
  {
    id: 'job-summer-analytics',
    title: 'Summer Analytics Intern',
    organiser: 'Northwind Analytics',
    kind: 'internship',
    mode: 'onsite',
    location: 'Bengaluru (Whitefield)',
    compensation: '₹18,000 / month',
    duration: '2 months',
    deadline: -10,
    effort: 'Full-time, 2 months',
    skillIds: ['sql', 'excel'],
    niceSkillIds: [],
    trackIds: ['data-analyst'],
    eligibleYears: [2, 3],
    eligibility: 'Years 2–3.',
    description: 'Last summer’s analytics internship. Closed.',
    url: null,
    verification: 'college',
    status: 'archived',
    created: -70,
  },
];

const APPLICATION_SEEDS: {
  handle: string;
  job: string;
  /** Each stage it passed through, with days relative to today. */
  path: [ApplicationStage, number][];
  note?: string;
}[] = [
  {
    handle: 'ananya',
    job: 'job-fernleaf-frontend',
    path: [
      ['saved', -12],
      ['applied', -10],
      ['interviewing', -2],
    ],
    note: 'Take-home done. Panel interview on Friday — revise React rendering and one system-design question.',
  },
  {
    handle: 'ananya',
    job: 'job-quillbyte-backend',
    path: [
      ['saved', -6],
      ['applied', -4],
    ],
  },
  { handle: 'ananya', job: 'job-oss-fellowship', path: [['saved', -3]] },
  {
    handle: 'rohan',
    job: 'job-northwind-analyst',
    path: [
      ['saved', -9],
      ['applied', -7],
    ],
    note: 'Sent the SQL test. Follow up on Monday if nothing.',
  },
  { handle: 'rohan', job: 'job-civiclens-fellow', path: [['saved', -5]] },
  { handle: 'rohan', job: 'job-juniper-ml-research', path: [['saved', -4]] },
  {
    handle: 'rohan',
    job: 'job-cse-ta',
    path: [
      ['saved', -4],
      ['applied', -3],
    ],
  },
  {
    handle: 'meera',
    job: 'job-kitebird-design',
    path: [
      ['saved', -6],
      ['applied', -5],
    ],
  },
  {
    handle: 'aditya',
    job: 'job-fernleaf-frontend',
    path: [
      ['saved', -8],
      ['applied', -7],
    ],
  },
  {
    handle: 'aditya',
    job: 'job-quillbyte-backend',
    path: [
      ['saved', -15],
      ['applied', -13],
      ['interviewing', -3],
    ],
  },
  {
    handle: 'priya',
    job: 'job-juniper-ml-research',
    path: [
      ['saved', -10],
      ['applied', -8],
    ],
  },
  { handle: 'priya', job: 'job-cv-lab-ra', path: [['saved', -2]] },
  {
    handle: 'sneha',
    job: 'job-northwind-analyst',
    path: [
      ['saved', -14],
      ['applied', -12],
      ['interviewing', -4],
    ],
  },
  {
    handle: 'sneha',
    job: 'job-civiclens-fellow',
    path: [
      ['saved', -20],
      ['applied', -18],
    ],
  },
  {
    handle: 'divya',
    job: 'job-juniper-ml-research',
    path: [
      ['saved', -30],
      ['applied', -28],
      ['interviewing', -15],
      ['offer', -5],
    ],
    note: 'Offer in hand — starts in January. Reply by Friday.',
  },
  {
    handle: 'divya',
    job: 'job-cv-lab-ra',
    path: [
      ['saved', -10],
      ['applied', -9],
      ['interviewing', -2],
    ],
  },
  {
    handle: 'kavya',
    job: 'job-tessellate-get',
    path: [
      ['saved', -40],
      ['applied', -38],
      ['interviewing', -20],
      ['offer', -8],
    ],
  },
  {
    handle: 'kavya',
    job: 'job-quillbyte-sde',
    path: [
      ['saved', -12],
      ['applied', -10],
    ],
  },
  { handle: 'nisha', job: 'job-northwind-analyst', path: [['saved', -2]] },
  { handle: 'vikram', job: 'job-quillbyte-backend', path: [['saved', -5]] },
  { handle: 'farhan', job: 'job-cv-lab-ra', path: [['saved', -3]] },
  { handle: 'siddharth', job: 'job-oss-fellowship', path: [['saved', -2]] },
];

// --- Build --------------------------------------------------------------------------

/**
 * The part every installation needs: the skill catalogue, the goals, the curated
 * project ideas and the institute settings. No people, no listings.
 */
function baseline(now: Date): Database {
  return {
    meta: { id: 'singleton', schemaVersion: SCHEMA_VERSION, seededAt: now.toISOString() },
    users: [],
    students: [],
    preferences: [],
    skills: SKILL_SEEDS.map((skill) => ({ ...skill })),
    tracks: TRACK_SEEDS.map((track) => ({ ...track, skills: track.skills.map((s) => ({ ...s })) })),
    studentSkills: [],
    practiceLogs: [],
    certificates: [],
    projects: [],
    projectTasks: [],
    projectMembers: [],
    joinRequests: [],
    projectIdeas: IDEA_SEEDS.map((idea) => ({ ...idea })),
    events: [],
    eventParticipation: [],
    jobs: [],
    applications: [],
    dismissals: [],
    checkins: [],
    connections: [],
    notifications: [],
    momentum: [],
    settings: {
      id: 'singleton',
      academicYear: '2026–27',
      // ⚠️ Placeholder — the college's real ERP address goes here.
      erpName: 'College ERP',
      erpUrl: 'https://erp.college.example',
      momentumPoints: { ...DEFAULT_POINTS },
      wellbeingSupport: [
        {
          // ⚠️ Placeholder — replace with the college's real counselling service.
          name: 'Student Wellness Centre',
          detail:
            'Free, confidential counselling. Walk in Monday to Saturday, 9:00–17:00, or book a slot by email.',
          contact: 'wellness@college.example',
        },
        {
          name: 'Tele-MANAS',
          detail:
            'The Government of India’s free, 24×7 mental-health helpline, in over twenty languages.',
          contact: '14416 or 1-800-891-4416',
        },
      ],
    },
    auditLogs: [],
  };
}

/**
 * @param demo false seeds only the baseline — what a real launch wants. The demo
 *   adds fourteen students, their projects, events, jobs and check-ins.
 */
export async function buildSeed({
  demo = true,
  now = new Date(),
}: { demo?: boolean; now?: Date } = {}): Promise<Database> {
  if (!demo) return baseline(now);

  const random = mulberry32(20260929);
  const TODAY = toISODate(now);
  const day = (offset: number) => addDays(TODAY, offset);
  const at = (offset: number, hour = 10) =>
    `${day(offset)}T${String(hour).padStart(2, '0')}:00:00.000Z`;

  const hash = (password: string) => bcryptHash(password, BCRYPT_COST);
  const createdAt = at(-400, 9);

  const users: UserRow[] = [];
  const students: StudentRow[] = [];
  const preferences: PreferencesRow[] = [];
  const studentSkills: StudentSkillRow[] = [];
  const practiceLogs: PracticeLogRow[] = [];
  const certificates: CertificateRow[] = [];
  const checkins: CheckinRow[] = [];

  // --- Admin ----------------------------------------------------------------
  const ADMIN_USER = 'usr-adm-01';
  users.push({
    id: ADMIN_USER,
    loginId: 'ADM01',
    role: 'admin',
    name: 'Deepa Krishnan',
    email: 'moderator@college.example',
    authId: null,
    passwordHash: await hash('admin123'),
    createdAt,
  });

  // --- Students and everything that is theirs alone --------------------------
  for (const [index, seed] of STUDENT_SEEDS.entries()) {
    const studentId = sid(index);
    const userId = `usr-${studentId}`;

    users.push({
      id: userId,
      loginId: seed.rollNo,
      role: 'student',
      name: seed.name,
      email: `${seed.rollNo.toLowerCase()}@college.example`,
      authId: null,
      passwordHash: await hash('student123'),
      createdAt,
    });

    students.push({
      id: studentId,
      userId,
      rollNo: seed.rollNo,
      name: seed.name,
      department: seed.department,
      year: seed.year,
      recordsSyncedAt: at(-2, 3),
      email: `${seed.rollNo.toLowerCase()}@college.example`,
      handle: seed.handle,
      headline: seed.headline,
      bio: seed.bio,
      trackId: seed.trackId,
      interests: seed.interests,
      weeklyHours: seed.weeklyHours,
      onboardedAt: seed.onboarded ? at(-60 + index) : null,
      createdAt,
    });

    preferences.push({
      id: `prf-${studentId}`,
      studentId,
      notify: {
        opportunities: true,
        events: true,
        projects: true,
        wellbeing: true,
        reminders: true,
      },
      emailDigest: seed.emailDigest,
      leaderboardVisible: seed.leaderboardVisible,
      portfolioPublic: seed.portfolioPublic,
      snoozeUntil: null,
    });

    for (const [skillId, level] of seed.skills) {
      studentSkills.push({
        id: `sks-${studentId}-${skillId}`,
        studentId,
        skillId,
        level,
        addedAt: at(-60 + index),
        updatedAt: at(-60 + index),
      });
    }

    for (const [skillId, sessions] of Object.entries(seed.practice ?? {})) {
      for (const [daysAgo, minutes] of sessions) {
        practiceLogs.push({
          id: `prc-${studentId}-${skillId}-${daysAgo}`,
          studentId,
          skillId,
          date: day(-daysAgo),
          minutes,
          note: '',
          createdAt: at(-daysAgo, 21),
        });
      }
    }

    for (const [n, certificate] of (seed.certificates ?? []).entries()) {
      certificates.push({
        id: `crt-${studentId}-${n + 1}`,
        studentId,
        title: certificate.title,
        issuer: certificate.issuer,
        issuedOn: day(-certificate.daysAgo),
        url: null,
        skillIds: certificate.skillIds,
        showOnPortfolio: true,
        createdAt: at(-certificate.daysAgo + 1),
      });
    }

    // Weekly check-ins, interpolated from the oldest week to the newest, with a
    // little noise so a steady student does not look copy-pasted.
    const profile = seed.checkins;
    if (profile) {
      const target = profile.to ?? profile.from;
      const weeks = [...profile.weeks].sort((a, b) => b - a); // oldest first
      const span = Math.max(1, (weeks[0] ?? 0) - (weeks[weeks.length - 1] ?? 0));

      for (const weeksAgo of weeks) {
        const t = profile.to ? ((weeks[0] ?? 0) - weeksAgo) / span : 0;
        const lerp = (a: number, b: number) => a + (b - a) * t;
        const jitter = () =>
          profile.to ? 0 : Math.round(random() * 2 - 1) * (random() < 0.35 ? 1 : 0);
        const rating = (a: number, b: number) => clamp(Math.round(lerp(a, b)) + jitter(), 1, 5);
        const week = weekStart(day(-7 * weeksAgo));

        checkins.push({
          id: `chk-${studentId}-${week}`,
          studentId,
          week,
          energy: rating(profile.from.energy, target.energy),
          stress: rating(profile.from.stress, target.stress),
          sleepHours: clamp(
            Math.round(lerp(profile.from.sleepHours, target.sleepHours) * 2) / 2 +
              (profile.to ? 0 : random() < 0.3 ? 0.5 : 0),
            3,
            10,
          ),
          workload: rating(profile.from.workload, target.workload),
          enjoyment: rating(profile.from.enjoyment, target.enjoyment),
          note: '',
          createdAt: `${addDays(week, 4)}T18:30:00.000Z`,
          updatedAt: `${addDays(week, 4)}T18:30:00.000Z`,
        });
      }
    }
  }

  // --- Projects ----------------------------------------------------------------
  const projects: ProjectRow[] = [];
  const projectTasks: ProjectTaskRow[] = [];
  const projectMembers: ProjectMemberRow[] = [];

  for (const seed of PROJECT_SEEDS) {
    const ownerId = student(seed.owner);
    const {
      owner: _owner,
      created,
      updated,
      shipped,
      fromIdea,
      demoUrl,
      tasks,
      members,
      ...fields
    } = seed;

    projects.push({
      ...fields,
      ownerId,
      repoUrl: null,
      demoUrl: demoUrl ?? null,
      source: fromIdea ? 'idea' : 'manual',
      sourceRef: fromIdea ?? null,
      createdAt: at(created),
      updatedAt: at(updated, 17),
      shippedAt: shipped === undefined ? null : at(shipped, 16),
    });

    for (const [n, task] of tasks.entries()) {
      projectTasks.push({
        id: `tsk-${seed.id.slice(4)}-${n + 1}`,
        projectId: seed.id,
        title: task.title,
        done: task.done !== undefined,
        dueDate: task.due === undefined ? null : day(task.due),
        doneAt: task.done === undefined ? null : at(task.done, 15),
        doneBy: task.done === undefined ? null : student(task.doneBy ?? seed.owner),
        createdBy: ownerId,
        createdAt: at(created),
      });
    }

    for (const member of members ?? []) {
      projectMembers.push({
        id: `mem-${seed.id.slice(4)}-${member.handle}`,
        projectId: seed.id,
        studentId: student(member.handle),
        role: member.role,
        joinedAt: at(member.joined),
      });
    }
  }

  const joinRequests: JoinRequestRow[] = JOIN_REQUEST_SEEDS.map((seed, n) => ({
    id: `jrq-${String(n + 1).padStart(3, '0')}`,
    projectId: seed.project,
    studentId: student(seed.handle),
    message: seed.message,
    status: seed.status,
    createdAt: at(seed.created, 12),
    decidedAt: seed.decided === undefined ? null : at(seed.decided, 12),
  }));

  // --- Opportunities -------------------------------------------------------------
  const userIdOf = (handle: string) => `usr-${student(handle)}`;

  const events: EventRow[] = EVENT_SEEDS.map(
    ({ starts, ends, registerBy, sharedBy, status, created, ...fields }) => {
      const pending = status === 'pending';
      return {
        ...fields,
        startsOn: day(starts),
        endsOn: ends === undefined ? null : day(ends),
        registerBy: registerBy === undefined ? null : day(registerBy),
        status: status ?? 'published',
        postedBy: sharedBy ? userIdOf(sharedBy) : ADMIN_USER,
        createdAt: at(created),
        // A student's share only goes live once a moderator has looked at it.
        reviewedBy: sharedBy && !pending ? ADMIN_USER : null,
        reviewedAt: sharedBy && !pending ? at(created + 2) : null,
        reviewNote: '',
      };
    },
  );

  const jobs: JobRow[] = JOB_SEEDS.map(({ deadline, sharedBy, status, created, ...fields }) => {
    const pending = status === 'pending';
    return {
      ...fields,
      deadline: day(deadline),
      status: status ?? 'published',
      postedBy: sharedBy ? userIdOf(sharedBy) : ADMIN_USER,
      createdAt: at(created),
      reviewedBy: sharedBy && !pending ? ADMIN_USER : null,
      reviewedAt: sharedBy && !pending ? at(created + 2) : null,
      reviewNote: '',
    };
  });

  const eventParticipation: EventParticipationRow[] = PARTICIPATION_SEEDS.map((seed) => ({
    id: `par-${student(seed.handle)}-${seed.event}`,
    eventId: seed.event,
    studentId: student(seed.handle),
    status: seed.status,
    outcome: seed.outcome ?? null,
    reflection: seed.reflection ?? '',
    skillIds: seed.skillIds ?? [],
    updatedAt: at(-1),
  }));

  const applications: ApplicationRow[] = APPLICATION_SEEDS.map((seed) => {
    const timeline = seed.path.map(([stage, offset]) => ({ stage, at: at(offset, 11) }));
    const last = timeline[timeline.length - 1];
    return {
      id: `app-${student(seed.handle)}-${seed.job}`,
      jobId: seed.job,
      studentId: student(seed.handle),
      stage: last?.stage ?? 'saved',
      note: seed.note ?? '',
      timeline,
      createdAt: timeline[0]?.at ?? at(-1),
      updatedAt: last?.at ?? at(-1),
    };
  });

  // --- Notifications ----------------------------------------------------------------
  const notifications: NotificationRow[] = [
    {
      id: 'ntf-001',
      userId: userIdOf('ananya'),
      kind: 'projects',
      title: 'Meera Iyer wants to join StudySync',
      body: '“I can take the room screens — I have done two Figma redesigns this year…”',
      link: '/student/projects/prj-studysync',
      dedupeKey: 'join:jrq-001',
      createdAt: at(-1, 12),
      readAt: null,
      dismissedAt: null,
    },
    {
      id: 'ntf-002',
      userId: userIdOf('ananya'),
      kind: 'opportunities',
      title: 'Your shared listing is waiting for review',
      body: '“Frontend Intern” at Paperfold goes live for everyone once a moderator checks it.',
      link: '/student/jobs/job-paperfold-frontend',
      dedupeKey: 'share:job-paperfold-frontend',
      createdAt: at(-1, 9),
      readAt: null,
      dismissedAt: null,
    },
    {
      id: 'ntf-003',
      userId: userIdOf('ananya'),
      kind: 'opportunities',
      title: 'New match: Backend Developer Intern (Node.js)',
      body: 'Quillbyte · You list Node.js, SQL and REST API design — all three skills it asks for.',
      link: '/student/jobs/job-quillbyte-backend',
      dedupeKey: 'match:job-quillbyte-backend',
      createdAt: at(-16, 10),
      readAt: at(-15, 10),
      dismissedAt: null,
    },
    {
      id: 'ntf-004',
      userId: userIdOf('aditya'),
      kind: 'projects',
      title: 'Vikram Singh wants to join Distributed rate limiter',
      body: '“I have been reading Designing Data-Intensive Applications and want to build something real with it…”',
      link: '/student/projects/prj-rate-limiter',
      dedupeKey: 'join:jrq-002',
      createdAt: at(-2, 12),
      readAt: null,
      dismissedAt: null,
    },
    {
      id: 'ntf-005',
      userId: userIdOf('priya'),
      kind: 'events',
      title: 'Your shared event is live',
      body: '“ML Study Jam: tabular competitions” was reviewed and is now visible to everyone.',
      link: '/student/events/evt-ml-study-jam',
      dedupeKey: 'review:evt-ml-study-jam',
      createdAt: at(-9, 10),
      readAt: at(-9, 14),
      dismissedAt: null,
    },
    {
      id: 'ntf-006',
      userId: ADMIN_USER,
      kind: 'moderation',
      title: 'Rohan Verma shared an event for review',
      body: '“Cloud Resume Challenge study group” — student-shared, external link.',
      link: '/admin/events?status=pending',
      dedupeKey: 'review-request:evt-cloud-resume',
      createdAt: at(-3, 10),
      readAt: null,
      dismissedAt: null,
    },
    {
      id: 'ntf-007',
      userId: ADMIN_USER,
      kind: 'moderation',
      title: 'Ananya Sharma shared a job for review',
      body: '“Frontend Intern” at Paperfold — student-shared, external link.',
      link: '/admin/jobs?status=pending',
      dedupeKey: 'review-request:job-paperfold-frontend',
      createdAt: at(-1, 9),
      readAt: null,
      dismissedAt: null,
    },
  ];

  const db: Database = {
    ...baseline(now),
    users,
    students,
    preferences,
    studentSkills,
    practiceLogs,
    certificates,
    projects,
    projectTasks,
    projectMembers,
    joinRequests,
    events,
    eventParticipation,
    jobs,
    applications,
    checkins,
    notifications,
  };

  // Points come from the same engine the API uses — never written by hand.
  for (const row of students) rebuildLedger(db, row.id, TODAY);

  return db;
}
