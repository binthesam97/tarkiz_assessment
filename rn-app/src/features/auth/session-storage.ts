import * as SecureStore from 'expo-secure-store';
import type { Session } from './auth.model';

const SESSION_KEY = 'tarkiz.session.v1';

/** Tokens are stored in the Keychain / Keystore via SecureStore, never in AsyncStorage. */
export const sessionStorage = {
  async read(): Promise<Session | null> {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },

  write(session: Session): Promise<void> {
    return SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  },

  clear(): Promise<void> {
    return SecureStore.deleteItemAsync(SESSION_KEY);
  },
};
