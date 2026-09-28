import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '@acme/shared';
import { EMPLOYEE_ROUTES } from './employee.routes';
import { StandaloneForbiddenComponent } from './standalone-forbidden.component';
import { StandaloneLoginComponent } from './standalone-login.component';

/** Used only when the remote runs on its own, for isolated development and testing. */
export const routes: Routes = [
  { path: 'login', component: StandaloneLoginComponent },
  { path: 'forbidden', component: StandaloneForbiddenComponent },
  { path: '', canActivate: [authGuard], canMatch: [roleGuard('HR', 'ADMIN')], children: EMPLOYEE_ROUTES },
];
