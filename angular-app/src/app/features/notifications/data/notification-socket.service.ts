import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, filter, fromEvent, interval, map, race, repeat, retry, share, takeUntil, timer } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import { APP_CONFIG } from '../../../core/app-config';
import { AppNotification, ConnectionStatus, ServerFrame } from './notification.model';

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const HEARTBEAT_MS = 25_000;

/**
 * Owns the notification WebSocket and keeps it alive.
 *
 * Reconnection uses exponential back-off with jitter (1s, 2s, 4s … capped at
 * 30s) and short-circuits the wait when the browser comes back online. The
 * back-off resets after a successful connection.
 */
@Injectable({ providedIn: 'root' })
export class NotificationSocket {
  private readonly url = `${inject(APP_CONFIG).wsUrl}/notifications`;

  readonly status = signal<ConnectionStatus>('offline');
  readonly reconnectAttempt = signal(0);

  /** Emits after every successful (re)connection, used to backfill missed notifications. */
  readonly connected$ = new Subject<void>();

  private readonly stop$ = new Subject<void>();

  /**
   * Hot stream of notifications. The socket opens on first subscription and
   * closes when the last subscriber leaves (`share` ref-counting).
   */
  readonly notifications$: Observable<AppNotification> = this.frames().pipe(
    filter((frame): frame is Extract<ServerFrame, { type: 'notification' }> => frame.type === 'notification'),
    map((frame) => frame.payload),
    share(),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop$.next());
  }

  disconnect(): void {
    this.stop$.next();
    this.status.set('offline');
  }

  private frames(): Observable<ServerFrame> {
    return new Observable<ServerFrame>((subscriber) => {
      this.status.set(this.reconnectAttempt() ? 'reconnecting' : 'connecting');

      const socket = webSocket<ServerFrame | { type: 'ping' }>({
        url: this.url,
        openObserver: {
          next: () => {
            this.status.set('connected');
            this.reconnectAttempt.set(0);
            this.connected$.next();
          },
        },
      });

      const frames = (socket as Observable<ServerFrame>).subscribe(subscriber);
      const heartbeat = interval(HEARTBEAT_MS).subscribe(() => socket.next({ type: 'ping' }));
      return () => {
        heartbeat.unsubscribe();
        frames.unsubscribe();
      };
    }).pipe(
      // A clean server-side close completes the stream; reconnect exactly as for an error.
      repeat({ delay: () => this.backoff() }),
      retry({ delay: () => this.backoff() }),
      takeUntil(this.stop$),
    );
  }

  private backoff(): Observable<unknown> {
    const attempt = this.reconnectAttempt() + 1;
    this.reconnectAttempt.set(attempt);
    this.status.set(navigator.onLine ? 'reconnecting' : 'offline');

    const exponential = Math.min(MAX_BACKOFF_MS, INITIAL_BACKOFF_MS * 2 ** (attempt - 1));
    const jittered = exponential / 2 + Math.random() * (exponential / 2);
    return race(timer(jittered), fromEvent(window, 'online'));
  }
}
