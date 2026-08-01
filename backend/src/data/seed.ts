/**
 * First-run dataset. Runs once, when no data file exists yet.
 *
 * The numbers are generated from a fixed PRNG seed, so every machine that seeds
 * this project gets byte-identical data — which is what makes the Step 5
 * verification ("student #1 and student #2 show different marks", "a student
 * under 75% shows the red banner") reproducible rather than luck.
 */
import { hash as bcryptHash } from 'bcryptjs';

import {
  DEFAULT_WEIGHTS,
  PHYSICAL_POINTS_FOR_100,
  SOCIAL_POINTS_FOR_100,
  academicScore,
  adaptabilityScore,
  calculateOaa,
  pointsToScore,
} from '../lib/oaa.js';
import { ADAPTABILITY_CRITERIA } from './types.js';
import type {
  AdaptabilityAssessmentRow,
  AdaptabilityCriterion,
  AnnouncementRow,
  AssignmentRow,
  AssignmentSubmissionRow,
  AttendanceRow,
  Database,
  EventRegistrationRow,
  EventType,
  MarkRow,
  OaaScoreRow,
  PhysicalActivity,
  PhysicalRecordRow,
  SocialActivity,
  SocialRecordRow,
  StudentRow,
  SubjectRow,
  SubmissionStatus,
  TeacherAssignmentRow,
  TeacherRow,
  TimetableSlotRow,
  UserRow,
} from './types.js';

const BCRYPT_COST = 10;

/** Semester 5 term window. Attendance is recorded across these dates only. */
const TERM_START = '2026-04-06';
const TERM_END = '2026-07-31';
const CURRENT_SEMESTER = 5;

const DEPARTMENT = 'Computer Science & Engineering';

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

/** Every date in the window falling on one of `weekdays` (0 = Sunday). */
function classDates(startISO: string, endISO: string, weekdays: number[]): string[] {
  const dates: string[] = [];
  const end = Date.parse(`${endISO}T00:00:00Z`);

  for (let ms = Date.parse(`${startISO}T00:00:00Z`); ms <= end; ms += 86_400_000) {
    const day = new Date(ms);
    if (weekdays.includes(day.getUTCDay())) dates.push(day.toISOString().slice(0, 10));
  }

  return dates;
}

interface SubjectSeed {
  code: string;
  name: string;
  credits: number;
  /** Weekdays this subject meets — Monday is 1. */
  days: number[];
}

const SUBJECTS_BY_SEMESTER: Record<number, SubjectSeed[]> = {
  3: [
    { code: 'CS301', name: 'Data Structures', credits: 4, days: [1, 3] },
    { code: 'CS302', name: 'Digital Logic Design', credits: 3, days: [2, 4] },
    { code: 'CS303', name: 'Object-Oriented Programming', credits: 4, days: [1, 4] },
    { code: 'MA301', name: 'Discrete Mathematics', credits: 3, days: [2, 5] },
    { code: 'HS301', name: 'Professional Communication', credits: 2, days: [3, 5] },
  ],
  4: [
    { code: 'CS401', name: 'Design & Analysis of Algorithms', credits: 4, days: [1, 3] },
    { code: 'CS402', name: 'Computer Organisation & Architecture', credits: 4, days: [2, 4] },
    { code: 'CS403', name: 'Operating Systems', credits: 4, days: [1, 4] },
    { code: 'CS404', name: 'Database Management Systems', credits: 3, days: [2, 5] },
    { code: 'MA401', name: 'Probability & Statistics', credits: 3, days: [3, 5] },
  ],
  5: [
    { code: 'CS501', name: 'Computer Networks', credits: 4, days: [1, 3] },
    { code: 'CS502', name: 'Software Engineering', credits: 3, days: [2, 4] },
    { code: 'CS503', name: 'Theory of Computation', credits: 3, days: [1, 4] },
    { code: 'CS504', name: 'Machine Learning', credits: 4, days: [2, 5] },
    { code: 'CS505', name: 'Web Technologies', credits: 3, days: [3, 5] },
  ],
};

interface TeacherSeed {
  staffId: string;
  name: string;
  password: string;
  designation: string;
  phone: string;
  /** Subject codes this teacher owns. Every section of each is theirs. */
  subjectCodes: string[];
}

/**
 * Two teachers, deliberately. The whole teacher write path is gated on "is this
 * subject yours", and a single teacher who owns everything would let that check
 * pass by accident. TCH01 and TCH02 split semester 5 between them.
 */
