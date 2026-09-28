import * as Crypto from 'expo-crypto';
import { getDatabase, writeTransaction } from '@/core/db/database';
import type { NewRoutePoint, RoutePoint } from './route.model';

interface RoutePointRow {
  id: number;
  shift_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  recorded_at: string;
  synced: number;
}

export interface PendingBatch {
  batchId: string;
  points: RoutePoint[];
}

const MAX_BATCH_SIZE = 200;

const toPoint = (row: RoutePointRow): RoutePoint => ({
  id: row.id,
  shiftId: row.shift_id,
  latitude: row.latitude,
  longitude: row.longitude,
  accuracy: row.accuracy,
  speed: row.speed,
  recordedAt: row.recorded_at,
  synced: row.synced === 1,
});

export const routeRepository = {
  async lastRecordedAt(shiftId: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ recorded_at: string }>('SELECT recorded_at FROM route_points WHERE shift_id = ? ORDER BY recorded_at DESC LIMIT 1', shiftId);
    return row?.recorded_at ?? null;
  },

  async insert(shiftId: string, points: NewRoutePoint[]): Promise<void> {
    if (!points.length) return;
    await writeTransaction(async (txn) => {
      const statement = await txn.prepareAsync(
        'INSERT INTO route_points (shift_id, latitude, longitude, accuracy, speed, recorded_at) VALUES (?, ?, ?, ?, ?, ?)',
      );
      try {
        for (const point of points) {
          await statement.executeAsync(shiftId, point.latitude, point.longitude, point.accuracy, point.speed, point.recordedAt);
        }
      } finally {
        await statement.finalizeAsync();
      }
    });
  },

  async getShiftPoints(shiftId: string): Promise<RoutePoint[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<RoutePointRow>('SELECT * FROM route_points WHERE shift_id = ? ORDER BY recorded_at', shiftId);
    return rows.map(toPoint);
  },

  /**
   * Returns the next batch to upload. A batch that was claimed but never
   * confirmed (app killed mid-upload) is returned again with the same id, so
   * the idempotent server endpoint can ignore the duplicate.
   */
  async nextPendingBatch(): Promise<PendingBatch | null> {
    const db = await getDatabase();
    let batchId: string | null = null;

    await writeTransaction(async (txn) => {
      const unfinished = await txn.getFirstAsync<{ batch_id: string }>('SELECT batch_id FROM route_points WHERE synced = 0 AND batch_id IS NOT NULL LIMIT 1');
      if (unfinished) {
        batchId = unfinished.batch_id;
        return;
      }
      const candidate = Crypto.randomUUID();
      const result = await txn.runAsync(
        `UPDATE route_points SET batch_id = ? WHERE id IN (
           SELECT id FROM route_points WHERE synced = 0 AND batch_id IS NULL ORDER BY recorded_at LIMIT ?
         )`,
        candidate,
        MAX_BATCH_SIZE,
      );
      if (result.changes > 0) batchId = candidate;
    });

    if (!batchId) return null;
    const rows = await db.getAllAsync<RoutePointRow>('SELECT * FROM route_points WHERE batch_id = ? ORDER BY recorded_at', batchId);
    return { batchId, points: rows.map(toPoint) };
  },

  async markBatchSynced(batchId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE route_points SET synced = 1 WHERE batch_id = ?', batchId);
  },

  async unsyncedCount(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM route_points WHERE synced = 0');
    return row?.count ?? 0;
  },
};
