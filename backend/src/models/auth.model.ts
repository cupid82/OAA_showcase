import { z } from 'zod';

import type { Role } from '../data/types.js';

export const ROLES = ['student', 'teacher', 'admin'] as const;

export const loginSchema = z.object({
  loginId: z.string().trim().min(1, 'Roll number or staff ID is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(ROLES),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** The user as the client sees it. Never carries the password hash. */
export interface PublicUser {
  id: string;
  loginId: string;
  name: string;
  role: Role;
  department?: string;
}

export interface AuthSession {
  token: string;
  user: PublicUser;
}
