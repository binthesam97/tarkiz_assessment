import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { AuthService } from './auth.service';

/**
 * Attaches the bearer token to API calls. On a 401 it refreshes the session
 * once and replays the request; if the refresh fails the user is signed out.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!request.url.startsWith(inject(API_BASE_URL))) return next(request);

  const withToken = (req: HttpRequest<unknown>) =>
    auth.accessToken ? req.clone({ setHeaders: { Authorization: `Bearer ${auth.accessToken}` } }) : req;

  return next(withToken(request)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !auth.isAuthenticated()) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap(() => next(withToken(request))),
        catchError((refreshError: unknown) => {
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
