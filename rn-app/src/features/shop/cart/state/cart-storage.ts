import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartLine } from './cart-slice';

const CART_KEY = 'shop.cart.v1';

/** The cart is small, non-sensitive and read on start-up, so AsyncStorage is enough. */
export const cartStorage = {
  async read(): Promise<CartLine[]> {
    try {
      const raw = await AsyncStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  },

  async write(lines: CartLine[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      // Losing a cart write is recoverable; the in-memory cart stays correct for this session.
    }
  },
};
