import { ApiError } from '@/core/api/http-client';
import type { Employee } from './employee.model';
import { employeeRepository } from './employee-repository';
import { employeesApi } from './employees-api';
import { syncMetadata } from './sync-metadata';

export interface SyncConflict {
  employeeId: string;
  name: string;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: SyncConflict[];
  /** Entries left in the outbox because of a transient failure; retried on the next sync. */
  deferred: number;
  syncedAt: string;
}

/**
 * Two-phase sync:
 *
 * 1. Push — replay the outbox in order. Each entry carries the version it was
 *    based on. On 409 the server copy wins and the conflict is reported to the
 *    user. Transient failures stop the push, leaving the rest queued; permanent
 *    4xx failures are discarded so they cannot block the queue forever.
 * 2. Pull — fetch records changed since the last server cursor (delta sync)
 *    and upsert them, skipping records that still have local edits pending.
 */
export async function syncEmployees(): Promise<SyncResult> {
  const conflicts: SyncConflict[] = [];
  let pushed = 0;
  let deferred = 0;

  const outbox = await employeeRepository.getOutbox();
  for (const [index, entry] of outbox.entries()) {
    try {
      const confirmed = await employeesApi.update(entry.entityId, entry.baseVersion, entry.changes);
      await employeeRepository.completeOutboxEntry(entry.id, confirmed);
      pushed++;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const current = (error.body as { current: Employee }).current;
        await employeeRepository.discardOutboxEntry(entry.id);
        await employeeRepository.overwrite(current);
        conflicts.push({ employeeId: current.id, name: `${current.firstName} ${current.lastName}` });
      } else if (error instanceof ApiError && !error.isTransient) {
        await employeeRepository.discardOutboxEntry(entry.id);
      } else {
        await employeeRepository.recordFailedAttempt(entry.id, error instanceof Error ? error.message : String(error));
        deferred = outbox.length - index;
        break;
      }
    }
  }

  // With uploads still queued the server copy may not reflect local intent yet; pulling is still safe
  // because rows with pending entries are skipped.
  const { serverCursor } = await syncMetadata.read();
  const page = await employeesApi.list(serverCursor ?? undefined);
  await employeeRepository.upsertFromServer(page.items);

  const syncedAt = new Date().toISOString();
  await syncMetadata.write({ serverCursor: page.serverTime, syncedAt });

  return { pushed, pulled: page.items.length, conflicts, deferred, syncedAt };
}
