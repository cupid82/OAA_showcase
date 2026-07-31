import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { itemService } from '../services/itemService.js';
import { createItemSchema, updateItemSchema } from '../models/item.js';

export const itemsRouter = Router();

itemsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await itemService.list() });
  }),
);

itemsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await itemService.get(req.params.id!);
    if (!item) throw HttpError.notFound(`Item ${req.params.id} not found`);
    res.json({ data: item });
  }),
);

itemsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createItemSchema.parse(req.body);
    const item = await itemService.create(input);
    res.status(201).json({ data: item });
  }),
);

itemsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = updateItemSchema.parse(req.body);
    const item = await itemService.update(req.params.id!, input);
    if (!item) throw HttpError.notFound(`Item ${req.params.id} not found`);
    res.json({ data: item });
  }),
);

itemsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deleted = await itemService.remove(req.params.id!);
    if (!deleted) throw HttpError.notFound(`Item ${req.params.id} not found`);
    res.status(204).end();
  }),
);
