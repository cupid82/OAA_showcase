import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import {
  requireAuth,
  requireStudent,
  requireStudentAccount,
  studentIdOf,
} from '../middleware/requireAuth.js';
import { dismissSchema } from '../models/misc.model.js';
import {
  goalSchema,
  onboardingSchema,
  preferencesSchema,
  profileSchema,
} from '../models/profile.model.js';
import { dismissAction, getToday } from '../services/dashboard.service.js';
import {
  completeOnboarding,
  getMe,
  updateGoal,
  updatePreferences,
  updateProfile,
} from '../services/profile.service.js';

/**
 * The signed-in student's own account. There is no student id anywhere in these
 * paths — the guard supplies the caller's. These are the only student routes open
 * before onboarding is finished, since onboarding itself goes through them.
 */
export const meRouter = Router();

meRouter.use(requireAuth, requireStudentAccount);

meRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: getMe(studentIdOf(req)) });
  }),
);

meRouter.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    res.json({ data: await updateProfile(studentIdOf(req), profileSchema.parse(req.body)) });
  }),
);

meRouter.patch(
  '/goal',
  asyncHandler(async (req, res) => {
    res.json({ data: await updateGoal(studentIdOf(req), goalSchema.parse(req.body)) });
  }),
);

meRouter.patch(
  '/preferences',
  asyncHandler(async (req, res) => {
    res.json({
      data: await updatePreferences(studentIdOf(req), preferencesSchema.parse(req.body)),
    });
  }),
);

meRouter.post(
  '/onboarding',
  asyncHandler(async (req, res) => {
    res.json({
      data: await completeOnboarding(studentIdOf(req), onboardingSchema.parse(req.body)),
    });
  }),
);

// --- Today -----------------------------------------------------------------------

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireStudent);

dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: getToday(studentIdOf(req)) });
  }),
);

/** POST /api/dashboard/dismiss — "done" or "not now" on a Today card. */
dashboardRouter.post(
  '/dismiss',
  asyncHandler(async (req, res) => {
    const { key } = dismissSchema.parse(req.body);
    res.json({ data: await dismissAction(studentIdOf(req), key) });
  }),
);

/** POST /api/dashboard/restore — undo a dismissal. */
dashboardRouter.post(
  '/restore',
  asyncHandler(async (req, res) => {
    const { key } = dismissSchema.parse(req.body);
    res.json({ data: await dismissAction(studentIdOf(req), key, true) });
  }),
);
