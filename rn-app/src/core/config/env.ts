import { Platform } from 'react-native';

/**
 * Server addresses, fixed at build time (EXPO_PUBLIC_* variables are inlined by the bundler).
 *
 * - Deployed builds set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_WS_URL, e.g.
 *   `https://api.example.com/api` and `wss://api.example.com/ws`.
 * - Local development falls back to the mock backend on port 3000. The Android emulator reaches the
 *   host machine via 10.0.2.2; iOS simulators use localhost. On a physical device, set
 *   EXPO_PUBLIC_API_HOST to the machine's LAN IP.
 */
const localHost = process.env.EXPO_PUBLIC_API_HOST ?? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');

export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? `http://${localHost}:3000/api`,
  wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? `ws://${localHost}:3000/ws`,
} as const;
