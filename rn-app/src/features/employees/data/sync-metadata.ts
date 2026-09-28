import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SYNC_KEY = 'employees.lastSync.v1';

export interface SyncMetadata {
  /** Server timestamp of the last successful pull, used as the next delta cursor. */
  serverCursor: string | null;
  /** Device time of the last successful sync, shown to the user. */
  syncedAt: string | null;
}

/** Small key-value sync state lives in AsyncStorage; records live in SQLite. */
export const syncMetadata = {
  async read(): Promise<SyncMetadata> {
    try {
      const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return raw ? (JSON.parse(raw) as SyncMetadata) : { serverCursor: null, syncedAt: null };
    } catch {
      return { serverCursor: null, syncedAt: null };
    }
  },

  async write(metadata: SyncMetadata): Promise<void> {
    await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify(metadata));
  },
};
