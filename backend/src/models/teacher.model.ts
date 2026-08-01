import { z } from 'zod';

import { ADAPTABILITY_CRITERIA } from '../data/types.js';
import type { AdaptabilityCriterion } from '../data/types.js';

/**
 * Request shapes for the teacher write path. Rule 5 of CLAUDE.md: every body is
 * validated here, and `errorHandler` turns a ZodError into a 400 — so no route
 * below ever needs a try/catch for validation.
 */

/** `YYYY-MM-DD`, and a real day — `2026-02-31` parses as a Date but is not one. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => new Date(`${value}T00:00:00Z`).toISOString().startsWith(value), {
    message: 'That date does not exist',
  });

export const attendanceStatusSchema = z.enum(['present', 'absent']);

export const classQuerySchema = z.object({
  subjectId: z.string().trim().min(1, 'Pick a subject'),
  section: z.string().trim().min(1, 'Pick a section'),
});

export const attendanceQuerySchema = classQuerySchema.extend({ date: isoDateSchema });

export const bulkAttendanceSchema = attendanceQuerySchema.extend({
  entries: z
    .array(
      z.object({
        studentId: z.string().trim().min(1),
        status: attendanceStatusSchema,
      }),
    )
    .min(1, 'Mark at least one student')
    // A duplicate student in one payload would write two rows for the same day.
    .refine((entries) => new Set(entries.map((entry) => entry.studentId)).size === entries.length, {
      message: 'The same student appears twice in this submission',
    }),
});

export const attendanceUpdateSchema = z.object({ status: attendanceStatusSchema });

/**
 * Marks are validated against the subject's own maximums in the service — the
 * ceiling is per-subject data, not a constant, so it cannot live in the schema.
 */
const markValueSchema = z
  .number()
  .int('Marks must be whole numbers')
  .min(0, 'Marks cannot be negative');

export const marksEntrySchema = z.object({
  studentId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  internal: markValueSchema,
  external: markValueSchema,
});

export const marksUpdateSchema = z.object({
  internal: markValueSchema,
  external: markValueSchema,
});

/**
 * A full adaptability assessment — all seven criteria, each 1–5.
 *
 * Deliberately all-or-nothing: a partial rating would average against criteria the
 * teacher never considered, which silently misstates the dimension.
 */
export const adaptabilitySchema = z.object({
  studentId: z.string().trim().min(1),
  semester: z.coerce.number().int().min(1).max(8),
  note: z.string().trim().max(500).optional().default(''),
  scores: z.object(
    Object.fromEntries(
      ADAPTABILITY_CRITERIA.map((criterion) => [
        criterion,
        z
          .number()
          .int(`${criterion} must be a whole number`)
          .min(1, `${criterion} must be at least 1`)
          .max(5, `${criterion} cannot exceed 5`),
      ]),
    ) as Record<AdaptabilityCriterion, z.ZodNumber>,
  ),
});

export const socialRecordSchema = z.object({
  studentId: z.string().trim().min(1),
  semester: z.coerce.number().int().min(1).max(8),
  activity: z.enum(['event', 'volunteering', 'club', 'mentoring', 'outreach']),
  label: z.string().trim().min(1, 'Describe what the student did').max(120),
  points: z
    .number()
    .int('Points must be a whole number')
    .min(1, 'Award at least one point')
    .max(25, 'A single record cannot be worth more than 25 points'),
});

export const leaderboardQuerySchema = z.object({
  scope: z.enum(['college', 'department', 'section']).default('college'),
  category: z
    .enum(['oaa', 'academic', 'adaptability', 'physical', 'social', 'attendance'])
    .default('oaa'),
});

export const assessmentQuerySchema = z.object({
  semester: z.coerce.number().int().min(1).max(8),
});

export const studentSearchSchema = z.object({
  /** Matches roll number or name, case-insensitive. */
  q: z.string().trim().optional(),
  subjectId: z.string().trim().optional(),
  section: z.string().trim().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
});

export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
export type AttendanceUpdateInput = z.infer<typeof attendanceUpdateSchema>;
export type MarksEntryInput = z.infer<typeof marksEntrySchema>;
export type MarksUpdateInput = z.infer<typeof marksUpdateSchema>;
export type StudentSearchInput = z.infer<typeof studentSearchSchema>;
export type AdaptabilityInput = z.infer<typeof adaptabilitySchema>;
export type SocialRecordInput = z.infer<typeof socialRecordSchema>;
export type ClassQueryInput = z.infer<typeof classQuerySchema>;
export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>;
