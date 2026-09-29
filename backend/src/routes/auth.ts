import { Router } from 'express';

import { googleSignInEnabled } from '../config/env.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { verifySupabaseToken } from '../lib/supabaseAuth.js';
import { bearerToken, requireAuth, userOf } from '../middleware/requireAuth.js';
import { loginSchema } from '../models/auth.model.js';
import { getUserById, login, signInWithGoogle, toPublicUser } from '../services/auth.service.js';

export const authRouter = Router();

/**
 * POST /api/auth/login — roll number + password.
 * No try/catch — a ZodError is turned into a 400 by the error middleware.
 */
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const credentials = loginSchema.parse(req.body);
    res.json({ data: await login(credentials) });
  }),
);

/**
 * POST /api/auth/google — called by the browser right after a Google sign-in,
 * with Supabase's access token as the bearer. Verifies it and finds, links or
 * creates the OAA account. From then on the same Supabase token authenticates
 * every request; OAA issues no token of its own for Google users.
 */
authRouter.post(
  '/google',
  asyncHandler(async (req, res) => {
    if (!googleSignInEnabled) throw HttpError.notFound('Google sign-in is not set up on this server.');
    const token = bearerToken(req);
    if (!token) throw HttpError.unauthorized('Sign in with Google first.');

    const identity = await verifySupabaseToken(token);
    res.json({ data: await signInWithGoogle(identity) });
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
