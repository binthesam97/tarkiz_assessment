import { env } from '@/core/config/env';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Network failures, throttling (429) and 5xx responses are worth retrying; other 4xx are not. */
  get isTransient(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

type TokenProvider = () => string | null;
let getAccessToken: TokenProvider = () => null;

/** Registered by the auth module so the client stays free of auth imports. */
export function setAccessTokenProvider(provider: TokenProvider): void {
  getAccessToken = provider;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Thin fetch wrapper: JSON in/out, timeouts, bearer token and a single error
 * type. Status 0 represents network failures and timeouts.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, headers, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const url = new URL(`${env.apiUrl}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => value !== undefined && url.searchParams.set(key, String(value)));

  // Built by hand: AbortSignal.timeout/any are not available on every Hermes version.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort);
  const token = getAccessToken();

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, timedOut ? 'Request timed out' : 'Network request failed');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = (payload as { message?: string } | null)?.message ?? `HTTP ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }
  return payload as T;
}
