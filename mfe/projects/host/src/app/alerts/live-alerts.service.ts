import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { API_BASE_URL, AuthService, WS_BASE_URL } from '@acme/shared';
import { Subject, catchError, of } from 'rxjs';

export interface LiveAlert {
  id: string;
  category: string;
  title: string;
  message: string;
  resource?: 'leave' | 'attendance';
  createdAt: string;
}

export interface PortalNotification extends LiveAlert {
  read: boolean;
}

const MAX_NOTIFICATIONS = 50;
const MAX_REMEMBERED_READ_IDS = 500;
const TOAST_DURATION_MS = 5000;

/**
 * Notifications for the signed-in user: recent history on connect, then role-targeted
 * real-time alerts over a WebSocket (e.g. HR sees new leave requests). Read state is kept
 * per notification and remembered per user in localStorage, so it survives a refresh.
 * Connects on sign-in, disconnects on sign-out and reconnects with back-off.
 */
@Injectable({ providedIn: 'root' })
export class LiveAlertsService {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL);
  private readonly wsUrl = `${inject(WS_BASE_URL)}/notifications`;
  private socket: WebSocket | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private attempt = 0;
  private readIds = new Set<string>();

  /** Newest first. */
  readonly notifications = signal<PortalNotification[]>([]);
  readonly unread = computed(() => this.notifications().filter((item) => !item.read).length);
  /** The most recent live alert, shown briefly as a toast. */
  readonly toast = signal<LiveAlert | null>(null);
  /** Emits for alerts tied to a resource, so pages can refresh their data. */
  readonly resourceChanged$ = new Subject<NonNullable<LiveAlert['resource']>>();

  constructor() {
    effect(() => {
      const token = this.auth.isAuthenticated() ? this.auth.accessToken : null;
      this.disconnect();
      this.notifications.set([]);
      if (!token) return;
      this.readIds = this.loadReadIds();
      this.loadHistory();
      this.connect(token);
    });
  }

  markRead(id: string): void {
    this.notifications.update((items) => items.map((item) => (item.id === id && !item.read ? { ...item, read: true } : item)));
    this.readIds.add(id);
    this.saveReadIds();
  }

  markAllRead(): void {
    this.notifications.update((items) => items.map((item) => (item.read ? item : { ...item, read: true })));
    this.notifications().forEach((item) => this.readIds.add(item.id));
    this.saveReadIds();
  }

  dismissToast(): void {
    clearTimeout(this.toastTimer);
    this.toast.set(null);
  }

  /** Recent broadcast notifications, so the list is populated before the next live one arrives. */
  private loadHistory(): void {
    this.http
      .get<LiveAlert[]>(`${this.apiUrl}/notifications`)
      .pipe(catchError(() => of<LiveAlert[]>([])))
      .subscribe((history) => this.merge(history));
  }

  private connect(token: string): void {
    const socket = new WebSocket(`${this.wsUrl}?token=${encodeURIComponent(token)}`);
    this.socket = socket;
    socket.onopen = () => (this.attempt = 0);
    socket.onmessage = (event) => {
      const frame = JSON.parse(String(event.data)) as { type: string; payload: LiveAlert };
      if (frame.type !== 'notification') return;
      this.merge([frame.payload]);
      this.showToast(frame.payload);
      if (frame.payload.resource) this.resourceChanged$.next(frame.payload.resource);
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.attempt++;
      this.retryTimer = setTimeout(() => this.connect(token), Math.min(30_000, 1000 * 2 ** this.attempt));
    };
  }

  /** Adds notifications, ignoring duplicates (history and live frames can overlap). */
  private merge(incoming: LiveAlert[]): void {
    this.notifications.update((items) => {
      const known = new Set(items.map((item) => item.id));
      const fresh = incoming
        .filter((item) => !known.has(item.id))
        .map((item): PortalNotification => ({ ...item, read: this.readIds.has(item.id) }));
      return [...fresh, ...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_NOTIFICATIONS);
    });
  }

  private showToast(alert: LiveAlert): void {
    clearTimeout(this.toastTimer);
    this.toast.set(alert);
    this.toastTimer = setTimeout(() => this.toast.set(null), TOAST_DURATION_MS);
  }

  private disconnect(): void {
    clearTimeout(this.retryTimer);
    const socket = this.socket;
    this.socket = null;
    socket?.close();
  }

  private storageKey(): string {
    return `tarkiz.hr.readNotifications.${this.auth.user()?.sub ?? 'anonymous'}`;
  }

  private loadReadIds(): Set<string> {
    try {
      return new Set(JSON.parse(localStorage.getItem(this.storageKey()) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  }

  private saveReadIds(): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify([...this.readIds].slice(-MAX_REMEMBERED_READ_IDS)));
    } catch {
      // Storage full or disabled; read state then lasts for this session only.
    }
  }
}
