import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole, userOf } from '../middleware/requireAuth.js';
import {
  attendanceQuerySchema,
  attendanceUpdateSchema,
  bulkAttendanceSchema,
} from '../models/teacher.model.js';
import {
  getClassAttendance,
  markAttendanceBulk,
  updateAttendance,
} from '../services/teacher.service.js';

/**
 * Attendance writes. A duplicate submission for the same (subject, section, date)
 * is rejected with a 409 rather than silently doubling every percentage in the
 * system — see `markAttendanceBulk`.
 */
export const attendanceRouter = Router();

attendanceRouter.use(requireAuth, requireRole('teacher'));

attendanceRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { subjectId, section, date } = attendanceQuerySchema.parse(req.query);
    res.json({ data: getClassAttendance(userOf(req), subjectId, section, date) });
  }),
);

attendanceRouter.post(
  '/bulk',
  asyncHandler(async (req, res) => {
    const input = bulkAttendanceSchema.parse(req.body);
    res.status(201).json({ data: await markAttendanceBulk(userOf(req), input) });
  }),
);

attendanceRouter.patch(
  '/:attendanceId',
  asyncHandler(async (req, res) => {
    const { status } = attendanceUpdateSchema.parse(req.body);
    const id = req.params.attendanceId ?? '';
    res.json({ data: await updateAttendance(userOf(req), id, status) });
  }),
);
