import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, userOf } from '../middleware/requireAuth.js';
import { loginSchema } from '../models/auth.model.js';
import { getUserById, login, toPublicUser } from '../services/auth.service.js';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * No try/catch — a ZodError is turned into a 400 by the error middleware.
 */
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const credentials = loginSchema.parse(req.body);
    res.json({ data: await login(credentials) });
  }),
);

/** GET /api/auth/me — restores a session on page refresh. */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: toPublicUser(getUserById(userOf(req).id)) });
  }),
);
