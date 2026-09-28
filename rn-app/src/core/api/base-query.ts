import { retry, type BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { ApiError, request, type RequestOptions } from './http-client';
import { backoffDelay, sleep } from './retry';

export interface HttpRequest extends Omit<RequestOptions, 'signal'> {
  url: string;
}

export interface HttpError {
  status: number;
  message: string;
  isTransient: boolean;
}

const MAX_RETRIES = 3;

/** Adapts the shared HTTP client to RTK Query, so every API slice gets the same auth, timeouts and error type. */
const httpBaseQuery: BaseQueryFn<string | HttpRequest, unknown, HttpError> = async (args, { signal }) => {
  const { url, ...options } = typeof args === 'string' ? { url: args } : args;
  try {
    return { data: await request(url, { ...options, signal }) };
  } catch (error) {
    if (error instanceof ApiError) return { error: { status: error.status, message: error.message, isTransient: error.isTransient } };
    throw error;
  }
};

/**
 * Queries retry transient failures with jittered back-off. Mutations are never retried here: a
 * write is only safe to repeat when it carries an idempotency key, and the caller decides that.
 */
export const baseQuery = retry(httpBaseQuery, {
  retryCondition: (error, _args, { attempt, baseQueryApi }) =>
    baseQueryApi.type === 'query' && attempt <= MAX_RETRIES && (error as HttpError).isTransient,
  backoff: (attempt) => sleep(backoffDelay(attempt)),
});
