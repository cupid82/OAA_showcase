/**
 * Credential checking and token issuing. Routes stay thin; the rules live here.
 */
import { compare, hashSync } from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { getDb } from '../data/store.js';
import type { Role, UserRow } from '../data/types.js';
import { HttpError } from '../lib/httpError.js';
import type { AuthSession, LoginInput, PublicUser } from '../models/auth.model.js';

export interface TokenPayload {
  sub: string;
  role: Role;
}

/**
 * Compared against when no user matches, so a wrong ID and a wrong password take
 * the same time. Without it, response latency tells an attacker which roll
 * numbers exist.
 */
const DUMMY_HASH = hashSync('no-such-user', 10);

function findUser(loginId: string, role: Role): UserRow | undefined {
  const wanted = loginId.trim().toLowerCase();
  return getDb().users.find((user) => user.role === role && user.loginId.toLowerCase() === wanted);
}

/** Students carry their department; staff records arrive with the teacher module. */
export function toPublicUser(user: UserRow): PublicUser {
  const student = getDb().students.find((row) => row.userId === user.id);

  return {
    id: user.id,
    loginId: user.loginId,
    name: user.name,
    role: user.role,
    ...(student ? { department: student.department } : {}),
  };
}

export function signToken(user: UserRow): string {
  const payload: TokenPayload = { sub: user.id, role: user.role };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      throw HttpError.unauthorized('Malformed session token.');
    }

    return { sub: decoded.sub, role: (decoded as TokenPayload).role };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw HttpError.unauthorized('Your session has expired. Please sign in again.');
  }
}

export async function login({ loginId, password, role }: LoginInput): Promise<AuthSession> {
  const user = findUser(loginId, role);
  const matches = await compare(password, user?.passwordHash ?? DUMMY_HASH);

  // One message for every failure mode — never reveal which half was wrong.
  if (!user || !matches) {
    throw HttpError.unauthorized('Invalid credentials. Check your ID, password and role.');
  }

  return { token: signToken(user), user: toPublicUser(user) };
}

export function getUserById(id: string): UserRow {
  const user = getDb().users.find((row) => row.id === id);
  if (!user) throw HttpError.unauthorized('This account no longer exists.');
  return user;
}
