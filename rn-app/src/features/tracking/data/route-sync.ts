import { request } from '@/core/api/http-client';
import { routeRepository } from './route-repository';

let flushInFlight: Promise<number> | null = null;

/**
 * Uploads every pending batch in order. Stops at the first failure and leaves
 * the remaining points queued for the next attempt. Concurrent callers (the
 * background task and the UI) share one run.
 *
 * @returns number of points uploaded
 */
export function flushRoutePoints(employeeId: string): Promise<number> {
  flushInFlight ??= (async () => {
    let uploaded = 0;
    try {
      for (let batch = await routeRepository.nextPendingBatch(); batch; batch = await routeRepository.nextPendingBatch()) {
        await request('/locations/batch', {
          method: 'POST',
          body: {
            id: batch.batchId,
            employeeId,
            points: batch.points.map(({ latitude, longitude, accuracy, speed, recordedAt }) => ({ latitude, longitude, accuracy, speed, recordedAt })),
          },
        });
        await routeRepository.markBatchSynced(batch.batchId);
        uploaded += batch.points.length;
      }
    } catch {
      // Offline or server error: points stay in SQLite and are retried on the next flush.
    }
    return uploaded;
  })().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}
