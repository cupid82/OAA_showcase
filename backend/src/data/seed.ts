/**
 * First-run dataset. Runs once, when no data file exists yet.
 *
 * The numbers are generated from a fixed PRNG seed, so every machine that seeds
 * this project gets byte-identical data — which is what makes the Step 5
 * verification ("student #1 and student #2 show different marks", "a student
 * under 75% shows the red banner") reproducible rather than luck.
 */
import { hash as bcryptHash } from 'bcryptjs';

import type {
  AttendanceRow,
  Database,
  MarkRow,
  StudentRow,
  SubjectRow,
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
  },
];

export async function buildSeed(): Promise<Database> {
  const random = mulberry32(20260801);

  const users: UserRow[] = [];
  const students: StudentRow[] = [];
  const subjects: SubjectRow[] = [];
  const marks: MarkRow[] = [];
  const attendance: AttendanceRow[] = [];

  const createdAt = new Date('2026-04-01T09:00:00.000Z').toISOString();
  const hash = (password: string) => bcryptHash(password, BCRYPT_COST);

  // --- Staff ------------------------------------------------------------
  const teacherId = 'usr-tch-01';
  users.push({
    id: teacherId,
    loginId: 'TCH01',
    role: 'teacher',
    name: 'Dr. Rajesh Menon',
    passwordHash: await hash('teacher123'),
    createdAt,
  });

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
          markedBy: teacherId,
        });
      }
    }
  }

  return { users, students, subjects, marks, attendance };
}
