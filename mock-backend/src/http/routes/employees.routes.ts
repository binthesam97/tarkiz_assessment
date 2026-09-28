import { Router } from 'express';
import { db } from '../../data/db.js';
import type { Employee } from '../../data/models.js';
import { randomId } from '../../lib/random.js';
import { requireFields } from '../middleware/errors.js';

type EmployeeInput = Omit<Employee, 'id' | 'updatedAt' | 'version'>;

export const employeeRoutes = Router();

/** `?updatedSince=<ISO date>` returns only records changed after that instant (delta sync). */
employeeRoutes.get('/', (req, res) => {
  const updatedSince = typeof req.query.updatedSince === 'string' ? Date.parse(req.query.updatedSince) : NaN;
  const employees = db.employees.list();
  res.json({
    items: Number.isNaN(updatedSince)
      ? employees
      : employees.filter((employee) => Date.parse(employee.updatedAt) > updatedSince),
    serverTime: new Date().toISOString(),
  });
});

employeeRoutes.get('/:id', (req, res) => {
  res.json(db.employees.get(req.params.id));
});

employeeRoutes.post('/', (req, res) => {
  const input = requireFields<EmployeeInput & { id?: string }>(req.body, ['firstName', 'lastName', 'email', 'department']);
  const employee = db.employees.create({
    id: input.id ?? randomId('e-'),
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    department: input.department,
    phone: input.phone ?? '',
    designation: input.designation ?? 'Associate',
    location: input.location ?? '',
    version: 1,
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json(employee);
});

/**
 * Optimistic concurrency: the client sends the `version` it last saw. A stale
 * version yields 409 with the current server copy so the client can resolve.
 */
employeeRoutes.put('/:id', (req, res) => {
  const current = db.employees.get(req.params.id);
  const { version, ...changes } = req.body as Partial<Employee>;
  if (version !== undefined && version !== current.version) {
    res.status(409).json({ message: 'Version conflict', current });
    return;
  }
  delete changes.id;
  delete changes.updatedAt;
  res.json(db.employees.update(current.id, { ...changes, version: current.version + 1 }));
});

employeeRoutes.delete('/:id', (req, res) => {
  db.employees.remove(req.params.id);
  res.status(204).end();
});
