/**
 * Credential hints for the seeded accounts, shown on the login page.
 *
 * These are *real* credentials — the ones `backend/src/data/seed.ts` creates on
 * first run — not mock users. The block that renders them should come out when
 * OAA is used with real accounts; the seed is what to change to alter them.
 */

export const DEMO_PASSWORD = { student: 'student123', admin: 'admin123' } as const;

export const DEMO_ACCOUNTS = [
  {
    loginId: '22CS001',
    password: DEMO_PASSWORD.student,
    who: 'Ananya — the main demo account',
    note: 'Busy builder. GitHub isn’t connected yet — try linking your own.',
  },
  {
    loginId: '22CS002',
    password: DEMO_PASSWORD.student,
    who: 'Rohan — overloaded',
    note: 'His check-ins read “running hot”, so his dashboard goes quiet.',
  },
  {
    loginId: '22CS010',
    password: DEMO_PASSWORD.student,
    who: 'Arjun — first sign-in',
    note: 'Not onboarded yet: lands on the welcome flow.',
  },
  {
    loginId: 'ADM01',
    password: DEMO_PASSWORD.admin,
    who: 'Moderator',
    note: 'Publishes and reviews events and jobs.',
  },
] as const;
