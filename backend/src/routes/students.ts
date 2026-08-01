import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireSelfOrStaff, studentIdOf } from '../middleware/requireAuth.js';
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

// `me` for the signed-in student; an explicit id for teachers and admins.
studentsRouter.use('/:studentId', requireSelfOrStaff, readRoutes);
