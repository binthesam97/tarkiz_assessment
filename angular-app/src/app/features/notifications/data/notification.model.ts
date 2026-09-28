export type NotificationCategory = 'SYSTEM' | 'TASK' | 'MESSAGE' | 'ALERT';

export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = ['ALERT', 'TASK', 'MESSAGE', 'SYSTEM'];

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string;
}

export interface StoredNotification extends AppNotification {
  read: boolean;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export type ServerFrame =
  | { type: 'connected'; payload: { userId: string | null; serverTime: string } }
  | { type: 'notification'; payload: AppNotification }
  | { type: 'pong'; payload: { serverTime: string } };
