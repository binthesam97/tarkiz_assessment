import { Router, type NextFunction, type Request, type Response } from 'express';
import { config } from '../../config.js';
import { db } from '../../data/db.js';
import type { NotificationCategory } from '../../data/models.js';
import { disconnectAllSubscribers, publishNotification } from '../../realtime/notification-hub.js';
import { chaosSettings, type ChaosSettings } from '../middleware/chaos.js';
import { requireFields } from '../middleware/errors.js';

/**
 * Demo controls. Sending a test notification and dropping sockets are harmless and back buttons in the
 * Angular demos, so they stay open. Changing the *global* failure rate would break the app for every
 * viewer of a shared deployment, so it requires ADMIN_KEY when one is configured.
 */
export const adminRoutes = Router();

function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  if (config.adminKey && req.header('x-admin-key') !== config.adminKey) {
    res.status(403).json({ message: 'Admin key required' });
    return;
  }
  next();
}

adminRoutes.get('/chaos', (_req, res) => {
  res.json(chaosSettings);
});

adminRoutes.put('/chaos', requireAdminKey, (req, res) => {
  const { latencyMs, failureRate } = req.body as Partial<ChaosSettings>;
  if (latencyMs !== undefined) chaosSettings.latencyMs = Math.max(0, Number(latencyMs));
  if (failureRate !== undefined) chaosSettings.failureRate = Math.min(1, Math.max(0, Number(failureRate)));
  res.json(chaosSettings);
});

adminRoutes.post('/notifications', (req, res) => {
  const input = requireFields<{ category: NotificationCategory; title: string; message: string; userId?: string }>(req.body, ['category', 'title', 'message']);
  res.status(201).json(publishNotification(input, input.userId ? { userId: input.userId } : undefined));
});

adminRoutes.get('/notifications', (_req, res) => {
  res.json(db.notifications);
});

/** Drops every notification socket to demonstrate client reconnection. */
adminRoutes.post('/ws/disconnect', (_req, res) => {
  res.json({ disconnected: disconnectAllSubscribers() });
});
