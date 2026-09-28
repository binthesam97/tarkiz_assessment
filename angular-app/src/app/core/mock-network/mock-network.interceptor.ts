import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_CONFIG } from '../app-config';
import { MockNetworkSettings } from './mock-network.settings';

export const mockNetworkInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(inject(APP_CONFIG).apiUrl)) return next(request);

  const settings = inject(MockNetworkSettings);
  const headers: Record<string, string> = {};
  const latency = settings.latencyMs();
  const failureRate = settings.failureRate();

  if (latency !== null) headers['x-mock-latency'] = String(latency);
  if (failureRate !== null) headers['x-mock-failure-rate'] = String(failureRate);
  if (settings.failMutations() && request.method !== 'GET') headers['x-mock-fail'] = 'true';

  return next(Object.keys(headers).length ? request.clone({ setHeaders: headers }) : request);
};
