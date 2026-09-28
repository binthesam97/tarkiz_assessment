import { env } from '@/core/config/env';
import { showLocalNotification } from '@/core/notifications/local-notifications';
import { hrApi } from '../data/hr-api';
import type { AppDispatch } from '@/core/store/store';
import { notificationReceived, type HrNotification } from './hr-slice';

const INTERRUPTING_CATEGORIES = new Set(['ALERT']);

/**
 * Real-time alerts while the app is running arrive over the WebSocket and are
 * surfaced as local notifications. When the app is closed, the same events
 * are delivered as remote push (FCM / APNs) by the backend — see
 * docs/system-design.md. Returns a disconnect function.
 */
export function connectNotificationFeed(accessToken: string, dispatch: AppDispatch): () => void {
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let closed = false;

  const connect = () => {
    socket = new WebSocket(`${env.wsUrl}/notifications?token=${encodeURIComponent(accessToken)}`);
    socket.onopen = () => {
      attempt = 0;
    };
    socket.onmessage = (event) => {
      try {
        const frame = JSON.parse(String(event.data)) as { type: string; payload: HrNotification };
        if (frame.type !== 'notification') return;
        dispatch(notificationReceived(frame.payload));
        // Server-pushed changes invalidate the matching RTK Query cache, so screens refetch fresh data.
        if (frame.payload.resource === 'leave') dispatch(hrApi.util.invalidateTags(['Leave']));
        if (frame.payload.resource === 'attendance') dispatch(hrApi.util.invalidateTags(['Attendance']));
        // Only actionable alerts (e.g. leave decisions) interrupt the user; everything else stays in the in-app list.
        if (INTERRUPTING_CATEGORIES.has(frame.payload.category)) {
          showLocalNotification({ title: frame.payload.title, body: frame.payload.message });
        }
      } catch {
        // Ignore malformed frames.
      }
    };
    socket.onclose = () => {
      if (closed) return;
      attempt++;
      retryTimer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempt));
    };
  };

  connect();
  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    socket?.close();
  };
}
