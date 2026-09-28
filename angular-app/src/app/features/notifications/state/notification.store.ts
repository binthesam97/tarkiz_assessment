import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, catchError, debounceTime, distinctUntilChanged, map, of, skip, switchMap } from 'rxjs';
import { APP_CONFIG } from '../../../core/app-config';
import { NotificationSocket } from '../data/notification-socket.service';
import { AppNotification, NOTIFICATION_CATEGORIES, NotificationCategory, StoredNotification } from '../data/notification.model';

export interface NotificationState {
  /** Newest first. */
  items: StoredNotification[];
}

export type CategoryCounts = Record<NotificationCategory, { total: number; unread: number }>;

const STORAGE_KEY = 'app.notifications.v1';
const MAX_ITEMS = 200;
const PERSIST_DEBOUNCE_MS = 250;

/**
 * Notification state held in a BehaviorSubject: components read derived
 * observables, and every mutation goes through `setState`. State is hydrated
 * from and persisted to localStorage so it survives a page refresh.
 */
@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly socket = inject(NotificationSocket);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_CONFIG).apiUrl;

  private readonly state$ = new BehaviorSubject<NotificationState>(loadState());
  private connection: Subscription | null = null;

  readonly notifications$: Observable<StoredNotification[]> = this.select((state) => state.items);
  readonly unreadCount$: Observable<number> = this.select((state) => state.items.filter((item) => !item.read).length);
  readonly countsByCategory$: Observable<CategoryCounts> = this.select((state) => countByCategory(state.items));

  constructor() {
    const persistence = this.state$
      .pipe(skip(1), debounceTime(PERSIST_DEBOUNCE_MS))
      .subscribe((state) => saveState(state));
    inject(DestroyRef).onDestroy(() => {
      persistence.unsubscribe();
      this.connection?.unsubscribe();
    });
  }

  /** Opens the live feed (idempotent) and backfills anything missed while disconnected. */
  connect(): void {
    if (this.connection) return;
    this.connection = this.socket.notifications$.subscribe((notification) => this.receive([notification]));
    this.connection.add(
      this.socket.connected$
        .pipe(switchMap(() => this.fetchMissed()))
        .subscribe((missed) => this.receive(missed)),
    );
  }

  disconnect(): void {
    this.connection?.unsubscribe();
    this.connection = null;
    this.socket.disconnect();
  }

  markAsRead(id: string): void {
    this.setState((state) => ({
      items: state.items.map((item) => (item.id === id && !item.read ? { ...item, read: true } : item)),
    }));
  }

  markAllAsRead(category?: NotificationCategory): void {
    this.setState((state) => ({
      items: state.items.map((item) => (!item.read && (!category || item.category === category) ? { ...item, read: true } : item)),
    }));
  }

  remove(id: string): void {
    this.setState((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  }

  clear(): void {
    this.setState(() => ({ items: [] }));
  }

  /** Merges incoming notifications, ignoring duplicates (live frames can overlap with a backfill). */
  private receive(incoming: AppNotification[]): void {
    if (!incoming.length) return;
    this.setState((state) => {
      const known = new Set(state.items.map((item) => item.id));
      const fresh = incoming.filter((item) => !known.has(item.id)).map((item): StoredNotification => ({ ...item, read: false }));
      if (!fresh.length) return state;
      const items = [...fresh, ...state.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_ITEMS);
      return { items };
    });
  }

  private fetchMissed(): Observable<AppNotification[]> {
    const newest = this.state$.value.items[0]?.createdAt;
    if (!newest) return of([]);
    return this.http
      .get<AppNotification[]>(`${this.apiUrl}/notifications`, { params: { since: newest } })
      .pipe(catchError(() => of([])));
  }

  private setState(reducer: (state: NotificationState) => NotificationState): void {
    const next = reducer(this.state$.value);
    if (next !== this.state$.value) this.state$.next(next);
  }

  private select<T>(projector: (state: NotificationState) => T): Observable<T> {
    return this.state$.pipe(map(projector), distinctUntilChanged());
  }
}

function countByCategory(items: StoredNotification[]): CategoryCounts {
  const counts = Object.fromEntries(NOTIFICATION_CATEGORIES.map((category) => [category, { total: 0, unread: 0 }])) as CategoryCounts;
  for (const item of items) {
    counts[item.category].total++;
    if (!item.read) counts[item.category].unread++;
  }
  return counts;
}

function loadState(): NotificationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<NotificationState>) : null;
    return { items: Array.isArray(parsed?.items) ? parsed.items : [] };
  } catch {
    // Corrupt or inaccessible storage should never break the app.
    return { items: [] };
  }
}

function saveState(state: NotificationState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage disabled; persistence is best-effort.
  }
}
