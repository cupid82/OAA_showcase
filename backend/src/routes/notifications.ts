import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { param } from '../lib/params.js';
import { requireAuth, userOf } from '../middleware/requireAuth.js';
import { notificationUpdateSchema } from '../models/misc.model.js';
import { markAllRead, openInbox, updateNotification } from '../services/notification.service.js';

/** Every signed-in user has an inbox; each only ever reads their own. */
export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await openInbox(userOf(req).id) });
  }),
);

notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    res.json({ data: await markAllRead(userOf(req).id) });
  }),
);

notificationsRouter.patch(
  '/:notificationId',
  asyncHandler(async (req, res) => {
    const change = notificationUpdateSchema.parse(req.body);
    res.json({
      data: await updateNotification(userOf(req).id, param(req, 'notificationId'), change),
    });
  }),
);
