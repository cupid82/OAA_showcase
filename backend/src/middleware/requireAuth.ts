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

import { getDb } from '../data/store.js';
import type { Role } from '../data/types.js';
import { HttpError } from '../lib/httpError.js';
import { currentRole, verifyToken } from '../services/auth.service.js';

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

function bearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Rejects anything without a valid, unexpired token for an account that still
 * exists. The role is read from the account, not trusted from the token.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) return next(HttpError.unauthorized('Sign in to continue.'));

  try {
    const { sub } = verifyToken(token);
    const role = currentRole(sub);
    if (!role) return next(HttpError.unauthorized('This account no longer exists.'));

    req.user = { id: sub, role };
    next();
  } catch (error) {
    next(error);
  }
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

/**
 * Must run after `requireAuth`. Admits student accounts only, and attaches the
 * caller's own student id — the only one any handler behind it will ever use.
 */
export const requireStudent: RequestHandler = (req, _res, next) => {
  const user = req.user;
  if (!user) return next(HttpError.unauthorized('Sign in to continue.'));
  if (user.role !== 'student') {
    return next(HttpError.forbidden('This part of OAA is for student accounts.'));
  }

  const own = getDb().students.find((student) => student.userId === user.id);
  if (!own) return next(HttpError.forbidden('This account is not linked to a student record.'));

  req.studentId = own.id;
  next();
};

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
