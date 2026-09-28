import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { Role } from './auth.models';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() || inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Route-level RBAC. Used with `canMatch` so that the route's code — including a
 * remote micro frontend — is never downloaded for users without access.
 */
export function roleGuard(...roles: Role[]): CanMatchFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
    return auth.hasAnyRole(roles) || router.createUrlTree(['/forbidden']);
  };
}
