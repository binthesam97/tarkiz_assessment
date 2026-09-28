import { ApiError } from './http-client';

const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 5_000;

/**
 * Exponential back-off with "full jitter": a random delay between zero and the exponential cap.
 * Spreading retries out stops thousands of clients from retrying in lock-step after an outage.
 */
export function backoffDelay(attempt: number): number {
  return Math.random() * Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Retries transient failures only. The operation must be safe to repeat (a read, or a write with an idempotency key). */
export async function withRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxAttempts || !(error instanceof ApiError) || !error.isTransient) throw error;
      await sleep(backoffDelay(attempt));
    }
  }
}
