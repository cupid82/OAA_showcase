/**
 * All landing-page copy lives here — placeholder content standing in for the real
 * details in docs/01-landing-page.md. Swap the values, not the components.
 *
 * TODO: "Avelin" is a made-up placeholder name, not the college's. Replace it
 * along with the contact details, departments, courses and placement numbers
 * before this goes anywhere public.
 */

export const COLLEGE = {
  name: 'Avelin Institute of Technology',
  short: 'Avelin',
  tagline: 'Learn. Adapt. Excel.',
  established: 1998,
  intro:
    'Marks measure recall. This measures ability — academics, adaptability, physical wellbeing and social contribution, kept for every student, visible to every student.',
  address: '17 Vidya Marg, Whitefield, Bengaluru 560066, Karnataka',
  phone: '+91 80 4567 8900',
  email: 'admissions@sunrisetech.edu.in',
  accreditations: ['NAAC A+ Accredited', 'AICTE Approved', 'NBA Accredited Programmes'],
};

/** The three portal entry points, in the order they appear on the landing page. */
export const ROLE_ENTRIES = [
  {
    role: 'student',
    label: 'Student',
    icon: 'cap',
    blurb: 'Your marks, attendance, ability score and everything happening on campus.',
  },
  {
    role: 'teacher',
    label: 'Teacher',
    icon: 'users',
    blurb: 'Take attendance, enter marks and record the assessments only you can see.',
  },
  {
    role: 'admin',
    label: 'Administrator',
    icon: 'settings',
    blurb: 'Accounts, departments, results and the settings the whole institute runs on.',
  },
] as const;

export const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Departments', href: '#departments' },
  { label: 'Courses', href: '#courses' },
  { label: 'Campus', href: '#gallery' },
  { label: 'Placements', href: '#placements' },
  { label: 'Contact', href: '#contact' },
];

export const QUICK_FACTS = [
  { label: 'Established', value: '1998' },
  { label: 'Campus', value: '42 acres' },
  { label: 'Accreditation', value: 'NAAC A+' },
  { label: 'Programmes', value: '24' },
];

export const PRINCIPAL = {
  name: 'Dr. Meera Krishnan',
  designation: 'Principal & Director',
  credentials: 'Ph.D. (IISc Bengaluru) · 28 years in engineering education',
  message:
    'A transcript tells you what a student memorised. It says nothing about how they handled a project that fell apart two days before submission, or whether their classmates trust them to lead. We built the Overall Ability Assessment because the qualities employers ask us about were the ones our own records could not answer. Every student here is measured across academics, adaptability, physical wellbeing and social contribution — and every one of them can see exactly where they stand.',
};

export const STATISTICS = [
  { label: 'Students on campus', value: 4200, suffix: '+' },
  { label: 'Faculty members', value: 210, suffix: '' },
  { label: 'Programmes offered', value: 24, suffix: '' },
  { label: 'Placement rate', value: 92, suffix: '%' },
];

export const DEPARTMENTS = [
  {
    code: 'CSE',
    name: 'Computer Science & Engineering',
    blurb: 'Systems, software engineering and distributed computing.',
    students: 980,
  },
  {
    code: 'AI&DS',
    name: 'Artificial Intelligence & Data Science',
    blurb: 'Machine learning, data engineering and applied statistics.',
    students: 620,
  },
  {
    code: 'ECE',
    name: 'Electronics & Communication',
    blurb: 'VLSI, embedded systems and communication networks.',
    students: 740,
  },
  {
    code: 'EEE',
    name: 'Electrical & Electronics',
    blurb: 'Power systems, control engineering and renewables.',
    students: 520,
  },
  {
    code: 'MECH',
    name: 'Mechanical Engineering',
    blurb: 'Design, thermal sciences and advanced manufacturing.',
    students: 690,
  },
  {
    code: 'CIVIL',
    name: 'Civil Engineering',
    blurb: 'Structures, geotechnics and sustainable infrastructure.',
    students: 450,
  },
];

export const COURSES = [
  {
    level: 'Undergraduate',
    items: [
      { name: 'B.Tech — Computer Science & Engineering', duration: '4 years', seats: 240 },
      { name: 'B.Tech — Artificial Intelligence & Data Science', duration: '4 years', seats: 180 },
      { name: 'B.Tech — Electronics & Communication', duration: '4 years', seats: 180 },
      { name: 'B.Tech — Mechanical Engineering', duration: '4 years', seats: 120 },
    ],
  },
  {
    level: 'Postgraduate',
    items: [
      { name: 'M.Tech — Computer Science', duration: '2 years', seats: 36 },
      { name: 'M.Tech — VLSI Design', duration: '2 years', seats: 24 },
      { name: 'MBA — Technology Management', duration: '2 years', seats: 60 },
      { name: 'MCA — Computer Applications', duration: '2 years', seats: 60 },
    ],
  },
];

