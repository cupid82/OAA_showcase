import { z } from 'zod';

import { idSchema, isoDateSchema, optionalUrlSchema, skillIdsSchema } from './common.model.js';

export const skillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const addSkillSchema = z.object({
  skillId: idSchema,
  level: skillLevelSchema,
});

export const updateSkillSchema = z.object({ level: skillLevelSchema });

export const practiceSchema = z.object({
  /** One sitting. Twelve hours is already more than a healthy one. */
  minutes: z
    .number()
    .int()
    .min(5, 'Log at least five minutes')
    .max(720, 'That is over twelve hours'),
  date: isoDateSchema,
  note: z.string().trim().max(200).optional().default(''),
});

export const certificateSchema = z.object({
  title: z.string().trim().min(2, 'Give the certificate a title').max(120),
  issuer: z.string().trim().min(2, 'Who issued it?').max(80),
  issuedOn: isoDateSchema,
  url: optionalUrlSchema,
  skillIds: skillIdsSchema,
  showOnPortfolio: z.boolean().default(true),
});

export type AddSkillInput = z.infer<typeof addSkillSchema>;
export type PracticeInput = z.infer<typeof practiceSchema>;
export type CertificateInput = z.infer<typeof certificateSchema>;
