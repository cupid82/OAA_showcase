import { z } from 'zod';

import type { Role } from '../data/types.js';

export const ROLES = ['student', 'admin'] as const;

/**
 * One form for everyone. Login ids are unique across roles, so the account
 * decides the role — the student never has to pick one.
 */
export const loginSchema = z.object({
  loginId: z.string().trim().min(1, 'Roll number or staff ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** The user as the client sees it. Never carries the password hash. */
export interface PublicUser {
  id: string;
  loginId: string;
  name: string;
  role: Role;
  department?: string;
  /** Students only: false until onboarding is finished. */
  onboarded?: boolean;
}

export interface AuthSession {
  token: string;
  user: PublicUser;
}