export const GALLERY = [
  'Central library',
  'Innovation lab',
  'Main quadrangle',
  'Robotics workshop',
  'Sports complex',
  'Annual tech fest',
  'Hostel block',
  'Seminar hall',
];

export const NEWS = [
  {
    date: '2026-07-18',
    category: 'Research',
    title: 'CSE team publishes paper on federated learning at ICML workshop',
    excerpt:
      'Four final-year students and Dr. Rajesh Menon presented work on privacy-preserving model training across edge devices.',
  },
  {
    date: '2026-07-09',
    category: 'Campus',
    title: 'New 12,000 sq ft innovation lab opens in Block C',
    excerpt:
      'The lab houses prototyping equipment, a 3D printing bay and a dedicated space for student-led startups.',
  },
  {
    date: '2026-06-27',
    category: 'Accreditation',
    title: 'Institute retains NAAC A+ grade for a second cycle',
    excerpt:
      'The peer team highlighted the ability-assessment framework and student support systems in its report.',
  },
  {
    date: '2026-06-14',
    category: 'Achievement',
    title: 'Robotics club places second at the national autonomous vehicle challenge',
    excerpt:
      'Team Vega finished ahead of 74 entries, missing the top spot by under two seconds in the final run.',
  },
];

export const EVENTS = [
  {
    date: '2026-08-12',
    title: 'Prayaan 2026 — Annual Technical Symposium',
    venue: 'Main Auditorium',
    type: 'Technical',
  },
  {
    date: '2026-08-23',
    title: 'Industry Connect: Careers in Applied AI',
    venue: 'Seminar Hall B',
    type: 'Workshop',
  },
  {
    date: '2026-09-05',
    title: 'Inter-Departmental Sports Meet',
    venue: 'Sports Complex',
    type: 'Sports',
  },
  {
    date: '2026-09-19',
    title: 'Community Outreach — Digital Literacy Drive',
    venue: 'Whitefield Community Centre',
    type: 'Social',
  },
];

export const PLACEMENTS = {
  headline: [
    { label: 'Highest package', value: '₹42 LPA' },
    { label: 'Average package', value: '₹7.8 LPA' },
    { label: 'Students placed', value: '92%' },
    { label: 'Recruiters on campus', value: '148' },
  ],
  byDepartment: [
    { department: 'Computer Science', percent: 97 },
    { department: 'AI & Data Science', percent: 95 },
    { department: 'Electronics & Comm.', percent: 90 },
    { department: 'Electrical & Electronics', percent: 87 },
    { department: 'Mechanical', percent: 84 },
    { department: 'Civil', percent: 79 },
  ],
  recruiters: [
    'Infosys',
    'TCS',
    'Wipro',
    'Zoho',
    'Bosch',
    'Cognizant',
    'Freshworks',
    'L&T',
    'Accenture',
    'Deloitte',
  ],
};

export const TESTIMONIALS = [
  {
    quote:
      'The ability score was the thing my interviewer asked about. Not my CGPA — the fact that I could point at four years of measured teamwork and initiative.',
    name: 'Kavya Reddy',
    batch: 'B.Tech CSE, 2024',
    company: 'Software Engineer, Freshworks',
  },
  {
    quote:
      'I came in a quiet first-year with decent marks. The adaptability feedback from my mentors is genuinely why I run a team of nine today.',
    name: 'Arjun Pillai',
    batch: 'B.Tech ECE, 2022',
    company: 'Hardware Lead, Bosch',
  },
  {
    quote:
      'Faculty here treat the labs as the real classroom. I had shipped three working prototypes before I graduated.',
    name: 'Sneha Iyer',
    batch: 'B.Tech Mechanical, 2023',
    company: 'Design Engineer, L&T',
  },
];

export const FOOTER_LINKS = {
  Institute: [
    { label: 'About us', href: '#about' },
    { label: "Principal's message", href: '#principal' },
    { label: 'Campus gallery', href: '#gallery' },
    { label: 'News', href: '#news' },
  ],
  Academics: [
    { label: 'Departments', href: '#departments' },
    { label: 'Courses', href: '#courses' },
    { label: 'Events', href: '#events' },
    { label: 'Placements', href: '#placements' },
  ],
};
