/**
 * Sign-in, for both ways in:
 *
 * - **Google, through Supabase Auth.** The browser signs in with Supabase; the
 *   API verifies Supabase's token on every request (`lib/supabaseAuth.ts`) and
 *   maps it to an OAA account here.
 * - **Roll number + password**, for the seeded demo accounts and for colleges
 *   without Google accounts. Switch it off with `PASSWORD_LOGIN=off`.
 *
 * Routes stay thin; the rules live here.
 */
import { compare, hashSync } from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { getDb, persist } from '../data/store.js';
import type { Role, UserRow } from '../data/types.js';
import { HttpError } from '../lib/httpError.js';
import type { SupabaseIdentity } from '../lib/supabaseAuth.js';
import type { AuthSession, LoginInput, PublicUser } from '../models/auth.model.js';
import { newId, nowISO, preferencesOf } from './shared.js';

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

/** Login ids are unique across roles, so the id alone finds the account. */
function findUser(loginId: string): UserRow | undefined {
  const wanted = loginId.trim().toLowerCase();
  return getDb().users.find((user) => user.loginId.toLowerCase() === wanted);
}

export function toPublicUser(user: UserRow): PublicUser {
  const student = getDb().students.find((row) => row.userId === user.id);

  return {
    id: user.id,
    loginId: user.loginId,
    name: user.name,
    role: user.role,
    ...(user.email ? { email: user.email } : {}),
    ...(student
      ? {
          ...(student.department ? { department: student.department } : {}),
          onboarded: student.onboardedAt !== null,
        }
      : {}),
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

export async function login({ loginId, password }: LoginInput): Promise<AuthSession> {
  if (env.PASSWORD_LOGIN === 'off') {
    throw HttpError.forbidden('Roll-number sign-in is switched off. Continue with Google instead.');
  }

  const user = findUser(loginId);
  const matches = await compare(password, user?.passwordHash ?? DUMMY_HASH);

  // One message for every failure mode — never reveal which half was wrong. A
  // Google-only account has no password, so it fails here like a wrong one.
  if (!user || !user.passwordHash || !matches) {
    throw HttpError.unauthorized('That ID and password do not match an account.');
  }

  return { token: signToken(user), user: toPublicUser(user) };
}

export function getUserById(id: string): UserRow {
  const user = getDb().users.find((row) => row.id === id);
  if (!user) throw HttpError.unauthorized('This account no longer exists.');
  return user;
}

/**
 * The role in a token is a claim made when it was signed. Guards compare it with
 * the account as it is now, so a role change takes effect without waiting for
 * the old token to expire.
 */
export function currentRole(userId: string): Role | null {
  return getDb().users.find((row) => row.id === userId)?.role ?? null;
}

// --- Google, through Supabase Auth ---------------------------------------------------

/** The OAA account a verified Supabase identity belongs to, if it has one yet. */
export function userForAuthId(authId: string): UserRow | undefined {
  return getDb().users.find((user) => user.authId === authId);
}

/** "Ananya.Sharma+oaa@gmail.com" → "ananya-sharma-oaa", unique among handles. */
function uniqueHandle(email: string): string {
  const base =
    (email.split('@')[0] ?? 'student')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24)
      .replace(/-+$/g, '') || 'student';
  const padded = base.length < 3 ? `${base}-oaa` : base;
  const taken = new Set(getDb().students.map((student) => student.handle.toLowerCase()));

  if (!taken.has(padded)) return padded;
  for (let n = 2; ; n += 1) {
    const candidate = `${padded}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

function domainAllowed(email: string): boolean {
  if (env.ALLOWED_EMAIL_DOMAINS.length === 0) return true;
  const domain = email.split('@')[1] ?? '';
  return env.ALLOWED_EMAIL_DOMAINS.includes(domain);
}

/**
 * Finds or creates the OAA account for a Google sign-in, in this order:
 *
 * 1. Already linked to this Supabase user → that account.
 * 2. An account with the same email → link it (college-issued accounts carry the
 *    student's college email, so their first Google sign-in finds them).
 * 3. The email is in `ADMIN_EMAILS` → a new moderator account.
 * 4. Otherwise → a new student account, onboarding still to do — refused if
 *    `ALLOWED_EMAIL_DOMAINS` is set and the email is not on one of them.
 *
 * Steps 2–4 trust the email, so they only run for Google sign-ins: Google has
 * verified the address, and `providers` comes from `app_metadata`, which the
 * user cannot edit.
 */
export async function signInWithGoogle(
  identity: SupabaseIdentity,
): Promise<{ user: PublicUser; created: boolean }> {
  const linked = userForAuthId(identity.id);
  if (linked) return { user: toPublicUser(linked), created: false };

  if (!identity.providers.includes('google')) {
    throw HttpError.forbidden('OAA only accepts Google sign-in.');
  }
  const email = identity.email;
  if (!email) throw HttpError.forbidden('Your Google account did not share an email address.');

  const db = getDb();
  const existing = db.users.find((user) => user.email === email);
  if (existing) {
    existing.authId = identity.id;
    await persist();
    return { user: toPublicUser(existing), created: false };
  }

  const now = nowISO();
  const name = identity.name?.trim() || email.split('@')[0] || 'New student';

  if (env.ADMIN_EMAILS.includes(email)) {
    const admin: UserRow = {
      id: newId('usr'),
      loginId: email,
      role: 'admin',
      name,
      email,
      authId: identity.id,
      passwordHash: null,
      createdAt: now,
    };
    db.users.push(admin);
    await persist();
    return { user: toPublicUser(admin), created: true };
  }

  if (!domainAllowed(email)) {
    throw HttpError.forbidden(
      `Use your college Google account — ${env.ALLOWED_EMAIL_DOMAINS.map((domain) => `@${domain}`).join(' or ')}.`,
    );
  }

  const user: UserRow = {
    id: newId('usr'),
    loginId: email,
    role: 'student',
    name,
    email,
    authId: identity.id,
    passwordHash: null,
    createdAt: now,
  };
  const studentId = newId('stu');
  db.users.push(user);
  db.students.push({
    id: studentId,
    userId: user.id,
    // No college record behind this account: the details are asked for at
    // onboarding and marked as self-reported.
    rollNo: null,
    name,
    department: null,
    year: null,
    recordsSyncedAt: null,
    email,
    handle: uniqueHandle(email),
    headline: '',
    bio: '',
    trackId: null,
    interests: [],
    weeklyHours: null,
    onboardedAt: null,
    createdAt: now,
  });
  preferencesOf(studentId); // privacy-first defaults

  await persist();
  return { user: toPublicUser(user), created: true };
}
