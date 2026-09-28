import type { WebSocket } from 'ws';
import { db } from '../data/db.js';
import type { AppNotification, NotificationCategory, Role } from '../data/models.js';
import { randomId } from '../lib/random.js';

interface Subscriber {
  socket: WebSocket;
  userId: string | null;
  roles: Role[];
}

/** Omit for a broadcast; otherwise deliver to one user or to everyone holding one of the roles. */
export type NotificationTarget = { userId: string } | { roles: Role[] };

const subscribers = new Set<Subscriber>();
const HISTORY_LIMIT = 200;

export function addSubscriber(socket: WebSocket, userId: string | null, roles: Role[] = []): void {
  const subscriber: Subscriber = { socket, userId, roles };
  subscribers.add(subscriber);
  socket.on('close', () => subscribers.delete(subscriber));
}

export function publishNotification(
  input: Pick<AppNotification, 'category' | 'title' | 'message' | 'resource' | 'link'> & { category: NotificationCategory },
  target?: NotificationTarget,
): AppNotification {
  const notification: AppNotification = { id: randomId('n-'), createdAt: new Date().toISOString(), ...input };
  // Only broadcasts are kept for backfill; targeted notifications are delivered live only.
  if (!target) {
    db.notifications.unshift(notification);
    db.notifications.length = Math.min(db.notifications.length, HISTORY_LIMIT);
  }

  const frame = JSON.stringify({ type: 'notification', payload: notification });
  for (const subscriber of subscribers) {
    if (target && !matches(subscriber, target)) continue;
    if (subscriber.socket.readyState === subscriber.socket.OPEN) subscriber.socket.send(frame);
  }
  return notification;
}

export function disconnectAllSubscribers(): number {
  const count = subscribers.size;
  subscribers.forEach(({ socket }) => socket.terminate());
  return count;
}

function matches(subscriber: Subscriber, target: NotificationTarget): boolean {
  return 'userId' in target ? subscriber.userId === target.userId : subscriber.roles.some((role) => target.roles.includes(role));
}
