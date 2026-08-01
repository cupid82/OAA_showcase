import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { loginSchema } from '../models/auth.model.js';
import { getUserById, login, toPublicUser } from '../services/auth.service.js';
import { HttpError } from '../lib/httpError.js';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * No try/catch — a ZodError is turned into a 400 by the error middleware.
 */
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const credentials = loginSchema.parse(req.body);
    const session = await login(credentials);
    res.json({ data: session });
  }),
);

/** GET /api/auth/me — restores a session on page refresh. */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw HttpError.unauthorized('Sign in to continue.');
    res.json({ data: toPublicUser(getUserById(req.user.id)) });
  }),
);
