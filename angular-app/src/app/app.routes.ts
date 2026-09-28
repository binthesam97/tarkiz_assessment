import { Routes } from '@angular/router';

export interface ChallengeRoute {
  path: string;
  title: string;
  summary: string;
}

export const CHALLENGES: ChallengeRoute[] = [
  { path: 'dynamic-form', title: 'Dynamic Form Builder', summary: 'Reactive forms generated from JSON with a pluggable control registry.' },
  { path: 'products', title: 'NgRx Product Management', summary: 'Entity state, effects, loading/error handling and optimistic updates.' },
  { path: 'notifications', title: 'Real-Time Notifications', summary: 'WebSocket feed with categories, read state, persistence and auto-reconnect.' },
  { path: 'autocomplete', title: 'RxJS Autocomplete', summary: 'Debounce, cancellation, caching and retry.' },
  { path: 'performance', title: 'Rendering 10,000 Records', summary: 'OnPush, track, virtual scrolling, lazy loading and memoization.' },
];

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./layout/home.component').then((m) => m.HomeComponent), title: 'Tarkiz Angular Assessment' },
  { path: 'dynamic-form', loadChildren: () => import('./features/dynamic-form/dynamic-form.routes') },
  { path: 'products', loadChildren: () => import('./features/products/products.routes') },
  { path: 'notifications', loadChildren: () => import('./features/notifications/notifications.routes') },
  { path: 'autocomplete', loadChildren: () => import('./features/autocomplete/autocomplete.routes') },
  { path: 'performance', loadChildren: () => import('./features/performance/performance.routes') },
  { path: '**', redirectTo: '' },
];
