/**
 * TEMPORARY — stands in for the auth API until Step 2 of plans.md is built.
 *
 * Three hardcoded accounts, resolved in the browser. No security value whatsoever;
 * it exists so the shell (routing, guards, layout) can be built and tested before
 * the backend exists.
 *
 * To retire it: swap the two calls in context/AuthContext.tsx for
 * `api.post('/api/auth/login')` / `api.get('/api/auth/me')`, then delete this file.
 */
import type { AuthSession, Role, User } from '@/types';

interface DemoAccount {
  password: string;
  user: User;
}

export const DEMO_ACCOUNTS: Record<Role, DemoAccount> = {
  student: {
    password: 'student123',
    user: {
      id: 'stu-1',
      loginId: '22CS001',
      name: 'Ananya Sharma',
      role: 'student',
      department: 'Computer Science & Engineering',
    },
  },
  teacher: {
    password: 'teacher123',
    user: {
      id: 'tch-1',
      loginId: 'TCH01',
      name: 'Dr. Rajesh Menon',
      role: 'teacher',
      department: 'Computer Science & Engineering',
    },
  },
  admin: {
    password: 'admin123',
    user: {
      id: 'adm-1',
      loginId: 'ADM01',
      name: 'Priya Nair',
      role: 'admin',
    },
  },
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Not a JWT. Just enough structure to round-trip a user id. */
const encodeToken = (user: User) => `mock.${user.role}.${user.id}`;

export async function mockLogin(
  loginId: string,
  password: string,
  role: Role,
): Promise<AuthSession> {
  await delay(400);

  const account = DEMO_ACCOUNTS[role];
  const idMatches = account.user.loginId.toLowerCase() === loginId.trim().toLowerCase();

  if (!idMatches || account.password !== password) {
    throw new Error('Invalid credentials. Check the demo account hint below.');
  }

  return { token: encodeToken(account.user), user: account.user };
}

/** Restores a session on refresh — the stand-in for GET /api/auth/me. */
export async function mockMe(token: string): Promise<User> {
  await delay(150);

  const match = Object.values(DEMO_ACCOUNTS).find((account) => encodeToken(account.user) === token);
  if (!match) throw new Error('Session expired');

  return match.user;
}
