import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole, userOf } from '../middleware/requireAuth.js';
import {
  adaptabilitySchema,
  assessmentQuerySchema,
  socialRecordSchema,
  studentSearchSchema,
} from '../models/teacher.model.js';
import {
  getAssessableStudents,
  getClasses,
  getDashboard,
  recordAdaptability,
  recordSocial,
  searchStudents,
} from '../services/teacher.service.js';

/**
 * Read side of the teacher module. Routes stay thin — every query, and every
 * "is this class yours" check, lives in `teacher.service.ts`.
 */
export const teachersRouter = Router();

teachersRouter.use(requireAuth, requireRole('teacher'));

teachersRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ data: getDashboard(userOf(req)) });
  }),
);

teachersRouter.get(
  '/me/classes',
  asyncHandler(async (req, res) => {
    res.json({ data: getClasses(userOf(req)) });
  }),
);

teachersRouter.get(
  '/students',
  asyncHandler(async (req, res) => {
    res.json({ data: searchStudents(userOf(req), studentSearchSchema.parse(req.query)) });
  }),
);

/**
 * The OAA input side. Both writes are audited and both trigger a recompute of the
 * student's score, because each one feeds a dimension of it.
 */
teachersRouter.get(
  '/assessments',
  asyncHandler(async (req, res) => {
    const { semester } = assessmentQuerySchema.parse(req.query);
    res.json({ data: getAssessableStudents(userOf(req), semester) });
  }),
);

teachersRouter.post(
  '/assessments/adaptability',
  asyncHandler(async (req, res) => {
    const input = adaptabilitySchema.parse(req.body);
    res.status(201).json({ data: await recordAdaptability(userOf(req), input) });
  }),
);

teachersRouter.post(
  '/records/social',
  asyncHandler(async (req, res) => {
    const input = socialRecordSchema.parse(req.body);
    res.status(201).json({ data: await recordSocial(userOf(req), input) });
  }),
);
