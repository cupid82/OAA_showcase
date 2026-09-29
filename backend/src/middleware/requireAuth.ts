/**
 * Authentication and authorisation guards.
 *
 * Rule 4 of CLAUDE.md: a protected route checks **role and ownership**. Student
 * routes never take a student id from the URL — `requireStudent` resolves the
 * caller's own record from their token, so there is no id to tamper with. Rows
 * inside a student's area (a project, a certificate) are then checked against
 * that id in the service, in one named function per module.
 */
import type { Request, RequestHandler } from 'express';

import { googleSignInEnabled } from '../config/env.js';
import { getDb } from '../data/store.js';
import type { Role } from '../data/types.js';
import { HttpError } from '../lib/httpError.js';
import { isSupabaseToken, verifySupabaseToken } from '../lib/supabaseAuth.js';
import { currentRole, userForAuthId, verifyToken } from '../services/auth.service.js';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `requireAuth`. */
    user?: AuthenticatedUser;
    /** Set by `requireStudent`. Always the caller's own student record. */
    studentId?: string;
  }
}

export function bearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/** The OAA user id behind a token of either kind. */
async function userIdFor(token: string): Promise<string> {
  if (googleSignInEnabled && isSupabaseToken(token)) {
    const identity = await verifySupabaseToken(token);
    const user = userForAuthId(identity.id);
    // The browser exchanges a fresh Google sign-in at /api/auth/google first;
    // reaching here unlinked means that step was skipped or failed.
    if (!user) throw HttpError.unauthorized('Finish signing in with Google first.');
    return user.id;
  }

  return verifyToken(token).sub;
}

/**
 * Rejects anything without a valid, unexpired token for an account that still
 * exists: a Supabase token from a Google sign-in, or OAA's own token from a
 * roll-number sign-in. The role is read from the account, never trusted from the
 * token.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) return next(HttpError.unauthorized('Sign in to continue.'));

  userIdFor(token)
    .then((id) => {
      const role = currentRole(id);
      if (!role) throw HttpError.unauthorized('This account no longer exists.');
      req.user = { id, role };
      next();
    })
    .catch(next);
};

/** Must run after `requireAuth`. */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(HttpError.unauthorized('Sign in to continue.'));

    if (!allowed.includes(req.user.role)) {
      return next(HttpError.forbidden('Your role does not have access to this resource.'));
    }

    next();
  };
}

function resolveStudent(requireOnboarded: boolean): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) return next(HttpError.unauthorized('Sign in to continue.'));
    if (user.role !== 'student') {
      return next(HttpError.forbidden('This part of OAA is for student accounts.'));
    }

    const own = getDb().students.find((student) => student.userId === user.id);
    if (!own) return next(HttpError.forbidden('This account is not linked to a student record.'));

    // The web app routes a new student to onboarding; this makes it a rule rather
    // than a courtesy, and guarantees the details onboarding collects exist.
    if (requireOnboarded && own.onboardedAt === null) {
      return next(HttpError.forbidden('Finish setting up your account first.'));
    }

    req.studentId = own.id;
    next();
  };
}

/**
 * Must run after `requireAuth`. Admits onboarded student accounts only, and
 * attaches the caller's own student id — the only one any handler behind it will
 * ever use.
 */
export const requireStudent: RequestHandler = resolveStudent(true);

/** As `requireStudent`, but also admits a student who hasn't finished onboarding. */
export const requireStudentAccount: RequestHandler = resolveStudent(false);

/** Narrows the request field once, so handlers stay free of non-null assertions. */
export function studentIdOf(req: Request): string {
  if (!req.studentId) throw HttpError.forbidden('No student context on this request.');
  return req.studentId;
}

/** The same narrowing for the signed-in user. Only valid after `requireAuth`. */
export function userOf(req: Request): AuthenticatedUser {
  if (!req.user) throw HttpError.unauthorized('Sign in to continue.');
  return req.user;
}
