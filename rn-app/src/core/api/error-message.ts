import { ApiError } from './http-client';
import type { HttpError } from './base-query';

/** One mapping from failures to user-facing copy, so every screen words the same problem the same way. */
export function describeError(error: unknown): string {
  const status = error instanceof ApiError ? error.status : (error as Partial<HttpError> | undefined)?.status;
  const message = error instanceof ApiError ? error.message : (error as Partial<HttpError> | undefined)?.message;
  if (status === 0) return 'You appear to be offline. Check your connection and try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status !== undefined && status >= 500) return 'We are having trouble reaching our servers. Please try again shortly.';
  return message ?? 'Something unexpected happened. Please try again.';
}
