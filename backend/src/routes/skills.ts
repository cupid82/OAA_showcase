import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { param } from '../lib/params.js';
import { requireAuth, requireStudent, studentIdOf } from '../middleware/requireAuth.js';
import {
  addSkillSchema,
  certificateSchema,
  practiceSchema,
  updateSkillSchema,
} from '../models/skill.model.js';
import {
  addCertificate,
  addSkill,
  deleteCertificate,
  deletePractice,
  getSkillDetail,
  getSkills,
  logPractice,
  removeSkill,
  updateSkill,
} from '../services/skill.service.js';

export const skillsRouter = Router();

skillsRouter.use(requireAuth, requireStudent);

skillsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: getSkills(studentIdOf(req)) });
  }),
);

skillsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({ data: await addSkill(studentIdOf(req), addSkillSchema.parse(req.body)) });
  }),
);

// Certificates and practice entries sit before `/:skillId` so the literal
// segments are never read as skill ids.
skillsRouter.post(
  '/certificates',
  asyncHandler(async (req, res) => {
    const input = certificateSchema.parse(req.body);
    res.status(201).json({ data: await addCertificate(studentIdOf(req), input) });
  }),
);

skillsRouter.delete(
  '/certificates/:certificateId',
  asyncHandler(async (req, res) => {
    res.json({ data: await deleteCertificate(studentIdOf(req), param(req, 'certificateId')) });
  }),
);

skillsRouter.delete(
  '/practice/:logId',
  asyncHandler(async (req, res) => {
    await deletePractice(studentIdOf(req), param(req, 'logId'));
    res.json({ data: null });
  }),
);

skillsRouter.get(
  '/:skillId',
  asyncHandler(async (req, res) => {
    res.json({ data: getSkillDetail(studentIdOf(req), param(req, 'skillId')) });
  }),
);

skillsRouter.patch(
  '/:skillId',
  asyncHandler(async (req, res) => {
    const { level } = updateSkillSchema.parse(req.body);
    res.json({ data: await updateSkill(studentIdOf(req), param(req, 'skillId'), level) });
  }),
);

skillsRouter.delete(
  '/:skillId',
  asyncHandler(async (req, res) => {
    res.json({ data: await removeSkill(studentIdOf(req), param(req, 'skillId')) });
  }),
);

skillsRouter.post(
  '/:skillId/practice',
  asyncHandler(async (req, res) => {
    const input = practiceSchema.parse(req.body);
    res
      .status(201)
      .json({ data: await logPractice(studentIdOf(req), param(req, 'skillId'), input) });
  }),
);
