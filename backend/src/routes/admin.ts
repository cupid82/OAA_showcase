import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { param } from '../lib/params.js';
import { requireAuth, requireRole, userOf } from '../middleware/requireAuth.js';
import {
  adminEventSchema,
  adminEventUpdateSchema,
  adminJobSchema,
  adminJobUpdateSchema,
  listingStatusQuerySchema,
  reviewSchema,
} from '../models/opportunity.model.js';
import {
  createEvent,
  createJob,
  getEventListing,
  getJobListing,
  getOverview,
  listListings,
  reviewListing,
  updateEvent,
  updateJob,
} from '../services/admin.service.js';

/**
 * The moderation console. Admin-only, and deliberately narrow: listings and
 * aggregate counts. There is no route here that returns a student's projects,
 * check-ins or applications.
 */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

const actorOf = (req: Parameters<typeof userOf>[0]) => {
  const user = userOf(req);
  return { userId: user.id, role: user.role };
};

adminRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    res.json({ data: getOverview() });
  }),
);

// --- Events ----------------------------------------------------------------------

adminRouter.get(
  '/events',
  asyncHandler(async (req, res) => {
    const { status } = listingStatusQuerySchema.parse(req.query);
    res.json({ data: listListings('event', status) });
  }),
);

adminRouter.post(
  '/events',
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({ data: await createEvent(actorOf(req), adminEventSchema.parse(req.body)) });
  }),
);

adminRouter.get(
  '/events/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: getEventListing(param(req, 'id')) });
  }),
);

adminRouter.put(
  '/events/:id',
  asyncHandler(async (req, res) => {
    const input = adminEventUpdateSchema.parse(req.body);
    res.json({ data: await updateEvent(actorOf(req), param(req, 'id'), input) });
  }),
);

adminRouter.post(
  '/events/:id/review',
  asyncHandler(async (req, res) => {
    const input = reviewSchema.parse(req.body);
    res.json({ data: await reviewListing(actorOf(req), 'event', param(req, 'id'), input) });
  }),
);

// --- Jobs --------------------------------------------------------------------------

adminRouter.get(
  '/jobs',
  asyncHandler(async (req, res) => {
    const { status } = listingStatusQuerySchema.parse(req.query);
    res.json({ data: listListings('job', status) });
  }),
);

adminRouter.post(
  '/jobs',
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await createJob(actorOf(req), adminJobSchema.parse(req.body)) });
  }),
);

adminRouter.get(
  '/jobs/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: getJobListing(param(req, 'id')) });
  }),
);

adminRouter.put(
  '/jobs/:id',
  asyncHandler(async (req, res) => {
    const input = adminJobUpdateSchema.parse(req.body);
    res.json({ data: await updateJob(actorOf(req), param(req, 'id'), input) });
  }),
);

adminRouter.post(
  '/jobs/:id/review',
  asyncHandler(async (req, res) => {
    const input = reviewSchema.parse(req.body);
    res.json({ data: await reviewListing(actorOf(req), 'job', param(req, 'id'), input) });
  }),
);
