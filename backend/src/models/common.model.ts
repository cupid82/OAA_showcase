import { z } from 'zod';

/**
 * Building blocks shared by every request schema. Rule 5 of CLAUDE.md: bodies are
 * validated here, and `errorHandler` turns a ZodError into a 400 — no route ever
 * needs a try/catch for validation.
 */

/** `YYYY-MM-DD`, and a real day — `2026-02-31` parses as a Date but is not one. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => new Date(`${value}T00:00:00Z`).toISOString().startsWith(value), {
    message: 'That date does not exist',
  });

/** http(s) only — a `javascript:` URL in a link field would run in the viewer's tab. */
export const urlSchema = z
  .string()
  .trim()
  .max(300)
  .url('Enter a full link, starting with https://')
  .refine((value) => /^https?:\/\//i.test(value), { message: 'Links must start with http(s)://' });

/** An optional link: empty string and null both mean "none". */
export const optionalUrlSchema = z
  .union([urlSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const idSchema = z.string().trim().min(1).max(80);

/** Skill ids are checked against the catalogue in the service. */
export const skillIdsSchema = z
  .array(idSchema)
  .max(12, 'Pick at most twelve skills')
  .transform((ids) => [...new Set(ids)]);

export const yearsSchema = z
  .array(z.number().int().min(1).max(4))
  .max(4)
  .transform((years) => [...new Set(years)].sort());
