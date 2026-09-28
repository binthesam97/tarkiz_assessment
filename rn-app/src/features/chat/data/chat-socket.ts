import { env } from '@/core/config/env';
import type { ClientFrame, ServerFrame } from './chat.model';

type Status = 'connecting' | 'connected' | 'reconnecting' | 'offline';

interface ChatSocketHandlers {
  onFrame: (frame: ServerFrame) => void;
  onStatus: (status: Status) => void;
  onOpen: () => void;
}

const MAX_BACKOFF_MS = 30_000;

/** WebSocket wrapper with exponential back-off reconnection. Frames sent while disconnected are dropped; the outbox resends them. */
export class ChatSocket {
  private socket: WebSocket | null = null;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByClient = false;

  constructor(
    private readonly userId: string,
    private readonly handlers: ChatSocketHandlers,
  ) {}

  get isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    this.closedByClient = false;
    this.handlers.onStatus(this.attempt ? 'reconnecting' : 'connecting');
    const socket = new WebSocket(`${env.wsUrl}/chat?userId=${encodeURIComponent(this.userId)}`);
    this.socket = socket;

    socket.onopen = () => {
      this.attempt = 0;
      this.handlers.onStatus('connected');
      this.handlers.onOpen();
    };
    socket.onmessage = (event) => {
      try {
        this.handlers.onFrame(JSON.parse(String(event.data)) as ServerFrame);
      } catch {
        // Ignore malformed frames rather than tearing down the connection.
      }
    };
    socket.onclose = () => {
      this.socket = null;
      if (!this.closedByClient) this.scheduleReconnect();
    };
  }

  /** Reconnect immediately (e.g. when the network comes back) instead of waiting for the back-off. */
  reconnectNow(): void {
    if (this.isOpen || this.closedByClient) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.connect();
  }

  send(frame: ClientFrame): boolean {
    if (!this.isOpen) return false;
    this.socket!.send(JSON.stringify(frame));
    return true;
  }

  close(): void {
    this.closedByClient = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
    this.handlers.onStatus('offline');
  }

  private scheduleReconnect(): void {
    this.attempt++;
    this.handlers.onStatus('reconnecting');
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** (this.attempt - 1));
    this.reconnectTimer = setTimeout(() => this.connect(), delay / 2 + Math.random() * (delay / 2));
  }
}