const TEACHER_SEEDS: TeacherSeed[] = [
  {
    staffId: 'TCH01',
    name: 'Dr. Rajesh Menon',
    password: 'teacher123',
    designation: 'Professor',
    phone: '+91 98860 30114',
    subjectCodes: ['CS501', 'CS502', 'CS503'],
  },
  {
    staffId: 'TCH02',
    name: 'Dr. Anita Deshpande',
    password: 'teacher123',
    designation: 'Associate Professor',
    phone: '+91 98860 30115',
    subjectCodes: ['CS504', 'CS505'],
  },
];

/** Semesters that carry marks, and so carry an OAA row and a trend point. */
const GRADED_SEMESTERS = [3, 4, 5] as const;

/** When each semester's OAA was computed — drives the trend's x-axis. */
const SEMESTER_END: Record<number, string> = {
  3: '2025-04-30T10:00:00.000Z',
  4: '2025-11-28T10:00:00.000Z',
  5: '2026-07-31T10:00:00.000Z',
};

const ADAPTABILITY_NOTES = [
  'Handles a changed brief without losing the thread. Speaks up in reviews.',
  'Reliable on delivery; still prefers being given the plan to writing it.',
  'Took over the group submission when a teammate dropped out mid-week.',
  'Strong in the lab, quieter in seminars — worth drawing out.',
  'Asks good questions early rather than stalling on a blocker.',
];

const PHYSICAL_ACTIVITIES: ActivitySeed<PhysicalActivity>[] = [
  { activity: 'fitnessTest', label: 'Semester fitness assessment', min: 8, max: 20 },
  { activity: 'sport', label: 'Inter-section football', min: 6, max: 14 },
  { activity: 'sport', label: 'Athletics — 400m', min: 6, max: 12 },
  { activity: 'peAttendance', label: 'PE attendance', min: 5, max: 16 },
  { activity: 'tournament', label: 'Inter-college basketball', min: 10, max: 22 },
];

const SOCIAL_ACTIVITIES: ActivitySeed<SocialActivity>[] = [
  { activity: 'event', label: 'Prayaan technical symposium', min: 6, max: 14 },
  { activity: 'volunteering', label: 'Digital literacy outreach', min: 8, max: 16 },
  { activity: 'club', label: 'Robotics club — active member', min: 5, max: 12 },
  { activity: 'mentoring', label: 'First-year lab mentor', min: 8, max: 18 },
  { activity: 'outreach', label: 'Blood donation drive', min: 4, max: 10 },
];

interface ActivitySeed<T> {
  activity: T;
  label: string;
  min: number;
  max: number;
}

interface AssignmentSeed {
  title: string;
  description: string;
  dueDate: string;
  maxMarks: number;
  postedAt: string;
}

/** One per current-semester subject. The last is still open, so nothing is ever
 *  an empty "you have no assignments" screen. */
const ASSIGNMENT_SEEDS: AssignmentSeed[] = [
  {
    title: 'Socket programming — build a chat server',
    description:
      'Implement a multi-client TCP chat server with a threaded connection handler. Submit source, a README and a short design note on how you handled concurrent writes.',
    dueDate: '2026-06-19',
    maxMarks: 20,
    postedAt: '2026-05-28T09:00:00.000Z',
  },
  {
    title: 'Requirements specification for a campus app',
    description:
      'Produce an SRS for a hostel-management module: stakeholders, functional and non-functional requirements, and two use-case diagrams.',
    dueDate: '2026-07-03',
    maxMarks: 15,
    postedAt: '2026-06-12T09:00:00.000Z',
  },
  {
    title: 'Pumping lemma proofs',
    description:
      'Prove three of the five given languages non-regular. Full working required — a correct verdict with no derivation earns nothing.',
    dueDate: '2026-07-17',
    maxMarks: 15,
    postedAt: '2026-06-26T09:00:00.000Z',
  },
  {
    title: 'Train and evaluate a classifier',
    description:
      'Using the provided dataset, train any two classifiers and compare them on precision, recall and F1. Discuss why the weaker one loses.',
    dueDate: '2026-07-24',
    maxMarks: 25,
    postedAt: '2026-07-01T09:00:00.000Z',
  },
  {
    title: 'Responsive portfolio site',
    description:
      'Build a three-page site with semantic HTML and no CSS framework. Must pass a keyboard-only walkthrough and reach AA contrast throughout.',
    dueDate: '2026-08-14',
    maxMarks: 20,
    postedAt: '2026-07-22T09:00:00.000Z',
  },
];

const SUBMISSION_FEEDBACK = [
  'Clean solution and a genuinely good design note. Watch your error handling on the edge cases.',
  'Correct, but the write-up assumes the reader already knows what you did. Explain the why.',
  'Solid work. The comparison section is where you lost marks — it describes rather than argues.',
  'Submitted on time and it runs. Structure needs work; three functions are doing five jobs.',
  'Strong. This is close to the standard I would expect in a final-year project.',
];

