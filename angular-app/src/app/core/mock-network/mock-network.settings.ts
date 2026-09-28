import { Injectable, signal } from '@angular/core';

/**
 * Demo-only fault injection. Values are forwarded to the mock backend as
 * request headers by `mockNetworkInterceptor`; `null` means "use the server default".
 */
@Injectable({ providedIn: 'root' })
export class MockNetworkSettings {
  readonly latencyMs = signal<number | null>(null);
  readonly failureRate = signal<number | null>(null);
  /** Fails every non-GET request, to demonstrate rollback of optimistic updates. */
  readonly failMutations = signal(false);

  reset(): void {
    this.latencyMs.set(null);
    this.failureRate.set(null);
    this.failMutations.set(false);
  }
}
