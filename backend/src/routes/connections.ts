import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { param } from '../lib/params.js';
import { requireAuth, requireStudent, studentIdOf } from '../middleware/requireAuth.js';
import { connectSchema, connectionUpdateSchema, providerSchema } from '../models/misc.model.js';
import { importReposSchema } from '../models/project.model.js';
import {
  connect,
  disconnect,
  importGithubRepos,
  listConnections,
  listGithubRepos,
  syncGithub,
  updateConnection,
} from '../services/connection.service.js';

export const connectionsRouter = Router();

connectionsRouter.use(requireAuth, requireStudent);

connectionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: listConnections(studentIdOf(req)) });
  }),
);

// GitHub's own routes sit before `/:provider` so they are never read as one.
connectionsRouter.post(
  '/github/sync',
  asyncHandler(async (req, res) => {
    res.json({ data: await syncGithub(studentIdOf(req)) });
  }),
);

connectionsRouter.get(
  '/github/repos',
  asyncHandler(async (req, res) => {
    res.json({ data: listGithubRepos(studentIdOf(req)) });
  }),
);

connectionsRouter.post(
  '/github/import',
  asyncHandler(async (req, res) => {
    const input = importReposSchema.parse(req.body);
    res.status(201).json({ data: await importGithubRepos(studentIdOf(req), input) });
  }),
);

connectionsRouter.put(
  '/:provider',
  asyncHandler(async (req, res) => {
    const provider = providerSchema.parse(param(req, 'provider'));
    const { handle, showOnPortfolio } = connectSchema.parse(req.body);
    res.json({ data: await connect(studentIdOf(req), provider, { handle, showOnPortfolio }) });
  }),
);

connectionsRouter.patch(
  '/:provider',
  asyncHandler(async (req, res) => {
    const provider = providerSchema.parse(param(req, 'provider'));
    const { showOnPortfolio } = connectionUpdateSchema.parse(req.body);
    res.json({ data: await updateConnection(studentIdOf(req), provider, showOnPortfolio) });
  }),
);

connectionsRouter.delete(
  '/:provider',
  asyncHandler(async (req, res) => {
    const provider = providerSchema.parse(param(req, 'provider'));
    res.json({ data: await disconnect(studentIdOf(req), provider) });
  }),
);
