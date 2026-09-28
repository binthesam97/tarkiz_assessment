import type { WebSocket } from 'ws';
import { randomId } from '../lib/random.js';
import { encode, parseFrame } from './protocol.js';

/**
 * Chat protocol (`/ws/chat?userId=<id>`).
 *
 * Client → server
 *   join     { conversationId }
 *   message  { id, conversationId, text, sentAt }     id is client-generated (idempotency key)
 *   typing   { conversationId, isTyping }
 *   receipt  { conversationId, messageIds, status: 'delivered' | 'read' }
 *   sync     { conversationId, since }                replay messages missed while offline
 *   burst    { conversationId, count }                load-test helper
 *
 * Server → client
 *   ack      { id, seq, serverTime }                   message persisted ("sent")
 *   message  ChatMessage
 *   typing   { conversationId, userId, isTyping }
 *   receipt  { conversationId, messageIds, status, userId }
 *   history  { conversationId, messages }
 *
 * When a user is alone in a conversation, a bot participant replies so the
 * full lifecycle (sent → delivered → read, typing indicator) can be demoed
 * from a single device.
 */
interface ChatMessage {
  id: string;
  /** Server-assigned, strictly increasing. Orders messages that share a timestamp (e.g. a burst). */
  seq: number;
  conversationId: string;
  senderId: string;
  text: string;
  sentAt: string;
  serverTime: string;
}

interface Member {
  socket: WebSocket;
  userId: string;
}

const BOT_ID = 'bot';
const MAX_BURST = 5000;
const BURST_CHUNK = 100;

let nextSeq = 1;
const rooms = new Map<string, Set<Member>>();
const history = new Map<string, ChatMessage[]>();

export function handleChatConnection(socket: WebSocket, url: URL): void {
  const member: Member = { socket, userId: url.searchParams.get('userId') ?? randomId('guest-') };
  const joined = new Set<string>();

  socket.on('message', (raw) => {
    const frame = parseFrame(raw);
    if (!frame) return;
    const payload = frame.payload as Record<string, unknown>;
    const conversationId = String(payload.conversationId ?? '');
    if (!conversationId) return;

    switch (frame.type) {
      case 'join':
        room(conversationId).add(member);
        joined.add(conversationId);
        break;
      case 'message':
        onMessage(member, conversationId, String(payload.id ?? randomId('m-')), String(payload.text ?? ''), String(payload.sentAt ?? new Date().toISOString()));
        break;
      case 'typing':
        broadcast(conversationId, member, encode('typing', { conversationId, userId: member.userId, isTyping: Boolean(payload.isTyping) }));
        break;
      case 'receipt':
        broadcast(conversationId, member, encode('receipt', { conversationId, messageIds: payload.messageIds, status: payload.status, userId: member.userId }));
        break;
      case 'sync': {
        const since = String(payload.since ?? '');
        const messages = (history.get(conversationId) ?? []).filter((message) => message.serverTime > since);
        socket.send(encode('history', { conversationId, messages }));
        break;
      }
      case 'burst':
        sendBurst(socket, conversationId, Math.min(MAX_BURST, Number(payload.count) || 1000));
        break;
    }
  });

  socket.on('close', () => joined.forEach((conversationId) => rooms.get(conversationId)?.delete(member)));
}

function room(conversationId: string): Set<Member> {
  let members = rooms.get(conversationId);
  if (!members) rooms.set(conversationId, (members = new Set()));
  return members;
}

function broadcast(conversationId: string, sender: Member | null, frame: string): void {
  room(conversationId).forEach((member) => {
    if (member !== sender && member.socket.readyState === member.socket.OPEN) member.socket.send(frame);
  });
}

function store(message: ChatMessage): boolean {
  const messages = history.get(message.conversationId) ?? [];
  if (messages.some((existing) => existing.id === message.id)) return false;
  messages.push(message);
  history.set(message.conversationId, messages);
  return true;
}

function onMessage(sender: Member, conversationId: string, id: string, text: string, sentAt: string): void {
  const existing = history.get(conversationId)?.find((candidate) => candidate.id === id);
  const message: ChatMessage = existing ?? { id, seq: nextSeq++, conversationId, senderId: sender.userId, text, sentAt, serverTime: new Date().toISOString() };
  const isNew = store(message);
  sender.socket.send(encode('ack', { id, seq: message.seq, serverTime: message.serverTime }));
  if (!isNew) return;

  broadcast(conversationId, sender, encode('message', message));

  const othersPresent = [...room(conversationId)].some((member) => member.userId !== sender.userId);
  if (!othersPresent) simulateBotReply(sender, message);
}

function simulateBotReply(sender: Member, original: ChatMessage): void {
  const { conversationId } = original;
  const send = (frame: string) => sender.socket.readyState === sender.socket.OPEN && sender.socket.send(frame);

  setTimeout(() => send(encode('receipt', { conversationId, messageIds: [original.id], status: 'delivered', userId: BOT_ID })), 400);
  setTimeout(() => send(encode('receipt', { conversationId, messageIds: [original.id], status: 'read', userId: BOT_ID })), 1200);
  setTimeout(() => send(encode('typing', { conversationId, userId: BOT_ID, isTyping: true })), 1500);
  setTimeout(() => {
    send(encode('typing', { conversationId, userId: BOT_ID, isTyping: false }));
    const reply: ChatMessage = {
      id: randomId('m-'),
      seq: nextSeq++,
      conversationId,
      senderId: BOT_ID,
      text: `You said: "${original.text}"`,
      sentAt: new Date().toISOString(),
      serverTime: new Date().toISOString(),
    };
    store(reply);
    send(encode('message', reply));
  }, 3000);
}

/** Sends `count` messages in chunks, yielding between chunks so the event loop stays responsive. */
function sendBurst(socket: WebSocket, conversationId: string, count: number): void {
  let sent = 0;
  const sendChunk = () => {
    const end = Math.min(count, sent + BURST_CHUNK);
    for (; sent < end; sent++) {
      const now = new Date().toISOString();
      const message: ChatMessage = { id: randomId('m-'), seq: nextSeq++, conversationId, senderId: BOT_ID, text: `Load test message #${sent + 1}`, sentAt: now, serverTime: now };
      store(message);
      if (socket.readyState === socket.OPEN) socket.send(encode('message', message));
    }
    if (sent < count) setImmediate(sendChunk);
  };
  sendChunk();
}
