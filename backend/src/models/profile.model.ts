import { z } from 'zod';

import { INTERESTS, NOTIFICATION_CATEGORIES, PROVIDERS } from '../data/types.js';
import type { NotificationCategory } from '../data/types.js';
import { idSchema } from './common.model.js';

/** Lowercase letters, digits and single hyphens — it becomes a URL. */
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/,
    'Use 3–30 lowercase letters, numbers or hyphens, starting and ending with a letter or number',
  );

export const profileSchema = z.object({
  headline: z.string().trim().max(120),
  bio: z.string().trim().max(600),
  handle: handleSchema,
});

export const interestsSchema = z
  .array(z.enum(INTERESTS))
  .max(INTERESTS.length)
  .transform((values) => [...new Set(values)]);

export const weeklyHoursSchema = z.number().int().min(1).max(40);

export const goalSchema = z.object({
  trackId: idSchema,
  interests: interestsSchema,
  weeklyHours: weeklyHoursSchema,
});

export const preferencesSchema = z.object({
  notify: z.object(
    Object.fromEntries(
      NOTIFICATION_CATEGORIES.map((category) => [category, z.boolean()]),
    ) as Record<NotificationCategory, z.ZodBoolean>,
  ),
  emailDigest: z.enum(['off', 'weekly']),
  leaderboardVisible: z.boolean(),
  portfolioPublic: z.boolean(),
});

export const onboardingSchema = z.object({
  trackId: idSchema,
  interests: interestsSchema,
  weeklyHours: weeklyHoursSchema,
  skills: z
    .array(
      z.object({
        skillId: idSchema,
        level: z.enum(['beginner', 'intermediate', 'advanced']),
      }),
    )
    .max(20),
  emailDigest: z.enum(['off', 'weekly']),
  leaderboardVisible: z.boolean(),
  portfolioPublic: z.boolean(),
  /** Optional accounts to link on the way in. Consent is the act of submitting. */
  connections: z
    .array(z.object({ provider: z.enum(PROVIDERS), handle: z.string().trim().min(1).max(200) }))
    .max(PROVIDERS.length)
    .default([]),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
