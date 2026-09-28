import { Injectable, signal } from '@angular/core';

export type SearchLogKind = 'request' | 'success' | 'cache-hit' | 'retry' | 'error' | 'cancelled';

export interface SearchLogEntry {
  id: number;
  kind: SearchLogKind;
  term: string;
  detail?: string;
  at: Date;
}

const MAX_ENTRIES = 50;

/** Records what the search pipeline does so the demo can visualise debounce, cancellation, caching and retries. */
@Injectable()
export class SearchLog {
  private nextId = 1;
  readonly entries = signal<SearchLogEntry[]>([]);

  add(kind: SearchLogKind, term: string, detail?: string): void {
    const entry: SearchLogEntry = { id: this.nextId++, kind, term, detail, at: new Date() };
    this.entries.update((entries) => [entry, ...entries].slice(0, MAX_ENTRIES));
  }

  clear(): void {
    this.entries.set([]);
  }
}
