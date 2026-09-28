import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { routeRepository } from '../data/route-repository';
import { flushRoutePoints } from '../data/route-sync';
import { shiftStore } from '../data/shift-store';

export const LOCATION_TASK_NAME = 'tarkiz.field.location-tracking';

/** Target sampling interval. Android honours `timeInterval`; iOS does not, so samples are also thinned here. */
export const SAMPLE_INTERVAL_MS = 30_000;
/** Upload once this many points are waiting, to batch network use and save battery. */
const UPLOAD_THRESHOLD = 10;
/** Allow a little jitter so a fix arriving at 29.5 s is not dropped. */
const SAMPLE_TOLERANCE_MS = 2_000;

/**
 * Keeps at most one fix per sample interval, measured from the last stored
 * point, and returns them oldest first.
 */
export function downsample(locations: LocationObject[], lastRecordedAt: string | null): LocationObject[] {
  const sorted = [...locations].sort((a, b) => a.timestamp - b.timestamp);
  const kept: LocationObject[] = [];
  let last = lastRecordedAt ? Date.parse(lastRecordedAt) : 0;
  for (const location of sorted) {
    if (location.timestamp - last >= SAMPLE_INTERVAL_MS - SAMPLE_TOLERANCE_MS) {
      kept.push(location);
      last = location.timestamp;
    }
  }
  return kept;
}

/**
 * Must be defined at module scope and imported from the app entry: when iOS or
 * Android relaunches the app in the background to deliver locations, no
 * screen is mounted, only this handler runs.
 */
TaskManager.defineTask<{ locations: LocationObject[] }>(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;

  const shift = await shiftStore.get();
  if (!shift) return;

  const samples = downsample(data.locations, await routeRepository.lastRecordedAt(shift.id));
  await routeRepository.insert(
    shift.id,
    samples.map(({ coords, timestamp }) => ({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      speed: coords.speed,
      recordedAt: new Date(timestamp).toISOString(),
    })),
  );

  if ((await routeRepository.unsyncedCount()) >= UPLOAD_THRESHOLD) {
    await flushRoutePoints(shift.employeeId);
  }
});
