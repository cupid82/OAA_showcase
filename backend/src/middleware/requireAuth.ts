/**
 * Authentication and authorisation guards.
 *
 * Rule 4 of CLAUDE.md: a protected route checks **role and ownership**. Being "a
 * student" is never enough to read `/api/students/42/marks` — you must be
 * student 42. `requireSelfOrStaff` is what enforces that second half.
 */
import type { Request, RequestHandler } from 'express';

import { getDb } from '../data/store.js';
import type { Role } from '../data/types.js';
import { HttpError } from '../lib/httpError.js';
import { verifyToken } from '../services/auth.service.js';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `requireAuth`. */
    user?: AuthenticatedUser;
    /** Set by `requireSelfOrStaff`. Always an id the caller is allowed to read. */
    studentId?: string;
  }
}

function bearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/** Rejects anything without a valid, unexpired token. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) return next(HttpError.unauthorized('Sign in to continue.'));

  try {
    const { sub, role } = verifyToken(token);
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
 * Resolves `:studentId` (or the literal `me`) to a student record and checks the
 * caller may see it: the student themselves, or a teacher/admin.
 *
 * The resolved id is attached to the request so handlers never re-derive it —
 * re-deriving is how an ownership check drifts away from the query it guards.
 */
export const requireSelfOrStaff: RequestHandler = (req, _res, next) => {
  const user = req.user;
  if (!user) return next(HttpError.unauthorized('Sign in to continue.'));

  const { students } = getDb();
  const param = req.params.studentId ?? 'me';

  if (user.role === 'student') {
    const own = students.find((student) => student.userId === user.id);
    if (!own) return next(HttpError.forbidden('This account is not linked to a student record.'));

    // A student may only ever address their own record — by id or by "me".
    if (param !== 'me' && param !== own.id) {
      return next(HttpError.forbidden('You can only view your own record.'));
    }

    req.studentId = own.id;
    return next();
  }

  // Staff may read any student, but "me" is meaningless for them.
  if (param === 'me') {
    return next(HttpError.badRequest('Staff accounts must request a specific student id.'));
  }

  if (!students.some((student) => student.id === param)) {
    return next(HttpError.notFound('Student not found.'));
  }

  req.studentId = param;
  next();
};

/** Narrows the request field once, so handlers stay free of non-null assertions. */
export function studentIdOf(req: Request): string {
  if (!req.studentId) throw HttpError.forbidden('No student context on this request.');
  return req.studentId;
}
