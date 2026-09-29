import { z } from 'zod';

import { idSchema, isoDateSchema, optionalUrlSchema, skillIdsSchema } from './common.model.js';

export const projectStatusSchema = z.enum(['idea', 'building', 'shipped', 'paused']);
export const visibilitySchema = z.enum(['private', 'campus', 'public']);

export const projectSchema = z.object({
  title: z.string().trim().min(2, 'Give the project a name').max(80),
  tagline: z.string().trim().max(140).default(''),
  problem: z.string().trim().max(1000).default(''),
  role: z.string().trim().max(500).default(''),
  outcome: z.string().trim().max(1000).default(''),
  status: projectStatusSchema.default('idea'),
  skillIds: skillIdsSchema.default([]),
  repoUrl: optionalUrlSchema,
  demoUrl: optionalUrlSchema,
  /** Private until the student says otherwise — nothing is published by default. */
  visibility: visibilitySchema.default('private'),
  openToCollaborators: z.boolean().default(false),
  lookingFor: z.string().trim().max(200).default(''),
});

/** Every field optional, but whatever is sent is validated just the same. */
export const projectUpdateSchema = projectSchema.partial();

export const taskSchema = z.object({
  title: z.string().trim().min(2, 'Describe the milestone').max(120),
  dueDate: z.union([isoDateSchema, z.null()]).optional().default(null),
});

export const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    done: z.boolean(),
    dueDate: z.union([isoDateSchema, z.null()]),
  })
  .partial();

export const joinRequestSchema = z.object({
  message: z.string().trim().min(10, 'Say a sentence about what you would bring').max(400),
});

export const joinDecisionSchema = z.object({
  decision: z.enum(['accepted', 'declined']),
  /** The role the newcomer takes, when accepted. */
  role: z.string().trim().max(80).optional().default('Collaborator'),
});

export const discoverQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  skill: idSchema.optional(),
});

export const importReposSchema = z.object({
  repos: z.array(z.string().trim().min(3).max(140)).min(1, 'Pick at least one repository').max(30),
  status: z.enum(['building', 'shipped']).default('shipped'),
  visibility: z.enum(['private', 'campus', 'public']).default('private'),
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type ImportReposInput = z.infer<typeof importReposSchema>;
