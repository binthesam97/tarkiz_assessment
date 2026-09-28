import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  hrPortalUrl: string;
  employeeAppUrl: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

/** Runtime values from `config.js` win over the build-time defaults in `environment.ts`. */
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => ({ ...environment, ...window.__APP_CONFIG__ }),
});
