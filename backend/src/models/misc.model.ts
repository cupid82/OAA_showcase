import { z } from 'zod';

import { PROVIDERS } from '../data/types.js';

// --- Wellbeing --------------------------------------------------------------------

const rating = (label: string) =>
  z.number().int(`${label} must be a whole number`).min(1).max(5, `${label} runs from 1 to 5`);

export const checkinSchema = z.object({
  energy: rating('Energy'),
  stress: rating('Stress'),
  sleepHours: z.number().min(0).max(14).multipleOf(0.5, 'Round sleep to the nearest half hour'),
  workload: rating('Workload'),
  enjoyment: rating('Enjoyment'),
  note: z.string().trim().max(500).optional().default(''),
});

export const snoozeSchema = z.object({
  /** 0 lifts the snooze. */
  days: z.union([z.literal(0), z.literal(3), z.literal(7), z.literal(14)]),
});

// --- Connected apps ---------------------------------------------------------------

export const providerSchema = z.enum(PROVIDERS);

export const connectSchema = z.object({
  /** A handle or a full profile link — the service normalises either. */
  handle: z.string().trim().min(1, 'Enter your username or profile link').max(200),
  showOnPortfolio: z.boolean().default(true),
  /** The student must tick the consent box. Anything but `true` is refused. */
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Tick the box to confirm you want this account linked' }),
  }),
});

export const connectionUpdateSchema = z.object({ showOnPortfolio: z.boolean() });

// --- Leaderboard, notifications, Today -----------------------------------------------

export const leaderboardQuerySchema = z.object({
  window: z.enum(['month', 'all']).default('month'),
  category: z.enum(['overall', 'building', 'learning', 'events']).default('overall'),
  scope: z.enum(['college', 'department', 'year']).default('college'),
});

export const notificationUpdateSchema = z
  .object({ read: z.literal(true), dismissed: z.literal(true) })
  .partial()
  .refine((value) => value.read || value.dismissed, { message: 'Nothing to update' });

export const dismissSchema = z.object({
  key: z.string().trim().min(3).max(160),
});

export type CheckinInput = z.infer<typeof checkinSchema>;
export type ConnectInput = z.infer<typeof connectSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
