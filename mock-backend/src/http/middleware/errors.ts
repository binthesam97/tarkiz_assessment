import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../../lib/collection.js';

export class ValidationError extends Error {}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof NotFoundError) {
    res.status(404).json({ message: error.message });
    return;
  }
  if (error instanceof ValidationError) {
    res.status(400).json({ message: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
}

export function requireFields<T extends object>(body: unknown, fields: (keyof T)[]): T {
  if (typeof body !== 'object' || body === null) throw new ValidationError('Request body must be a JSON object');
  const missing = fields.filter((field) => (body as T)[field] === undefined || (body as T)[field] === '');
  if (missing.length) throw new ValidationError(`Missing required field(s): ${missing.join(', ')}`);
  return body as T;
}
