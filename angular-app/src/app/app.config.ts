import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { routes } from './app.routes';
import { mockNetworkInterceptor } from './core/mock-network/mock-network.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([mockNetworkInterceptor])),
    // Root store is empty; feature slices are registered by their lazy routes.
    provideStore(),
    provideEffects(),
    provideStoreDevtools({ maxAge: 50, logOnly: !isDevMode() }),
  ],
};
