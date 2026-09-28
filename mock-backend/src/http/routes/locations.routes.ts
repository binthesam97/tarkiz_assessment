import { Router } from 'express';
import { db } from '../../data/db.js';
import type { LocationPoint } from '../../data/models.js';
import { requireFields } from '../middleware/errors.js';

export const locationRoutes = Router();

/**
 * Accepts a batch of route points. Batches are idempotent on `id`, so a client
 * may safely retry an upload whose response it never received.
 */
locationRoutes.post('/batch', (req, res) => {
  const batch = requireFields<{ id: string; employeeId: string; points: LocationPoint[] }>(req.body, ['id', 'employeeId', 'points']);
  const existing = db.routes.find((stored) => stored.id === batch.id);
  if (existing) {
    res.json({ id: existing.id, accepted: existing.points.length, duplicate: true });
    return;
  }
  db.routes.push({ ...batch, receivedAt: new Date().toISOString() });
  res.status(201).json({ id: batch.id, accepted: batch.points.length, duplicate: false });
});

locationRoutes.get('/:employeeId', (req, res) => {
  const points = db.routes
    .filter((batch) => batch.employeeId === req.params.employeeId)
    .flatMap((batch) => batch.points)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  res.json(points);
});
