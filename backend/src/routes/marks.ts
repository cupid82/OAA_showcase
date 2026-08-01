import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole, userOf } from '../middleware/requireAuth.js';
import { classQuerySchema, marksEntrySchema, marksUpdateSchema } from '../models/teacher.model.js';
import { createMark, getClassMarks, updateMark } from '../services/teacher.service.js';

/**
 * Marks entry. The per-subject ceiling is enforced in the service, against the
 * subject row itself — the schema only checks shape.
 */
export const marksRouter = Router();

marksRouter.use(requireAuth, requireRole('teacher'));

marksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { subjectId, section } = classQuerySchema.parse(req.query);
    res.json({ data: getClassMarks(userOf(req), subjectId, section) });
  }),
);

marksRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = marksEntrySchema.parse(req.body);
    res.status(201).json({ data: await createMark(userOf(req), input) });
  }),
);

marksRouter.patch(
  '/:markId',
  asyncHandler(async (req, res) => {
    const input = marksUpdateSchema.parse(req.body);
    const id = req.params.markId ?? '';
    res.json({ data: await updateMark(userOf(req), id, input) });
  }),
);
