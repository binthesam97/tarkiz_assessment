import * as Crypto from 'expo-crypto';
import type { AppDispatch, RootState } from '@/core/store/store';
import type { ChatMessage, ServerFrame, ServerMessage } from '../data/chat.model';
import { chatRepository, type StatusUpdate } from '../data/chat-repository';
import { ChatSocket } from '../data/chat-socket';
import { chatActions } from './chat-slice';

const PAGE_SIZE = 50;
/** Incoming messages are collected for this long and committed together. */
const FLUSH_INTERVAL_MS = 80;
const TYPING_IDLE_MS = 2_000;
const TYPING_RESEND_MS = 3_000;
const REMOTE_TYPING_TIMEOUT_MS = 5_000;

/**
 * Coordinates the socket, the SQLite store and Redux for one conversation.
 *
 * Performance under load: incoming frames are buffered and flushed every
 * ~80 ms as a single Redux action and a single SQLite transaction. A burst of
 * 1,000 messages therefore costs a handful of renders instead of 1,000.
 */
export class ChatService {
  private socket: ChatSocket | null = null;
  private incoming: ChatMessage[] = [];
  private statusUpdates: StatusUpdate[] = [];
  private toMarkDelivered: string[] = [];
  private toMarkRead: string[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private typingIdleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTypingSentAt = 0;
  private remoteTypingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private visible = false;

  constructor(
    private readonly dispatch: AppDispatch,
    private readonly getState: () => RootState,
    private readonly userId: string,
    private readonly conversationId: string,
  ) {}

  async open(): Promise<void> {
    const messages = await chatRepository.getPage(this.conversationId, PAGE_SIZE);
    this.dispatch(chatActions.conversationOpened({ conversationId: this.conversationId, messages, hasOlder: messages.length === PAGE_SIZE }));

    this.socket = new ChatSocket(this.userId, {
      onStatus: (status) => this.dispatch(chatActions.connectionChanged(status)),
      onOpen: () => void this.onConnected(),
      onFrame: (frame) => this.onFrame(frame),
    });
    this.socket.connect();
  }

  close(): void {
    this.flush();
    this.socket?.close();
    this.socket = null;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    if (this.typingIdleTimer) clearTimeout(this.typingIdleTimer);
    this.remoteTypingTimers.forEach(clearTimeout);
  }

  onNetworkRestored(): void {
    this.socket?.reconnectNow();
  }

  /** Read receipts are only sent while the conversation is actually on screen. */
  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) this.sendReceipts();
  }

  async send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    const message: ChatMessage = {
      id: Crypto.randomUUID(),
      conversationId: this.conversationId,
      senderId: this.userId,
      text: trimmed,
      sentAt: new Date().toISOString(),
      serverTime: null,
      seq: null,
      status: 'pending',
    };
    // Persist first: if the app is killed or offline, the message survives and is resent on reconnect.
    await chatRepository.upsertMany([message]);
    this.dispatch(chatActions.messageSent(message));
    this.transmit(message);
    this.setTyping(false);
  }

  async retry(message: ChatMessage): Promise<void> {
    this.transmit(message);
  }

  async loadOlder(): Promise<void> {
    const { chat } = this.getState();
    const oldest = chat.ids.length ? chat.entities[chat.ids[chat.ids.length - 1]!] : undefined;
    if (!chat.hasOlder || !oldest) return;
    const messages = await chatRepository.getPage(this.conversationId, PAGE_SIZE, oldest);
    this.dispatch(chatActions.olderMessagesLoaded({ messages, hasOlder: messages.length === PAGE_SIZE }));
  }

  /** Called on every keystroke; throttled on the wire and cleared after a short idle period. */
  onUserTyping(): void {
    const now = Date.now();
    if (now - this.lastTypingSentAt > TYPING_RESEND_MS) {
      this.lastTypingSentAt = now;
      this.socket?.send({ type: 'typing', payload: { conversationId: this.conversationId, isTyping: true } });
    }
    if (this.typingIdleTimer) clearTimeout(this.typingIdleTimer);
    this.typingIdleTimer = setTimeout(() => this.setTyping(false), TYPING_IDLE_MS);
  }

  requestLoadTest(count: number): void {
    this.dispatch(chatActions.statsReset());
    this.socket?.send({ type: 'burst', payload: { conversationId: this.conversationId, count } });
  }

  private setTyping(isTyping: boolean): void {
    if (!isTyping && this.lastTypingSentAt) {
      this.lastTypingSentAt = 0;
      this.socket?.send({ type: 'typing', payload: { conversationId: this.conversationId, isTyping: false } });
    }
  }

  private transmit(message: ChatMessage): void {
    this.socket?.send({ type: 'message', payload: { id: message.id, conversationId: message.conversationId, text: message.text, sentAt: message.sentAt } });
  }

  private async onConnected(): Promise<void> {
    this.socket?.send({ type: 'join', payload: { conversationId: this.conversationId } });
    const since = await chatRepository.latestServerTime(this.conversationId);
    this.socket?.send({ type: 'sync', payload: { conversationId: this.conversationId, since: since ?? '' } });
    // Resend everything queued while offline, in the order it was written. The server de-duplicates by id.
    const pending = await chatRepository.getPending(this.conversationId, this.userId);
    pending.forEach((message) => this.transmit(message));
  }

  private onFrame(frame: ServerFrame): void {
    switch (frame.type) {
      case 'ack':
        this.statusUpdates.push({ id: frame.payload.id, status: 'sent', serverTime: frame.payload.serverTime, seq: frame.payload.seq });
        break;
      case 'receipt':
        frame.payload.messageIds.forEach((id) => this.statusUpdates.push({ id, status: frame.payload.status }));
        break;
      case 'message':
        this.receive([frame.payload]);
        break;
      case 'history':
        this.receive(frame.payload.messages);
        break;
      case 'typing':
        this.onRemoteTyping(frame.payload.userId, frame.payload.isTyping);
        return;
    }
    this.scheduleFlush();
  }

  private receive(messages: ServerMessage[]): void {
    for (const message of messages) {
      const own = message.senderId === this.userId;
      // Our own messages echoed back through a history sync are, by definition, already on the server.
      this.incoming.push({ ...message, status: own ? 'sent' : 'delivered' });
      if (!own) {
        this.toMarkDelivered.push(message.id);
        this.toMarkRead.push(message.id);
        this.onRemoteTyping(message.senderId, false);
      }
    }
  }

  private onRemoteTyping(userId: string, isTyping: boolean): void {
    const existing = this.remoteTypingTimers.get(userId);
    if (existing) clearTimeout(existing);
    this.remoteTypingTimers.delete(userId);
    // Guard against a lost "stopped typing" frame leaving the indicator on forever.
    if (isTyping) this.remoteTypingTimers.set(userId, setTimeout(() => this.onRemoteTyping(userId, false), REMOTE_TYPING_TIMEOUT_MS));
    this.dispatch(chatActions.typingChanged({ userId, isTyping }));
  }

  private scheduleFlush(): void {
    this.flushTimer ??= setTimeout(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  private flush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;

    const incoming = this.incoming.splice(0);
    const statusUpdates = this.statusUpdates.splice(0);

    if (incoming.length) {
      void chatRepository.upsertMany(incoming);
      const started = performance.now();
      this.dispatch(chatActions.messagesReceived({ messages: incoming }));
      // Reducer + synchronous subscriber work (React schedules the actual render after this).
      this.dispatch(chatActions.batchMeasured(Math.round(performance.now() - started)));
    }
    if (statusUpdates.length) {
      void chatRepository.updateStatuses(statusUpdates);
      this.dispatch(chatActions.statusesChanged(statusUpdates));
    }
    this.sendReceipts();
  }

  /** "Delivered" goes out as soon as messages reach the device; "read" only while the conversation is visible. */
  private sendReceipts(): void {
    if (!this.socket?.isOpen) return;
    if (this.toMarkDelivered.length) {
      this.socket.send({ type: 'receipt', payload: { conversationId: this.conversationId, messageIds: this.toMarkDelivered.splice(0), status: 'delivered' } });
    }
    if (this.visible && this.toMarkRead.length) {
      this.socket.send({ type: 'receipt', payload: { conversationId: this.conversationId, messageIds: this.toMarkRead.splice(0), status: 'read' } });
    }
  }
}
