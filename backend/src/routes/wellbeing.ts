import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireStudent, studentIdOf } from '../middleware/requireAuth.js';
import { checkinSchema, leaderboardQuerySchema, snoozeSchema } from '../models/misc.model.js';
import { getLeaderboard } from '../services/momentum.service.js';
import {
  deleteCheckins,
  getWellbeing,
  setSnooze,
  submitCheckin,
} from '../services/wellbeing.service.js';

/**
 * Burnout check-ins. Student-only, and only ever the caller's own — there is no
 * route anywhere that reads another person's check-ins.
 */
export const wellbeingRouter = Router();

wellbeingRouter.use(requireAuth, requireStudent);

wellbeingRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: getWellbeing(studentIdOf(req)) });
  }),
);

wellbeingRouter.post(
  '/checkins',
  asyncHandler(async (req, res) => {
    res.json({ data: await submitCheckin(studentIdOf(req), checkinSchema.parse(req.body)) });
  }),
);

wellbeingRouter.delete(
  '/checkins',
  asyncHandler(async (req, res) => {
    res.json({ data: await deleteCheckins(studentIdOf(req)) });
  }),
);

wellbeingRouter.put(
  '/snooze',
  asyncHandler(async (req, res) => {
    const { days } = snoozeSchema.parse(req.body);
    res.json({ data: await setSnooze(studentIdOf(req), days) });
  }),
);

// --- Leaderboard -------------------------------------------------------------------

export const leaderboardRouter = Router();

leaderboardRouter.use(requireAuth, requireStudent);

leaderboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: getLeaderboard(studentIdOf(req), leaderboardQuerySchema.parse(req.query)) });
  }),
);