interface EventSeed {
  id: string;
  title: string;
  description: string;
  type: EventType;
  date: string;
  time: string;
  venue: string;
  capacity: number;
  organiser: string;
  socialPoints: number;
}

const EVENT_SEEDS: EventSeed[] = [
  {
    id: 'evt-prayaan-2026',
    title: 'Prayaan 2026 — Annual Technical Symposium',
    description:
      'Two days of paper presentations, a 24-hour hackathon and an industry keynote. Departments compete for the rolling trophy.',
    type: 'technical',
    date: '2026-08-12',
    time: '09:00 – 18:00',
    venue: 'Main Auditorium',
    capacity: 400,
    organiser: 'Department of Computer Science & Engineering',
    socialPoints: 12,
  },
  {
    id: 'evt-applied-ai',
    title: 'Industry Connect: Careers in Applied AI',
    description:
      'Engineers from three product companies on what they actually hire for, followed by an open floor. Bring questions, not a résumé.',
    type: 'workshop',
    date: '2026-08-23',
    time: '14:00 – 16:30',
    venue: 'Seminar Hall B',
    capacity: 120,
    organiser: 'Placement Cell',
    socialPoints: 8,
  },
  {
    id: 'evt-sports-meet',
    title: 'Inter-Departmental Sports Meet',
    description:
      'Athletics, football, basketball and volleyball across three days. Registration closes a week before the opening fixture.',
    type: 'sports',
    date: '2026-09-05',
    time: '07:30 – 17:00',
    venue: 'Sports Complex',
    capacity: 300,
    organiser: 'Physical Education Department',
    socialPoints: 10,
  },
  {
    id: 'evt-digital-literacy',
    title: 'Community Outreach — Digital Literacy Drive',
    description:
      'Teach basic computing and online safety at the Whitefield community centre. Six Saturdays; volunteers commit to at least three.',
    type: 'social',
    date: '2026-09-19',
    time: '10:00 – 13:00',
    venue: 'Whitefield Community Centre',
    capacity: 60,
    organiser: 'NSS Unit',
    socialPoints: 15,
  },
  {
    id: 'evt-alumni-panel',
    title: 'Alumni Panel — The First Two Years',
    description:
      'Four graduates from the last three batches on what the transition to work was actually like.',
    type: 'cultural',
    date: '2026-07-11',
    time: '15:00 – 17:00',
    venue: 'Seminar Hall A',
    capacity: 150,
    organiser: 'Alumni Association',
    socialPoints: 6,
  },
];

const ANNOUNCEMENT_SEEDS: Omit<AnnouncementRow, 'id'>[] = [
  {
    title: 'Semester 5 internal assessment schedule published',
    body: 'The second internal assessment runs from 18 to 22 August. The detailed timetable is on the department notice board and in your portal timetable. Students below the 75% attendance threshold should speak to their class advisor before the first paper.',
    category: 'examination',
    audience: 'semester',
    department: 'Computer Science & Engineering',
    semester: 5,
    postedBy: 'Examination Cell',
    postedAt: '2026-07-29T10:30:00.000Z',
    pinned: true,
  },
  {
    title: 'Prayaan 2026 registrations now open',
    body: 'Registration for the annual technical symposium is open until 5 August. Participation counts towards the social dimension of your ability assessment. Teams of up to four for the hackathon track.',
    category: 'event',
    audience: 'all',
    department: null,
    semester: null,
    postedBy: 'Students Union',
    postedAt: '2026-07-26T09:00:00.000Z',
    pinned: true,
  },
  {
    title: 'Library extended hours during assessment weeks',
    body: 'The central library will stay open until 22:00 on weekdays from 10 August through 28 August. The reading hall on the second floor is reserved for final-year students after 18:00.',
    category: 'general',
    audience: 'all',
    department: null,
    semester: null,
    postedBy: 'Central Library',
    postedAt: '2026-07-24T14:15:00.000Z',
    pinned: false,
  },
  {
    title: 'Machine Learning lab rescheduled to Friday',
    body: 'This week only, the Thursday ML lab moves to Friday 13:45 in CS-204, because of the guest lecture in the main lab. Batch 2 should report at 15:35 instead.',
    category: 'academic',
    audience: 'semester',
    department: 'Computer Science & Engineering',
    semester: 5,
    postedBy: 'Dr. Anita Deshpande',
    postedAt: '2026-07-22T16:40:00.000Z',
    pinned: false,
  },
  {
    title: 'Anti-ragging committee — reporting channels',
    body: 'The committee meets on the first Monday of each month. Reports may be made in person to any member, through the box outside the administrative block, or anonymously via the college helpline. Every report is acted on.',
    category: 'urgent',
    audience: 'all',
    department: null,
    semester: null,
    postedBy: 'Office of the Principal',
    postedAt: '2026-07-15T08:00:00.000Z',
    pinned: false,
  },
  {
    title: 'Elective registration for semester 6 closes 30 August',
    body: 'Choose three electives in order of preference through the portal. Allotment is by CGPA where a course is oversubscribed. Late registration is not accepted — an unregistered student is allotted by the department.',
    category: 'academic',
    audience: 'department',
    department: 'Computer Science & Engineering',
    semester: null,
    postedBy: 'Head of Department',
    postedAt: '2026-07-11T11:20:00.000Z',
    pinned: false,
  },
];

