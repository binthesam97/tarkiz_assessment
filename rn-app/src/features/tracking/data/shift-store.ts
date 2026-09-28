import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveShift } from './route.model';

const ACTIVE_SHIFT_KEY = 'tracking.activeShift.v1';

/** The active shift must be readable from the background task, so it lives in storage rather than Redux. */
export const shiftStore = {
  async get(): Promise<ActiveShift | null> {
    const raw = await AsyncStorage.getItem(ACTIVE_SHIFT_KEY);
    return raw ? (JSON.parse(raw) as ActiveShift) : null;
  },

  async set(shift: ActiveShift): Promise<void> {
    await AsyncStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(shift));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(ACTIVE_SHIFT_KEY);
  },
};
