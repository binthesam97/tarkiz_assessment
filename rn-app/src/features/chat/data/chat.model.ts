export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
  /** Client-generated UUID; doubles as the idempotency key for resends. */
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  sentAt: string;
  serverTime: string | null;
  /** Server-assigned order; null until the server acknowledges the message. */
  seq: number | null;
  status: MessageStatus;
}

/** Newest first. Unacknowledged local messages (no seq yet) sort as the newest within a timestamp. */
export function compareNewestFirst(a: ChatMessage, b: ChatMessage): number {
  return b.sentAt.localeCompare(a.sentAt) || (b.seq ?? Number.MAX_SAFE_INTEGER) - (a.seq ?? Number.MAX_SAFE_INTEGER);
}

const STATUS_RANK: Record<MessageStatus, number> = { failed: 0, pending: 1, sent: 2, delivered: 3, read: 4 };

/** Receipts can arrive out of order (e.g. "read" before "delivered"); status only ever moves forward. */
export function advanceStatus(current: MessageStatus, next: MessageStatus): MessageStatus {
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}

/** Wire frames — see mock-backend/src/realtime/chat.socket.ts for the protocol. */
export type ServerFrame =
  | { type: 'ack'; payload: { id: string; seq: number; serverTime: string } }
  | { type: 'message'; payload: ServerMessage }
  | { type: 'typing'; payload: { conversationId: string; userId: string; isTyping: boolean } }
  | { type: 'receipt'; payload: { conversationId: string; messageIds: string[]; status: 'delivered' | 'read'; userId: string } }
  | { type: 'history'; payload: { conversationId: string; messages: ServerMessage[] } };

export type ServerMessage = Omit<ChatMessage, 'status' | 'serverTime' | 'seq'> & { serverTime: string; seq: number };

export type ClientFrame =
  | { type: 'join'; payload: { conversationId: string } }
  | { type: 'message'; payload: { id: string; conversationId: string; text: string; sentAt: string } }
  | { type: 'typing'; payload: { conversationId: string; isTyping: boolean } }
  | { type: 'receipt'; payload: { conversationId: string; messageIds: string[]; status: 'delivered' | 'read' } }
  | { type: 'sync'; payload: { conversationId: string; since: string } }
  | { type: 'burst'; payload: { conversationId: string; count: number } };
