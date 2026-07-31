import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { isProduction } from '../config/env.js';
import { HttpError } from '../lib/httpError.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { message: 'Validation failed', details: err.flatten().fieldErrors },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }

  console.error('[backend] unhandled error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      ...(isProduction ? {} : { detail: err instanceof Error ? err.message : String(err) }),
    },
  });
};
