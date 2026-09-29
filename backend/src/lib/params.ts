import type { Request } from 'express';

import { HttpError } from './httpError.js';

/**
 * A route parameter, narrowed to a string. Express types params as an index
 * signature, so without this every handler would carry a non-null assertion.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw HttpError.badRequest(`Missing ${name}.`);
  return value;
}
