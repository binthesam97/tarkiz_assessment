import { Router } from 'express';
import { db } from '../../data/db.js';
import type { LeaveRequest, LeaveStatus } from '../../data/models.js';
import { randomId } from '../../lib/random.js';
import { publishNotification } from '../../realtime/notification-hub.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { requireFields, ValidationError } from '../middleware/errors.js';

export const hrRoutes = Router();
hrRoutes.use(authenticate);

const today = () => new Date().toISOString().slice(0, 10);

hrRoutes.get('/attendance/me', (req, res) => {
  const records = db.attendance.list().filter((record) => record.employeeId === req.user!.employeeId);
  res.json(records.sort((a, b) => b.date.localeCompare(a.date)));
});

/** Idempotent per employee per day, so offline clients can replay check-ins safely. */
hrRoutes.post('/attendance/check-in', (req, res) => {
  const employeeId = req.user!.employeeId;
  const date = (req.body?.date as string | undefined) ?? today();
  const existing = db.attendance.list().find((record) => record.employeeId === employeeId && record.date === date);
  if (existing) {
    res.json(existing);
    return;
  }
  const checkIn = (req.body?.timestamp as string | undefined) ?? new Date().toISOString();
  res.status(201).json(
    db.attendance.create({ id: randomId('a-'), employeeId, date, checkIn, checkOut: null, updatedAt: checkIn }),
  );
});

hrRoutes.post('/attendance/check-out', (req, res) => {
  const employeeId = req.user!.employeeId;
  const date = (req.body?.date as string | undefined) ?? today();
  const record = db.attendance.list().find((candidate) => candidate.employeeId === employeeId && candidate.date === date);
  if (!record) throw new ValidationError('Cannot check out before checking in');
  res.json(db.attendance.update(record.id, { checkOut: (req.body?.timestamp as string | undefined) ?? new Date().toISOString() }));
});

hrRoutes.get('/leaves/me', (req, res) => {
  res.json(db.leaves.list().filter((leave) => leave.employeeId === req.user!.employeeId));
});

hrRoutes.post('/leaves', (req, res) => {
  const input = requireFields<Pick<LeaveRequest, 'type' | 'from' | 'to' | 'reason'> & { id?: string }>(req.body, ['type', 'from', 'to']);
  if (input.from > input.to) throw new ValidationError('"from" must be on or before "to"');
  const leave = db.leaves.create({
    id: input.id ?? randomId('l-'),
    employeeId: req.user!.employeeId,
    type: input.type,
    from: input.from,
    to: input.to,
    reason: input.reason ?? '',
    status: 'PENDING',
    updatedAt: new Date().toISOString(),
  });
  publishNotification(
    { category: 'TASK', title: 'New leave request', message: `${req.user!.name} requested ${leave.type.toLowerCase()} leave from ${leave.from} to ${leave.to}`, resource: 'leave' },
    { roles: ['HR', 'ADMIN'] },
  );
  res.status(201).json(leave);
});

hrRoutes.get('/leaves', authorize('HR', 'ADMIN'), (_req, res) => {
  res.json(db.leaves.list());
});

hrRoutes.patch('/leaves/:id', authorize('HR', 'ADMIN'), (req, res) => {
  const { status } = requireFields<{ status: LeaveStatus }>(req.body, ['status']);
  if (!['APPROVED', 'REJECTED'].includes(status)) throw new ValidationError('status must be APPROVED or REJECTED');
  const leave = db.leaves.update(req.params.id as string, { status });
  const owner = db.users.find((user) => user.employeeId === leave.employeeId);
  if (owner) {
    publishNotification(
      { category: 'ALERT', title: `Leave ${status.toLowerCase()}`, message: `Your leave from ${leave.from} to ${leave.to} was ${status.toLowerCase()}.`, resource: 'leave' },
      { userId: owner.id },
    );
  }
  res.json(leave);
});

hrRoutes.get('/reports/headcount', authorize('HR', 'ADMIN'), (_req, res) => {
  const byDepartment = new Map<string, number>();
  db.employees.list().forEach(({ department }) => byDepartment.set(department, (byDepartment.get(department) ?? 0) + 1));
  res.json([...byDepartment].map(([department, count]) => ({ department, count })));
});
