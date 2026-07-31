import { z } from 'zod';

export const itemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  done: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  done: z.boolean().optional(),
});

export const updateItemSchema = createItemSchema.partial();

export type Item = z.infer<typeof itemSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
