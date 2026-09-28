import jwt from 'jsonwebtoken';
import type { WebSocket } from 'ws';
import { config } from '../config.js';
import type { NotificationCategory, Role } from '../data/models.js';
import { pick } from '../lib/random.js';
import { addSubscriber, publishNotification } from './notification-hub.js';
import { encode, parseFrame } from './protocol.js';

/**
 * `/ws/notifications?token=<jwt>` — the token is optional; without it the
 * client only receives broadcast notifications.
 */
export function handleNotificationConnection(socket: WebSocket, url: URL): void {
  const { userId, roles } = resolveUser(url.searchParams.get('token'));
  addSubscriber(socket, userId, roles);
  socket.send(encode('connected', { userId, serverTime: new Date().toISOString() }));

  socket.on('message', (raw) => {
    if (parseFrame(raw)?.type === 'ping') socket.send(encode('pong', { serverTime: new Date().toISOString() }));
  });
}

function resolveUser(token: string | null): { userId: string | null; roles: Role[] } {
  if (!token) return { userId: null, roles: [] };
  try {
    const claims = jwt.verify(token, config.jwt.secret) as { sub: string; roles?: Role[] };
    return { userId: claims.sub, roles: claims.roles ?? [] };
  } catch {
    return { userId: null, roles: [] };
  }
}

const SAMPLES: Record<NotificationCategory, { title: string; message: string }[]> = {
  SYSTEM: [
    { title: 'Scheduled maintenance', message: 'The HR portal will be unavailable Saturday 02:00–04:00 UTC.' },
    { title: 'New version available', message: 'Version 2.4 adds bulk leave approvals.' },
  ],
  TASK: [
    { title: 'Timesheet due', message: 'Submit your timesheet for this week by Friday 6 PM.' },
    { title: 'Review requested', message: 'Priya requested your review on the Q3 appraisal form.' },
  ],
  MESSAGE: [
    { title: 'Message from Rahul', message: 'Can we move the stand-up to 10:30?' },
    { title: 'Message from HR', message: 'Please update your emergency contact details.' },
  ],
  ALERT: [
    { title: 'Unusual sign-in', message: 'A sign-in from a new device was detected on your account.' },
    { title: 'Payroll alert', message: 'Bank details for 3 employees failed validation.' },
  ],
};

/** Emits a sample notification on a fixed interval so the dashboard has live traffic. */
export function startNotificationFeed(): NodeJS.Timeout {
  return setInterval(() => {
    const category = pick(Object.keys(SAMPLES) as NotificationCategory[]);
    publishNotification({ category, ...pick(SAMPLES[category]) });
  }, config.notifications.intervalMs);
}
