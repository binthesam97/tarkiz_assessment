import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import type { ActiveShift } from '../data/route.model';
import { flushRoutePoints } from '../data/route-sync';
import { shiftStore } from '../data/shift-store';
import { LOCATION_TASK_NAME, SAMPLE_INTERVAL_MS } from './location-task';

export type PermissionOutcome = 'granted' | 'foreground-denied' | 'background-denied';

/**
 * Background tracking needs two grants: "while using" first, then "always".
 * Both platforms require them to be requested in that order.
 */
export async function requestTrackingPermissions(): Promise<PermissionOutcome> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return 'foreground-denied';
  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === 'granted' ? 'granted' : 'background-denied';
}

export async function startShift(employeeId: string): Promise<ActiveShift> {
  const shift: ActiveShift = { id: Crypto.randomUUID(), employeeId, startedAt: new Date().toISOString() };
  await shiftStore.set(shift);

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    // Android: deliver a fix every 30 s.
    timeInterval: SAMPLE_INTERVAL_MS,
    // iOS ignores timeInterval; a small distance filter plus down-sampling in the task gives ~30 s spacing while moving.
    distanceInterval: Platform.OS === 'ios' ? 10 : 0,
    deferredUpdatesInterval: SAMPLE_INTERVAL_MS,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.OtherNavigation,
    showsBackgroundLocationIndicator: true,
    // Android requires a visible foreground-service notification to keep receiving updates in the background.
    foregroundService: {
      notificationTitle: 'Shift in progress',
      notificationBody: 'Your route is being recorded.',
      notificationColor: '#3657d6',
      killServiceOnDestroy: false,
    },
  });
  return shift;
}

export async function endShift(): Promise<void> {
  const shift = await shiftStore.get();
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  if (shift) await flushRoutePoints(shift.employeeId);
  await shiftStore.clear();
}

/** Reconciles stored state with the OS, e.g. after the app was killed or permissions were revoked. */
export async function getActiveShift(): Promise<ActiveShift | null> {
  const [shift, running] = await Promise.all([shiftStore.get(), Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)]);
  if (shift && !running) {
    await shiftStore.clear();
    return null;
  }
  return shift;
}