/**
 * Spends a point budget across activities, so a student's Physical or Social score
 * arrives as a handful of named records rather than one opaque number. Stops once
 * the budget is spent, which is why a low-scoring student shows fewer lines.
 */
function splitIntoRecords<T>(
  budget: number,
  catalogue: ActivitySeed<T>[],
  random: () => number,
): { activity: T; label: string; points: number }[] {
  const records: { activity: T; label: string; points: number }[] = [];
  let remaining = budget;

  for (const entry of catalogue) {
    if (remaining <= 0) break;

    const points = Math.min(remaining, Math.round(entry.min + random() * (entry.max - entry.min)));
    if (points <= 0) continue;

    records.push({ activity: entry.activity, label: entry.label, points });
    remaining -= points;
  }

  return records;
}

interface StudentSeed {
  rollNo: string;
  name: string;
  password: string;
  dob: string;
  gender: string;
  section: string;
  bloodGroup: string;
  phone: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  /** Mean mark percentage. Drives both internal and external generation. */
  ability: number;
  /** Share of classes attended. 22CS002 sits below the 75% threshold on purpose. */
  attendanceRate: number;
  /** Mean adaptability rating, 1–5. The seven sub-criteria jitter around it. */
  adaptability: number;
  /**
   * Physical points per semester, or `null` for a student with no physical record
   * at all. 22CS007 is deliberately null: it is the missing-data rule on screen,
   * and without one such student that branch is only ever exercised by a test.
   */
  physicalPoints: number | null;
  /** Social points per semester — events, volunteering, clubs, mentoring. */
  socialPoints: number;
}

