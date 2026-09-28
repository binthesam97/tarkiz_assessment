import { getDatabase, writeTransaction } from '@/core/db/database';
import { advanceStatus, type ChatMessage, type MessageStatus } from './chat.model';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  sent_at: string;
  server_time: string | null;
  seq: number | null;
  status: MessageStatus;
}

export interface StatusUpdate {
  id: string;
  status: MessageStatus;
  serverTime?: string;
  seq?: number;
}

const toMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  text: row.text,
  sentAt: row.sent_at,
  serverTime: row.server_time,
  seq: row.seq,
  status: row.status,
});

export const chatRepository = {
  /**
   * Newest first. `before` is the oldest message currently loaded; the
   * (sent_at, seq) cursor stays correct when many messages share a timestamp.
   */
  async getPage(conversationId: string, limit: number, before?: Pick<ChatMessage, 'sentAt' | 'seq'>): Promise<ChatMessage[]> {
    const db = await getDatabase();
    const order = 'ORDER BY sent_at DESC, COALESCE(seq, 9007199254740991) DESC LIMIT $limit';
    const rows = before
      ? await db.getAllAsync<MessageRow>(
          `SELECT * FROM chat_messages WHERE conversation_id = $conversationId
             AND (sent_at < $sentAt OR (sent_at = $sentAt AND COALESCE(seq, 9007199254740991) < $seq)) ${order}`,
          { $conversationId: conversationId, $sentAt: before.sentAt, $seq: before.seq ?? Number.MAX_SAFE_INTEGER, $limit: limit },
        )
      : await db.getAllAsync<MessageRow>(`SELECT * FROM chat_messages WHERE conversation_id = $conversationId ${order}`, { $conversationId: conversationId, $limit: limit });
    return rows.map(toMessage);
  },

  async getPending(conversationId: string, senderId: string): Promise<ChatMessage[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<MessageRow>(
      "SELECT * FROM chat_messages WHERE conversation_id = ? AND sender_id = ? AND status IN ('pending', 'failed') ORDER BY sent_at",
      conversationId,
      senderId,
    );
    return rows.map(toMessage);
  },

  async latestServerTime(conversationId: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ latest: string | null }>('SELECT MAX(server_time) AS latest FROM chat_messages WHERE conversation_id = ?', conversationId);
    return row?.latest ?? null;
  },

  /** Writes many messages in one transaction — essential when a burst of hundreds arrives at once. */
  async upsertMany(messages: ChatMessage[]): Promise<void> {
    if (!messages.length) return;
    await writeTransaction(async (txn) => {
      const statement = await txn.prepareAsync(
        `INSERT INTO chat_messages (id, conversation_id, sender_id, text, sent_at, server_time, seq, status)
         VALUES ($id, $conversationId, $senderId, $text, $sentAt, $serverTime, $seq, $status)
         ON CONFLICT(id) DO UPDATE SET server_time = COALESCE(excluded.server_time, server_time), seq = COALESCE(excluded.seq, seq)`,
      );
      try {
        for (const message of messages) {
          await statement.executeAsync({
            $id: message.id,
            $conversationId: message.conversationId,
            $senderId: message.senderId,
            $text: message.text,
            $sentAt: message.sentAt,
            $serverTime: message.serverTime,
            $seq: message.seq,
            $status: message.status,
          });
        }
      } finally {
        await statement.finalizeAsync();
      }
    });
  },

  async updateStatuses(updates: StatusUpdate[]): Promise<void> {
    if (!updates.length) return;
    await writeTransaction(async (txn) => {
      for (const update of updates) {
        const row = await txn.getFirstAsync<{ status: MessageStatus }>('SELECT status FROM chat_messages WHERE id = ?', update.id);
        if (!row) continue;
        await txn.runAsync(
          'UPDATE chat_messages SET status = ?, server_time = COALESCE(?, server_time), seq = COALESCE(?, seq) WHERE id = ?',
          advanceStatus(row.status, update.status),
          update.serverTime ?? null,
          update.seq ?? null,
          update.id,
        );
      }
    });
  },
};
