import { createEntityAdapter, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/core/store/store';
import { advanceStatus, compareNewestFirst, type ChatMessage } from '../data/chat.model';
import type { StatusUpdate } from '../data/chat-repository';

/**
 * Upper bound on messages held in Redux. Everything is persisted in SQLite, so
 * older messages are simply paged back in when the user scrolls up. This keeps
 * memory and list diffing flat no matter how many messages arrive.
 */
const MAX_IN_MEMORY = 300;

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

/** Newest first, matching the inverted FlatList. */
const messagesAdapter = createEntityAdapter<ChatMessage>({ sortComparer: compareNewestFirst });

interface ChatState extends ReturnType<typeof messagesAdapter.getInitialState> {
  conversationId: string | null;
  connection: ConnectionStatus;
  typingUserIds: string[];
  hasOlder: boolean;
  /** Diagnostics for the load-test demo. */
  stats: { received: number; lastBatchSize: number; lastBatchMs: number };
}

const initialState: ChatState = messagesAdapter.getInitialState({
  conversationId: null,
  connection: 'offline',
  typingUserIds: [],
  hasOlder: true,
  stats: { received: 0, lastBatchSize: 0, lastBatchMs: 0 },
});

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    conversationOpened(state, action: PayloadAction<{ conversationId: string; messages: ChatMessage[]; hasOlder: boolean }>) {
      state.conversationId = action.payload.conversationId;
      messagesAdapter.setAll(state, action.payload.messages);
      state.hasOlder = action.payload.hasOlder;
      state.typingUserIds = [];
    },
    olderMessagesLoaded(state, action: PayloadAction<{ messages: ChatMessage[]; hasOlder: boolean }>) {
      messagesAdapter.addMany(state, action.payload.messages);
      state.hasOlder = action.payload.hasOlder;
    },
    /** One action per batch of incoming messages, not one per message. */
    messagesReceived(state, action: PayloadAction<{ messages: ChatMessage[] }>) {
      const added: ChatMessage[] = [];
      for (const message of action.payload.messages) {
        const existing = state.entities[message.id];
        if (!existing) {
          added.push(message);
          continue;
        }
        // Re-delivered messages (history sync, resends) must not move a status backwards.
        existing.status = advanceStatus(existing.status, message.status);
        existing.serverTime = message.serverTime ?? existing.serverTime;
        existing.seq = message.seq ?? existing.seq;
      }
      messagesAdapter.addMany(state, added);
      if (state.ids.length > MAX_IN_MEMORY) {
        messagesAdapter.removeMany(state, state.ids.slice(MAX_IN_MEMORY));
        state.hasOlder = true;
      }
      state.stats.received += action.payload.messages.length;
      state.stats.lastBatchSize = action.payload.messages.length;
    },
    batchMeasured(state, action: PayloadAction<number>) {
      state.stats.lastBatchMs = action.payload;
    },
    messageSent(state, action: PayloadAction<ChatMessage>) {
      messagesAdapter.addOne(state, action.payload);
    },
    statusesChanged(state, action: PayloadAction<StatusUpdate[]>) {
      const reorder: ChatMessage[] = [];
      for (const { id, status, serverTime, seq } of action.payload) {
        const message = state.entities[id];
        if (!message) continue;
        message.status = advanceStatus(message.status, status);
        if (serverTime) message.serverTime = serverTime;
        if (seq !== undefined && message.seq !== seq) reorder.push({ ...message, seq });
      }
      // The sort key changed for acknowledged messages; upsert lets the adapter re-sort them.
      if (reorder.length) messagesAdapter.upsertMany(state, reorder);
    },
    connectionChanged(state, action: PayloadAction<ConnectionStatus>) {
      state.connection = action.payload;
      if (action.payload !== 'connected') state.typingUserIds = [];
    },
    typingChanged(state, action: PayloadAction<{ userId: string; isTyping: boolean }>) {
      const { userId, isTyping } = action.payload;
      state.typingUserIds = isTyping ? Array.from(new Set([...state.typingUserIds, userId])) : state.typingUserIds.filter((id) => id !== userId);
    },
    statsReset(state) {
      state.stats = initialState.stats;
    },
  },
});

export const chatActions = chatSlice.actions;
export const chatSelectors = messagesAdapter.getSelectors<RootState>((state) => state.chat);
