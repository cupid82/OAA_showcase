import { z } from 'zod';

import { APPLICATION_STAGES, EVENT_TYPES, JOB_KINDS } from '../data/types.js';
import {
  isoDateSchema,
  optionalUrlSchema,
  skillIdsSchema,
  urlSchema,
  yearsSchema,
} from './common.model.js';

// --- A student's own tracking ----------------------------------------------------

export const participationSchema = z.object({
  /** `none` clears the student's relationship with the event entirely. */
  status: z.enum(['none', 'saved', 'registered', 'attended']),
  outcome: z.enum(['participated', 'finalist', 'winner']).nullable().optional(),
  reflection: z.string().trim().max(1000).optional(),
  skillIds: skillIdsSchema.optional(),
});

export const applicationSchema = z.object({
  /** `none` stops tracking the job. */
  stage: z.enum(['none', ...APPLICATION_STAGES]),
  note: z.string().trim().max(1000).optional(),
});

// --- Listings --------------------------------------------------------------------------

const listingBase = {
  title: z.string().trim().min(3, 'Give it a title').max(120),
  organiser: z.string().trim().min(2, 'Who runs it?').max(100),
  description: z.string().trim().min(20, 'Describe it in a sentence or two').max(2000),
  eligibility: z.string().trim().max(300).default(''),
  eligibleYears: yearsSchema.default([]),
  skillIds: skillIdsSchema.default([]),
  effort: z.string().trim().max(80).default(''),
};

const eventFields = {
  type: z.enum(EVENT_TYPES),
  mode: z.enum(['in-person', 'online', 'hybrid']),
  location: z.string().trim().min(2, 'Where is it?').max(120),
  startsOn: isoDateSchema,
  endsOn: z.union([isoDateSchema, z.null()]).optional().default(null),
  time: z.string().trim().max(60).default(''),
  registerBy: z.union([isoDateSchema, z.null()]).optional().default(null),
  capacity: z.number().int().min(1).max(100000).nullable().optional().default(null),
};

const jobFields = {
  kind: z.enum(JOB_KINDS),
  mode: z.enum(['onsite', 'remote', 'hybrid']),
  location: z.string().trim().min(2, 'Where is it?').max(120),
  compensation: z.string().trim().max(80).default(''),
  duration: z.string().trim().max(80).default(''),
  deadline: z.union([isoDateSchema, z.null()]).optional().default(null),
  niceSkillIds: skillIdsSchema.default([]),
};

const datesInOrder = (value: {
  startsOn: string;
  endsOn: string | null;
  registerBy: string | null;
}) =>
  (value.endsOn === null || value.endsOn >= value.startsOn) &&
  (value.registerBy === null || value.registerBy <= (value.endsOn ?? value.startsOn));

/**
 * What a student can share. Always an outside listing, so a link to the source is
 * required — a moderator checks it before anyone else sees the listing.
 */
export const shareEventSchema = z
  .object({ ...listingBase, ...eventFields, url: urlSchema })
  .refine(datesInOrder, { message: 'Check the dates — it cannot end before it starts' });

export const shareJobSchema = z.object({ ...listingBase, ...jobFields, url: urlSchema });

/**
 * What a moderator can publish directly. They also choose the source label — but
 * never "student-shared" on something they posted themselves. Editing a listing
 * a student shared keeps that label, so updates accept it.
 */
const adminEventObject = z.object({
  ...listingBase,
  ...eventFields,
  trackIds: z.array(z.string().trim().min(1)).max(8).default([]),
  url: optionalUrlSchema,
  verification: z.enum(['college', 'partner', 'external']),
});

export const adminEventSchema = adminEventObject.refine(datesInOrder, {
  message: 'Check the dates — it cannot end before it starts',
});

export const adminEventUpdateSchema = adminEventObject
  .extend({ verification: z.enum(['college', 'partner', 'student', 'external']) })
  .refine(datesInOrder, { message: 'Check the dates — it cannot end before it starts' });

export const adminJobSchema = z.object({
  ...listingBase,
  ...jobFields,
  trackIds: z.array(z.string().trim().min(1)).max(8).default([]),
  url: optionalUrlSchema,
  verification: z.enum(['college', 'partner', 'external']),
});

export const adminJobUpdateSchema = adminJobSchema.extend({
  verification: z.enum(['college', 'partner', 'student', 'external']),
});

export const reviewSchema = z.object({
  decision: z.enum(['approve', 'reject', 'archive', 'restore']),
  note: z.string().trim().max(300).optional().default(''),
});

export const listingStatusQuerySchema = z.object({
  status: z.enum(['published', 'pending', 'rejected', 'archived']).optional(),
});

export type ParticipationInput = z.infer<typeof participationSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type ShareEventInput = z.infer<typeof shareEventSchema>;
export type ShareJobInput = z.infer<typeof shareJobSchema>;
export type AdminEventInput = z.infer<typeof adminEventSchema>;
export type AdminJobInput = z.infer<typeof adminJobSchema>;
export type AdminEventUpdateInput = z.infer<typeof adminEventUpdateSchema>;
export type AdminJobUpdateInput = z.infer<typeof adminJobUpdateSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