const STUDENT_SEEDS: StudentSeed[] = [
  {
    rollNo: '22CS001',
    name: 'Ananya Sharma',
    password: 'student123',
    dob: '2004-07-14',
    gender: 'Female',
    section: 'A',
    bloodGroup: 'O+',
    phone: '+91 98450 11021',
    address: '14 Nandi Layout, Malleswaram, Bengaluru 560003',
    guardianName: 'Sunil Sharma',
    guardianPhone: '+91 98450 11020',
    ability: 84,
    attendanceRate: 0.88,
    adaptability: 4.4,
    physicalPoints: 44,
    socialPoints: 41,
  },
  {
    rollNo: '22CS002',
    name: 'Rohan Verma',
    password: 'student123',
    dob: '2004-02-28',
    gender: 'Male',
    section: 'A',
    bloodGroup: 'B+',
    phone: '+91 99016 44872',
    address: '7/2 Kaveri Nagar, Jayanagar, Bengaluru 560041',
    guardianName: 'Anil Verma',
    guardianPhone: '+91 99016 44870',
    ability: 57,
    attendanceRate: 0.67,
    adaptability: 2.6,
    physicalPoints: 31,
    socialPoints: 12,
  },
  {
    rollNo: '22CS003',
    name: 'Meera Iyer',
    password: 'student123',
    dob: '2004-11-09',
    gender: 'Female',
    section: 'B',
    bloodGroup: 'A+',
    phone: '+91 90352 77413',
    address: '221 Lake View Road, Indiranagar, Bengaluru 560038',
    guardianName: 'Ramesh Iyer',
    guardianPhone: '+91 90352 77410',
    ability: 74,
    attendanceRate: 0.79,
    adaptability: 3.7,
    physicalPoints: 52,
    socialPoints: 28,
  },
  {
    rollNo: '22CS004',
    name: 'Aditya Nair',
    password: 'student123',
    dob: '2004-05-02',
    gender: 'Male',
    section: 'A',
    bloodGroup: 'AB+',
    phone: '+91 97414 20356',
    address: '32 Brigade Enclave, Koramangala, Bengaluru 560034',
    guardianName: 'Suresh Nair',
    guardianPhone: '+91 97414 20350',
    ability: 91,
    attendanceRate: 0.94,
    adaptability: 4.7,
    physicalPoints: 38,
    socialPoints: 47,
  },
  {
    rollNo: '22CS005',
    name: 'Priya Menon',
    password: 'student123',
    dob: '2004-09-21',
    gender: 'Female',
    section: 'B',
    bloodGroup: 'O-',
    phone: '+91 90080 61147',
    address: '5 Hosur Gardens, BTM Layout, Bengaluru 560076',
    guardianName: 'Latha Menon',
    guardianPhone: '+91 90080 61140',
    ability: 68,
    attendanceRate: 0.83,
    adaptability: 3.9,
    physicalPoints: 57,
    socialPoints: 33,
  },
  {
    rollNo: '22CS006',
    name: 'Karthik Reddy',
    password: 'student123',
    dob: '2004-01-17',
    gender: 'Male',
    section: 'A',
    bloodGroup: 'B-',
    phone: '+91 99725 38804',
    address: '78 Sarjapur Main Road, Bellandur, Bengaluru 560103',
    guardianName: 'Mohan Reddy',
    guardianPhone: '+91 99725 38800',
    ability: 62,
    attendanceRate: 0.76,
    adaptability: 3.1,
    physicalPoints: 49,
    socialPoints: 9,
  },
  {
    rollNo: '22CS007',
    name: 'Sneha Kulkarni',
    password: 'student123',
    dob: '2004-12-04',
    gender: 'Female',
    section: 'B',
    bloodGroup: 'A-',
    phone: '+91 88849 17265',
    address: '19 Raj Villa, Rajajinagar, Bengaluru 560010',
    guardianName: 'Prakash Kulkarni',
    guardianPhone: '+91 88849 17260',
    ability: 79,
    attendanceRate: 0.86,
    adaptability: 4.1,
    // No physical record on file — the missing-data rule, visible in the UI.
    physicalPoints: null,
    socialPoints: 36,
  },
  {
    rollNo: '22CS008',
    name: 'Vikram Singh',
    password: 'student123',
    dob: '2003-08-30',
    gender: 'Male',
    section: 'A',
    bloodGroup: 'O+',
    phone: '+91 96322 74019',
    address: '241 Cantonment Road, Frazer Town, Bengaluru 560005',
    guardianName: 'Jaswant Singh',
    guardianPhone: '+91 96322 74010',
    ability: 53,
    attendanceRate: 0.71,
    adaptability: 2.9,
    physicalPoints: 58,
    socialPoints: 18,
  },
  {
    rollNo: '22CS009',
    name: 'Divya Pillai',
    password: 'student123',
    dob: '2004-03-12',
    gender: 'Female',
    section: 'B',
    bloodGroup: 'B+',
    phone: '+91 98801 55372',
    address: '63 Palm Grove, Whitefield, Bengaluru 560066',
    guardianName: 'Rajan Pillai',
    guardianPhone: '+91 98801 55370',
    ability: 87,
    attendanceRate: 0.91,
    adaptability: 4.5,
    physicalPoints: 41,
    socialPoints: 44,
  },
  {
    rollNo: '22CS010',
    name: 'Arjun Bose',
    password: 'student123',
    dob: '2004-06-25',
    gender: 'Male',
    section: 'A',
    bloodGroup: 'AB-',
    phone: '+91 94488 09163',
    address: '11 Lakeside Colony, Hebbal, Bengaluru 560024',
    guardianName: 'Debashish Bose',
    guardianPhone: '+91 94488 09160',
    ability: 71,
    attendanceRate: 0.81,
    adaptability: 3.4,
    physicalPoints: 26,
    socialPoints: 22,
  },
];

