import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, finalize, retry, shareReplay, tap, throwError, timer } from 'rxjs';
import { APP_CONFIG } from '../../core/app-config';
import { SearchLog } from './search-log';

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;
const CACHE_LIMIT = 100;

@Injectable()
export class SuggestionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_CONFIG).apiUrl;
  private readonly log = inject(SearchLog, { optional: true });

  /**
   * Cached observables keyed by normalised term. Storing the shared observable
   * (rather than the resolved value) also de-duplicates concurrent requests for
   * the same term.
   */
  private readonly cache = new Map<string, Observable<string[]>>();

  search(term: string): Observable<string[]> {
    const key = term.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached) {
      this.log?.add('cache-hit', key);
      return cached;
    }

    let succeeded = false;
    const request$ = this.fetch(key).pipe(
      retry({
        count: MAX_RETRIES,
        delay: (error: unknown, attempt) => {
          if (!isRetryable(error)) return throwError(() => error);
          this.log?.add('retry', key, `attempt ${attempt} of ${MAX_RETRIES}`);
          return timer(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
        },
      }),
      tap({
        next: (results) => {
          succeeded = true;
          this.log?.add('success', key, `${results.length} result(s)`);
        },
        error: (error: unknown) => this.log?.add('error', key, describeError(error)),
      }),
      // Only successful responses stay cached; failed or cancelled lookups are evicted so they can be retried.
      finalize(() => {
        if (!succeeded && this.cache.get(key) === request$) this.cache.delete(key);
      }),
      // refCount lets switchMap cancel the in-flight HTTP call when the user keeps typing;
      // once completed, the replayed value serves later subscribers from the cache.
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.remember(key, request$);
    return request$;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private fetch(term: string): Observable<string[]> {
    return defer(() => {
      this.log?.add('request', term);
      let settled = false;
      return this.http
        .get<string[]>(`${this.apiUrl}/search`, { params: { q: term } })
        .pipe(
          tap({ complete: () => (settled = true), error: () => (settled = true) }),
          finalize(() => {
            if (!settled) this.log?.add('cancelled', term);
          }),
        );
    });
  }

  /** Simple LRU: re-inserting moves a key to the end; the oldest entry is evicted first. */
  private remember(key: string, value: Observable<string[]>): void {
    this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > CACHE_LIMIT) this.cache.delete(this.cache.keys().next().value!);
  }
}

/** Network errors and 5xx responses are transient; 4xx responses are not worth retrying. */
function isRetryable(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
}

function describeError(error: unknown): string {
  return error instanceof HttpErrorResponse ? `HTTP ${error.status || 'network error'}` : 'unexpected error';
}
