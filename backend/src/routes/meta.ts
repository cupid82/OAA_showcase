import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { param } from '../lib/params.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getPortfolio } from '../services/portfolio.service.js';
import { getCatalog, getMeta } from '../services/profile.service.js';

/**
 * The three routes that are not a student's or an admin's own data: the shell's
 * public metadata, the skill catalogue, and public portfolios.
 */
export const metaRouter = Router();

/** GET /api/meta — public. Where "Open in ERP" points, and the academic year. */
metaRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    res.json({ data: getMeta() });
  }),
);

/** GET /api/catalog — skills and goals, for pickers. Any signed-in user. */
metaRouter.get(
  '/catalog',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ data: getCatalog() });
  }),
);

/**
 * GET /api/portfolio/:handle — public, no sign-in. Returns only what the student
 * switched on; a private portfolio is indistinguishable from a missing one.
 */
metaRouter.get(
  '/portfolio/:handle',
  asyncHandler(async (req, res) => {
    res.json({ data: getPortfolio(param(req, 'handle')) });
  }),
);
