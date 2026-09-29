/**
 * All home-page copy lives here. Swap the values, not the components.
 *
 * TODO: "Avelin" is a made-up placeholder name, not the college's. Replace it
 * with the real one before this goes anywhere public.
 */
import type { IconName } from '@/components/ui/Icon';
import type { Provider } from '@/types';

export const COLLEGE = {
  name: 'Avelin Institute of Technology',
  short: 'Avelin',
};

export const PROMISE =
  'OAA helps you turn your college years into a clear path to your next opportunity.';

export const NAV_LINKS = [
  { label: 'Modes', href: '#modes' },
  { label: 'Connect', href: '#connect' },
  { label: 'How it works', href: '#how' },
  { label: 'Not an ERP', href: '#boundary' },
];

export const MODES: { icon: IconName; name: string; line: string; points: string[] }[] = [
  {
    icon: 'rocket',
    name: 'Projects',
    line: 'Build real things, alone or with a team.',
    points: [
      'Tell each project’s story — the problem, your role, what happened',
      'Break it into milestones and ship it',
      'Find teammates, or start from a curated idea',
    ],
  },
  {
    icon: 'layers',
    name: 'Skills',
    line: 'A skill map for the goal you chose.',
    points: [
      'See what your goal needs next, and why',
      'Every skill shows the proof behind it',
      'Log practice without turning it into a streak',
    ],
  },
  {
    icon: 'ticket',
    name: 'Events',
    line: 'Hackathons, workshops, contests and talks.',
    points: [
      'Each one says who posted it — never just “verified”',
      'Save, register, and reflect after you go',
      'Share one you found for others',
    ],
  },
  {
    icon: 'briefcase',
    name: 'Jobs',
    line: 'Internships, jobs and recruitment drives.',
    points: [
      'Matches explain themselves, skill gaps included',
      'A private tracker from saved to offer',
      'Deadlines reach you before they pass',
    ],
  },
  {
    icon: 'flame',
    name: 'Burnout',
    line: 'A two-minute weekly check on how you’re coping.',
    points: [
      'Private — nobody else ever sees your answers',
      'Reads your load against the fortnight ahead',
      'Quiets the app when you need it to',
    ],
  },
  {
    icon: 'trophy',
    name: 'Leaderboard',
    line: 'Momentum from what you build and learn.',
    points: [
      'Shipping, proving skills and showing up — never marks',
      'Opt in; you’re not on it unless you choose to be',
      'Practice points cap out each week, on purpose',
    ],
  },
];

export const PROVIDERS: { id: Provider; name: string; how: string }[] = [
  { id: 'github', name: 'GitHub', how: 'Syncs your public repos — import them as projects' },
  { id: 'linkedin', name: 'LinkedIn', how: 'A link on your portfolio' },
  { id: 'x', name: 'X', how: 'A link on your portfolio' },
  { id: 'leetcode', name: 'LeetCode', how: 'A link on your portfolio' },
  { id: 'codeforces', name: 'Codeforces', how: 'A link on your portfolio' },
  { id: 'kaggle', name: 'Kaggle', how: 'A link on your portfolio' },
  { id: 'behance', name: 'Behance', how: 'A link on your portfolio' },
  { id: 'website', name: 'Your website', how: 'A link on your portfolio' },
];

/** The boundary between the two systems — straight from the product direction. */
export const BOUNDARY = [
  {
    area: 'Official data',
    erp: 'Attendance, marks, fees, timetable, exam records',
    oaa: 'Nothing copied. A link to the ERP instead.',
  },
  {
    area: 'Processes',
    erp: 'Fee payment, leave, registration, circulars',
    oaa: 'Your goal, your plan, your follow-through',
  },
  {
    area: 'Careers',
    erp: 'Usually not its job',
    oaa: 'Skills, project evidence, opportunities, application tracking',
  },
  {
    area: 'Notifications',
    erp: 'Formal notices by email',
    oaa: 'An in-app inbox: deadlines, matches, replies — each with an action',
  },
];

export const STEPS = [
  {
    title: 'Sign in with your college ID',
    body: 'No new account, no public sign-up. Your roll number and the password your college gave you.',
  },
  {
    title: 'Tell it where you’re headed',
    body: 'A goal, the skills you already have, what you’re looking for. Two minutes, and all of it editable later.',
  },
  {
    title: 'Get your next move',
    body: 'Your dashboard shows the few things worth doing now — each one says why, what to do, and by when.',
  },
];

export const PRINCIPLES = [
  {
    title: 'Nothing is public by default',
    body: 'Projects start private. Your portfolio and leaderboard spot are off until you switch them on.',
  },
  {
    title: 'Every suggestion says why',
    body: '“Suggested because you have React and chose Full-stack developer” — and you can always say not interested.',
  },
  {
    title: 'Marks never count',
    body: 'The leaderboard ranks what you build and learn. Grades and attendance belong to the ERP, not here.',
  },
  {
    title: 'It notices when you’re stretched',
    body: 'If your check-ins run hot, the dashboard shows only what’s urgent and tells you what it held back.',
  },
];
