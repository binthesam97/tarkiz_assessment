import { useEffect } from 'react';
import { env } from '@/core/config/env';
import { requestNotificationPermission, showLocalNotification } from '@/core/notifications/local-notifications';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { shopApi } from '../api/shop-api';

interface OrderEvent {
  title: string;
  message: string;
  resource?: string;
  link?: string;
}

/**
 * Order events for the signed-in customer while the app is open. The backend publishes them from
 * the order service; with the app closed, the same events arrive as FCM / APNs push notifications
 * carrying the same `link`, which `useNotificationDeepLinks` routes to the order screen.
 */
export function useOrderUpdates(): void {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.session?.accessToken ?? null);

  useEffect(() => {
    if (!token) return;
    void requestNotificationPermission();

    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let closed = false;

    const connect = () => {
      socket = new WebSocket(`${env.wsUrl}/notifications?token=${encodeURIComponent(token)}`);
      socket.onopen = () => (attempt = 0);
      socket.onmessage = (event) => {
        let frame: { type: string; payload: OrderEvent };
        try {
          frame = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (frame.type !== 'notification' || frame.payload.resource !== 'order') return;
        dispatch(shopApi.util.invalidateTags(['Order']));
        showLocalNotification({ title: frame.payload.title, body: frame.payload.message, url: frame.payload.link });
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
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, [token, dispatch]);
}
