import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env, isProduction } from './config/env.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { connectionsRouter } from './routes/connections.js';
import { healthRouter } from './routes/health.js';
import { dashboardRouter, meRouter } from './routes/me.js';
import { metaRouter } from './routes/meta.js';
import { notificationsRouter } from './routes/notifications.js';
import { eventsRouter, jobsRouter } from './routes/opportunities.js';
import { projectsRouter } from './routes/projects.js';
import { skillsRouter } from './routes/skills.js';
import { leaderboardRouter, wellbeingRouter } from './routes/wellbeing.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(isProduction ? 'combined' : 'dev'));

  // Public
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', metaRouter);

  // Signed in
  app.use('/api/notifications', notificationsRouter);

  // Student — every one of these resolves the caller's own record from the token.
  // Each is mounted at its own prefix: a router-level guard mounted at bare `/api`
  // would also run for every route mounted after it.
  app.use('/api/me', meRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/skills', skillsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/wellbeing', wellbeingRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/connections', connectionsRouter);

  // Admin
  app.use('/api/admin', adminRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
