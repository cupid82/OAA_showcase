import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireSelfOrStaff, studentIdOf } from '../middleware/requireAuth.js';
import { leaderboardQuerySchema } from '../models/teacher.model.js';
import {
  getAnnouncements,
  getAssignments,
  getEvents,
  getTimetable,
} from '../services/campus.service.js';
import { getLeaderboard } from '../services/leaderboard.service.js';
import { getOaa } from '../services/oaa.service.js';
import { getAttendance, getMarks, getProfile } from '../services/student.service.js';

export const studentsRouter = Router();

/**
 * Every route below is `requireAuth` → `requireSelfOrStaff` → handler.
 *
 * The guard resolves `me` (or an explicit id, for staff) into an id the caller is
 * authorised to read, so the handlers cannot accidentally serve someone else's
 * record. Routes stay thin — all logic is in the service.
 */
studentsRouter.use(requireAuth);

const readRoutes = Router({ mergeParams: true });

readRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: getProfile(studentIdOf(req)) });
  }),
);

readRoutes.get(
  '/marks',
  asyncHandler(async (req, res) => {
    res.json({ data: getMarks(studentIdOf(req)) });
  }),
);

readRoutes.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    res.json({ data: getAttendance(studentIdOf(req)) });
  }),
);

readRoutes.get(
  '/oaa',
  asyncHandler(async (req, res) => {
    res.json({ data: getOaa(studentIdOf(req)) });
  }),
);

readRoutes.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const { scope, category } = leaderboardQuerySchema.parse(req.query);
    res.json({ data: getLeaderboard(studentIdOf(req), scope, category) });
  }),
);

readRoutes.get(
  '/timetable',
  asyncHandler(async (req, res) => {
    res.json({ data: getTimetable(studentIdOf(req)) });
  }),
);

readRoutes.get(
  '/announcements',
  asyncHandler(async (req, res) => {
    res.json({ data: getAnnouncements(studentIdOf(req)) });
  }),
);

readRoutes.get(
  '/events',
  asyncHandler(async (req, res) => {
    res.json({ data: getEvents(studentIdOf(req)) });
  }),
);

readRoutes.get(
  '/assignments',
  asyncHandler(async (req, res) => {
    res.json({ data: getAssignments(studentIdOf(req)) });
  }),
);

// `me` for the signed-in student; an explicit id for teachers and admins.
studentsRouter.use('/:studentId', requireSelfOrStaff, readRoutes);
