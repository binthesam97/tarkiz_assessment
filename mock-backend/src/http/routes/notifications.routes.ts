import { Router } from 'express';
import { db } from '../../data/db.js';

export const notificationRoutes = Router();

/** `?since=<ISO date>` returns notifications created after that instant, oldest first — used to backfill after a reconnect. */
notificationRoutes.get('/', (req, res) => {
  const since = typeof req.query.since === 'string' ? req.query.since : '';
  res.json(db.notifications.filter((notification) => notification.createdAt > since).reverse());
});
