import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../lib/asyncHandler.js';
import { param } from '../lib/params.js';
import { requireAuth, requireStudent, studentIdOf } from '../middleware/requireAuth.js';
import {
  applicationSchema,
  participationSchema,
  shareEventSchema,
  shareJobSchema,
} from '../models/opportunity.model.js';
import {
  getEvent,
  listEvents,
  setEventInterest,
  setParticipation,
  shareEvent,
} from '../services/event.service.js';
import {
  getJob,
  listJobs,
  setApplication,
  setJobInterest,
  shareJob,
} from '../services/job.service.js';

const interestSchema = z.object({ notInterested: z.boolean() });

// --- Events ---------------------------------------------------------------------

export const eventsRouter = Router();

eventsRouter.use(requireAuth, requireStudent);

eventsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: listEvents(studentIdOf(req)) });
  }),
);

/** POST /api/events — a student shares an outside event for review. */
eventsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({ data: await shareEvent(studentIdOf(req), shareEventSchema.parse(req.body)) });
  }),
);

eventsRouter.get(
  '/:eventId',
  asyncHandler(async (req, res) => {
    res.json({ data: getEvent(studentIdOf(req), param(req, 'eventId')) });
  }),
);

eventsRouter.put(
  '/:eventId/participation',
  asyncHandler(async (req, res) => {
    const input = participationSchema.parse(req.body);
    res.json({ data: await setParticipation(studentIdOf(req), param(req, 'eventId'), input) });
  }),
);

eventsRouter.put(
  '/:eventId/interest',
  asyncHandler(async (req, res) => {
    const { notInterested } = interestSchema.parse(req.body);
    res.json({
      data: await setEventInterest(studentIdOf(req), param(req, 'eventId'), notInterested),
    });
  }),
);

// --- Jobs ---------------------------------------------------------------------

export const jobsRouter = Router();

jobsRouter.use(requireAuth, requireStudent);

jobsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: listJobs(studentIdOf(req)) });
  }),
);

/** POST /api/jobs — a student shares an outside opening for review. */
jobsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({ data: await shareJob(studentIdOf(req), shareJobSchema.parse(req.body)) });
  }),
);

jobsRouter.get(
  '/:jobId',
  asyncHandler(async (req, res) => {
    res.json({ data: getJob(studentIdOf(req), param(req, 'jobId')) });
  }),
);

jobsRouter.put(
  '/:jobId/application',
  asyncHandler(async (req, res) => {
    const input = applicationSchema.parse(req.body);
    res.json({ data: await setApplication(studentIdOf(req), param(req, 'jobId'), input) });
  }),
);

jobsRouter.put(
  '/:jobId/interest',
  asyncHandler(async (req, res) => {
    const { notInterested } = interestSchema.parse(req.body);
    res.json({ data: await setJobInterest(studentIdOf(req), param(req, 'jobId'), notInterested) });
  }),
);
