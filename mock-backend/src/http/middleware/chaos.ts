import type { NextFunction, Request, Response } from 'express';

/**
 * Fault injection for demonstrating client-side resilience (retries, rollback of
 * optimistic updates, loading states). Configurable globally through
 * `PUT /api/_admin/chaos`, or per request via the `x-mock-latency` (ms),
 * `x-mock-failure-rate` (0–1) and `x-mock-fail` ("true") headers.
 */
export interface ChaosSettings {
  latencyMs: number;
  /** Probability (0–1) that a request is rejected with HTTP 503. */
  failureRate: number;
}

export const chaosSettings: ChaosSettings = { latencyMs: 300, failureRate: 0 };

export function chaos(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith('/_admin')) return next();

  const latency = Number(req.header('x-mock-latency') ?? chaosSettings.latencyMs);
  const failureRate = Number(req.header('x-mock-failure-rate') ?? chaosSettings.failureRate);
  const shouldFail = req.header('x-mock-fail') === 'true' || Math.random() < failureRate;

  setTimeout(() => {
    if (shouldFail) {
      res.status(503).json({ message: 'Service temporarily unavailable (simulated failure)' });
      return;
    }
    next();
  }, Math.max(0, latency));
}
