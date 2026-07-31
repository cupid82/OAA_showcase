import { Router } from 'express';

import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    env: env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
