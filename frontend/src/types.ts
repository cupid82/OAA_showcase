export type Role = 'student' | 'teacher' | 'admin';

export const ROLES: Role[] = ['student', 'teacher', 'admin'];

export interface User {
  id: string;
  /** Roll number for students, staff ID for teachers and admins. */
  loginId: string;
  name: string;
  role: Role;
  department?: string;
}

/** Wire shape of a failed response. The thrown error class lives in lib/api.ts. */
export interface ApiErrorResponse {
  error: { message: string; details?: Record<string, string[]> };
}

export interface AuthSession {
  token: string;
  user: User;
}
