import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { chaos } from './http/middleware/chaos.js';
import { errorHandler } from './http/middleware/errors.js';
import { adminRoutes } from './http/routes/admin.routes.js';
import { authRoutes } from './http/routes/auth.routes.js';
import { catalogRoutes } from './http/routes/catalog.routes.js';
import { employeeRoutes } from './http/routes/employees.routes.js';
import { hrRoutes } from './http/routes/hr.routes.js';
import { locationRoutes } from './http/routes/locations.routes.js';
import { notificationRoutes } from './http/routes/notifications.routes.js';
import { productRoutes } from './http/routes/products.routes.js';
import { searchRoutes } from './http/routes/search.routes.js';
import { shopRoutes } from './http/routes/shop.routes.js';
import { handleChatConnection } from './realtime/chat.socket.js';
import { handleNotificationConnection, startNotificationFeed } from './realtime/notifications.socket.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const api = express.Router();
api.use(chaos);
api.use('/_admin', adminRoutes);
api.use('/auth', authRoutes);
api.use('/products', productRoutes);
api.use('/employees', employeeRoutes);
api.use('/catalog', catalogRoutes);
api.use('/search', searchRoutes);
api.use('/locations', locationRoutes);
api.use('/notifications', notificationRoutes);
api.use('/shop', shopRoutes);
api.use('/', hrRoutes);
app.use('/api', api);
app.use(errorHandler);

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

const socketHandlers: Record<string, typeof handleChatConnection> = {
  '/ws/notifications': handleNotificationConnection,
  '/ws/chat': handleChatConnection,
};

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  const handler = socketHandlers[url.pathname];
  if (!handler) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => handler(ws, url));
});

startNotificationFeed();

server.listen(config.port, () => {
  console.log(`Mock backend listening on http://localhost:${config.port}`);
  console.log(`WebSockets: ws://localhost:${config.port}/ws/notifications, ws://localhost:${config.port}/ws/chat`);
});
