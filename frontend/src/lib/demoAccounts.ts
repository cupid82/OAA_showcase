/**
 * Credential hints for the seeded accounts, shown on the login page.
 *
 * These are *real* credentials — the ones `backend/src/data/seed.ts` creates on
 * first run — not mock users. The block that renders them should come out when
 * the portal is used with real accounts; the seed itself is what to change to
 * alter them.
 */
import type { Role } from '@/types';

export const DEMO_LOGINS: Record<Role, { loginId: string; password: string }> = {
  student: { loginId: '22CS001', password: 'student123' },
  teacher: { loginId: 'TCH01', password: 'teacher123' },
  admin: { loginId: 'ADM01', password: 'admin123' },
};

/** The other seeded students, useful for checking that pages are really per-user. */
export const OTHER_STUDENT_LOGINS = ['22CS002', '22CS003'] as const;