export async function buildSeed(): Promise<Database> {
  const random = mulberry32(20260801);

  const users: UserRow[] = [];
  const students: StudentRow[] = [];
  const teachers: TeacherRow[] = [];
  const teacherAssignments: TeacherAssignmentRow[] = [];
  const subjects: SubjectRow[] = [];
  const marks: MarkRow[] = [];
  const attendance: AttendanceRow[] = [];
  const adaptabilityAssessments: AdaptabilityAssessmentRow[] = [];
  const physicalRecords: PhysicalRecordRow[] = [];
  const socialRecords: SocialRecordRow[] = [];
  const oaaScores: OaaScoreRow[] = [];
  const timetable: TimetableSlotRow[] = [];
  const assignments: AssignmentRow[] = [];
  const submissions: AssignmentSubmissionRow[] = [];
  const eventRegistrations: EventRegistrationRow[] = [];

  const createdAt = new Date('2026-04-01T09:00:00.000Z').toISOString();
  const hash = (password: string) => bcryptHash(password, BCRYPT_COST);

  // --- Staff ------------------------------------------------------------
  for (const [index, seed] of TEACHER_SEEDS.entries()) {
    const teacherId = `tch-${String(index + 1).padStart(3, '0')}`;
    const userId = `usr-${teacherId}`;

    users.push({
      id: userId,
      loginId: seed.staffId,
      role: 'teacher',
      name: seed.name,
      passwordHash: await hash(seed.password),
      createdAt,
    });

    teachers.push({
      id: teacherId,
      userId,
      staffId: seed.staffId,
      name: seed.name,
      department: DEPARTMENT,
      designation: seed.designation,
      email: `${seed.staffId.toLowerCase()}@oaa.edu.in`,
      phone: seed.phone,
    });
  }

  users.push({
    id: 'usr-adm-01',
    loginId: 'ADM01',
    role: 'admin',
    name: 'Priya Nair',
    passwordHash: await hash('admin123'),
    createdAt,
  });

  // --- Subjects ---------------------------------------------------------
  for (const [semester, list] of Object.entries(SUBJECTS_BY_SEMESTER)) {
    for (const subject of list) {
      subjects.push({
        id: `sub-${subject.code.toLowerCase()}`,
        code: subject.code,
        name: subject.name,
        department: DEPARTMENT,
        semester: Number(semester),
        credits: subject.credits,
        internalMax: 40,
        externalMax: 60,
      });
    }
  }

  // --- Who teaches what -------------------------------------------------
  const SECTIONS = [...new Set(STUDENT_SEEDS.map((seed) => seed.section))].sort();

  /** Subject id → the user id of the teacher who owns it, for `markedBy`. */
  const ownerOf = new Map<string, string>();

  for (const [index, seed] of TEACHER_SEEDS.entries()) {
    const teacher = teachers[index];
    if (!teacher) continue;

    for (const code of seed.subjectCodes) {
      const subject = subjects.find((row) => row.code === code);
      if (!subject) continue;

      ownerOf.set(subject.id, teacher.userId);

      for (const section of SECTIONS) {
        teacherAssignments.push({
          id: `asg-${teacher.id}-${code.toLowerCase()}-${section.toLowerCase()}`,
          teacherId: teacher.id,
          subjectId: subject.id,
          section,
        });
      }
    }
  }

  // --- Students, their marks and their attendance -----------------------
  for (const [index, seed] of STUDENT_SEEDS.entries()) {
    const studentId = `stu-${String(index + 1).padStart(3, '0')}`;
    const userId = `usr-${studentId}`;

    users.push({
      id: userId,
      loginId: seed.rollNo,
      role: 'student',
      name: seed.name,
      passwordHash: await hash(seed.password),
      createdAt,
    });

    students.push({
      id: studentId,
      userId,
      rollNo: seed.rollNo,
      name: seed.name,
      dob: seed.dob,
      gender: seed.gender,
      department: DEPARTMENT,
      semester: CURRENT_SEMESTER,
      section: seed.section,
      admissionYear: 2022,
      bloodGroup: seed.bloodGroup,
      email: `${seed.rollNo.toLowerCase()}@oaa.edu.in`,
      phone: seed.phone,
      address: seed.address,
      guardianName: seed.guardianName,
      guardianPhone: seed.guardianPhone,
      photoUrl: null,
    });

    for (const subject of subjects) {
      // Internals are coursework — students typically score a little higher there.
      const internalPct = clamp(seed.ability + 8 + (random() * 14 - 7), 35, 100);
      const externalPct = clamp(seed.ability - 2 + (random() * 16 - 8), 30, 100);

      marks.push({
        id: `mrk-${studentId}-${subject.code.toLowerCase()}`,
        studentId,
        subjectId: subject.id,
        semester: subject.semester,
        internal: Math.round((internalPct / 100) * subject.internalMax),
        external: Math.round((externalPct / 100) * subject.externalMax),
      });

      if (subject.semester !== CURRENT_SEMESTER) continue;

      const days = SUBJECTS_BY_SEMESTER[subject.semester]?.find(
        (entry) => entry.code === subject.code,
      )?.days;
      if (!days) continue;

      // Per-subject drift, so one weak subject can drag the overall percentage.
      const rate = clamp(seed.attendanceRate + (random() * 0.1 - 0.05), 0.4, 0.99);

      for (const date of classDates(TERM_START, TERM_END, days)) {
        attendance.push({
          id: `att-${studentId}-${subject.code.toLowerCase()}-${date}`,
          studentId,
          subjectId: subject.id,
          date,
          status: random() < rate ? 'present' : 'absent',
          markedBy: ownerOf.get(subject.id) ?? '',
        });
      }
    }

    // --- OAA inputs, one set per semester so the trend line has history ---
    for (const semester of GRADED_SEMESTERS) {
      const recordedAt = SEMESTER_END[semester] ?? createdAt;

      // Adaptability grows a little each semester, and each criterion jitters
      // around the student's mean — a flat 4/4/4/4/4/4/4 would look entered, not
      // rated. The spread has to beat rounding to show up: ±0.6 collapsed to a
      // single value for most students, so it is ±1.2.
      const drift = (semester - CURRENT_SEMESTER) * 0.25;
      const scores = Object.fromEntries(
        ADAPTABILITY_CRITERIA.map((criterion) => [
          criterion,
          Math.round(clamp(seed.adaptability + drift + (random() * 2.4 - 1.2), 1, 5)),
        ]),
      ) as Record<AdaptabilityCriterion, number>;

      adaptabilityAssessments.push({
        id: `adp-${studentId}-s${semester}`,
        studentId,
        // Split by student, not by semester: each teacher then opens the
        // assessments page to a realistic mix of "rated" and "not yet rated"
        // rather than to a list that is entirely one or the other.
        teacherId: teachers[index % teachers.length]?.id ?? 'tch-001',
        semester,
        scores,
        note: ADAPTABILITY_NOTES[Math.floor(random() * ADAPTABILITY_NOTES.length)] ?? '',
        recordedAt,
      });

      if (seed.physicalPoints !== null) {
        const budget = Math.round(seed.physicalPoints * (0.85 + random() * 0.3));
        physicalRecords.push(
          ...splitIntoRecords(budget, PHYSICAL_ACTIVITIES, random).map((entry, n) => ({
            id: `phy-${studentId}-s${semester}-${n}`,
            studentId,
            semester,
            activity: entry.activity,
            label: entry.label,
            points: entry.points,
            recordedAt,
          })),
        );
      }

      const socialBudget = Math.round(seed.socialPoints * (0.85 + random() * 0.3));
      socialRecords.push(
        ...splitIntoRecords(socialBudget, SOCIAL_ACTIVITIES, random).map((entry, n) => ({
          id: `soc-${studentId}-s${semester}-${n}`,
          studentId,
          semester,
          activity: entry.activity,
          label: entry.label,
          points: entry.points,
          recordedBy: teachers[0]?.userId ?? '',
          recordedAt,
        })),
      );
    }
  }

  // --- Weekly timetable --------------------------------------------------
  //
  // Built from each subject's own `days`, so the grid and the attendance records
  // agree about which days a subject meets. A timetable that disagreed with the
  // attendance rows would be the kind of detail that quietly reads as fake.
  const currentSubjects = subjects.filter((subject) => subject.semester === CURRENT_SEMESTER);

  for (const section of SECTIONS) {
    for (const [subjectIndex, subject] of currentSubjects.entries()) {
      const days = SUBJECTS_BY_SEMESTER[CURRENT_SEMESTER]?.find(
        (entry) => entry.code === subject.code,
      )?.days;
      if (!days) continue;

      for (const [n, day] of days.entries()) {
        // Stagger the period per subject so no two land in the same slot.
        const period = ((subjectIndex + n * 2) % 6) + 1;

        timetable.push({
          id: `tt-${section.toLowerCase()}-${subject.code.toLowerCase()}-d${day}`,
          department: DEPARTMENT,
          semester: CURRENT_SEMESTER,
          section,
          day,
          period,
          subjectId: subject.id,
          teacherId:
            teachers.find((teacher) =>
              teacherAssignments.some(
                (assignment) =>
                  assignment.teacherId === teacher.id && assignment.subjectId === subject.id,
              ),
            )?.id ?? 'tch-001',
          room: `${section === 'A' ? 'CS-20' : 'CS-30'}${subjectIndex + 1}`,
        });
      }
    }
  }

  // --- Assignments and each student's submission -------------------------
  for (const [subjectIndex, subject] of currentSubjects.entries()) {
    const spec = ASSIGNMENT_SEEDS[subjectIndex % ASSIGNMENT_SEEDS.length];
    if (!spec) continue;

    const assignmentId = `asn-${subject.code.toLowerCase()}`;
    assignments.push({
      id: assignmentId,
      subjectId: subject.id,
      title: spec.title,
      description: spec.description,
      dueDate: spec.dueDate,
      maxMarks: spec.maxMarks,
      teacherId:
        teachers.find((teacher) =>
          teacherAssignments.some(
            (assignment) =>
              assignment.teacherId === teacher.id && assignment.subjectId === subject.id,
          ),
        )?.id ?? 'tch-001',
      postedAt: spec.postedAt,
    });

    for (const [studentIndex, seed] of STUDENT_SEEDS.entries()) {
      const studentId = `stu-${String(studentIndex + 1).padStart(3, '0')}`;
      const roll = random();

      // A stronger student submits more reliably. One assignment per subject is
      // left pending for everyone, so the "still owed" state is always visible.
      const status: SubmissionStatus =
        spec.dueDate > TERM_END
          ? 'pending'
          : roll < seed.attendanceRate - 0.12
            ? 'graded'
            : roll < seed.attendanceRate + 0.1
              ? 'submitted'
              : 'pending';

      if (status === 'pending') continue;

      submissions.push({
        id: `sub-${studentId}-${subject.code.toLowerCase()}`,
        assignmentId,
        studentId,
        submittedAt: spec.dueDate,
        status,
        marks:
          status === 'graded'
            ? Math.round(clamp(seed.ability + (random() * 16 - 8), 40, 100) * (spec.maxMarks / 100))
            : null,
        // Indexed by student *and* subject: keyed on the student alone, every
        // assignment they ever submit comes back with the same sentence.
        feedback:
          status === 'graded'
            ? (SUBMISSION_FEEDBACK[
                (studentIndex + subjectIndex * 3) % SUBMISSION_FEEDBACK.length
              ] ?? '')
            : '',
      });
    }
  }

  // --- Event registrations -----------------------------------------------
  for (const [studentIndex, seed] of STUDENT_SEEDS.entries()) {
    const studentId = `stu-${String(studentIndex + 1).padStart(3, '0')}`;

    for (const event of EVENT_SEEDS) {
      // Socially active students register for more. Uses the same seed field the
      // Social dimension is built from, so the two stay consistent.
      if (random() > seed.socialPoints / 60) continue;

      eventRegistrations.push({
        id: `reg-${studentId}-${event.id}`,
        eventId: event.id,
        studentId,
        registeredAt: '2026-07-20T09:00:00.000Z',
      });
    }
  }

  // --- Computed OAA, one row per student per semester --------------------
  //
  // Seeded through the same engine the API uses, not by hand. A hand-written
  // number here would drift from `lib/oaa.ts` the moment either changed, and the
  // dashboard would be showing a figure nothing could reproduce.
  for (const student of students) {
    for (const semester of GRADED_SEMESTERS) {
      const semesterMarks = marks
        .filter((row) => row.studentId === student.id && row.semester === semester)
        .map((row) => {
          const subject = subjects.find((entry) => entry.id === row.subjectId);
          return {
            total: row.internal + row.external,
            totalMax: (subject?.internalMax ?? 0) + (subject?.externalMax ?? 0),
          };
        });

      const inputs = {
        academic: academicScore(semesterMarks),
        adaptability: adaptabilityScore(
          adaptabilityAssessments
            .filter((row) => row.studentId === student.id && row.semester === semester)
            .map((row) => row.scores),
        ),
        physical: pointsToScore(
          physicalRecords.filter(
            (row) => row.studentId === student.id && row.semester === semester,
          ),
          PHYSICAL_POINTS_FOR_100,
        ),
        social: pointsToScore(
          socialRecords.filter((row) => row.studentId === student.id && row.semester === semester),
          SOCIAL_POINTS_FOR_100,
        ),
      };

      const result = calculateOaa(inputs, DEFAULT_WEIGHTS);

      oaaScores.push({
        id: `oaa-${student.id}-s${semester}`,
        studentId: student.id,
        semester,
        ...inputs,
        score: result.score,
        grade: result.grade,
        computedAt: SEMESTER_END[semester] ?? createdAt,
      });
    }
  }

  return {
    users,
    students,
    teachers,
    teacherAssignments,
    subjects,
    marks,
    attendance,
    adaptabilityAssessments,
    physicalRecords,
    socialRecords,
    oaaScores,
    timetable,
    announcements: ANNOUNCEMENT_SEEDS.map((row, index) => ({
      id: `ann-${String(index + 1).padStart(3, '0')}`,
      ...row,
    })),
    events: EVENT_SEEDS.map((event) => ({ ...event })),
    eventRegistrations,
    assignments,
    submissions,
    settings: {
      id: 'singleton',
      academicYear: '2026–27',
      currentSemester: CURRENT_SEMESTER,
      attendanceThreshold: 75,
      oaaWeights: { ...DEFAULT_WEIGHTS },
    },
    auditLogs: [],
  };
}
