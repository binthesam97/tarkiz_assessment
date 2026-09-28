import { InjectionToken } from '@angular/core';

interface RuntimeConfig {
  apiUrl: string;
  wsUrl: string;
  /** Link back to the Angular assessment app, when deployed alongside it. */
  assessmentUrl?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<RuntimeConfig>;
  }
}

const DEFAULTS: RuntimeConfig = { apiUrl: 'http://localhost:3000/api', wsUrl: 'ws://localhost:3000/ws' };

/** Reads the runtime configuration from `config.js`, which the deployed container generates at start-up. */
function runtimeConfig(): RuntimeConfig {
  return { ...DEFAULTS, ...window.__APP_CONFIG__ };
}

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => runtimeConfig().apiUrl,
});

export const WS_BASE_URL = new InjectionToken<string>('WS_BASE_URL', {
  providedIn: 'root',
  factory: () => runtimeConfig().wsUrl,
});
