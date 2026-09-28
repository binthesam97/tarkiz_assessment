import { getDatabase, writeTransaction } from '@/core/db/database';
import type { QueuedAttendance } from './hr.model';

const ENTITY = 'attendance';

/**
 * Check-ins and check-outs made offline are written to the shared outbox and
 * replayed in order when connectivity returns. The server endpoints are
 * idempotent per employee and day, so replays are safe. The original
 * timestamp is sent, so attendance reflects when the user actually checked in.
 */
export const attendanceQueue = {
  async enqueue(entry: QueuedAttendance): Promise<void> {
    await writeTransaction((txn) =>
      txn.runAsync(
        'INSERT INTO outbox (entity, entity_id, operation, payload, created_at) VALUES (?, ?, ?, ?, ?)',
        ENTITY,
        entry.date,
        entry.action,
        JSON.stringify(entry),
        entry.timestamp,
      ),
    );
  },

  async list(): Promise<(QueuedAttendance & { id: number })[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: number; payload: string }>('SELECT id, payload FROM outbox WHERE entity = ? ORDER BY id', ENTITY);
    return rows.map((row) => ({ id: row.id, ...(JSON.parse(row.payload) as QueuedAttendance) }));
  },

  async remove(id: number): Promise<void> {
    await writeTransaction((txn) => txn.runAsync('DELETE FROM outbox WHERE id = ?', id));
  },
};
