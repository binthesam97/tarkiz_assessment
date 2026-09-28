import { loadRemoteModule } from '@angular-architects/native-federation';
import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '@acme/shared';
import { ShellComponent } from './shell/shell.component';

export const routes: Routes = [
  { path: 'login', title: 'Sign in', loadComponent: () => import('./pages/login-page.component').then((m) => m.LoginPageComponent) },
  { path: 'forbidden', title: 'Access denied', loadComponent: () => import('./pages/forbidden.component').then((m) => m.ForbiddenComponent) },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Dashboard', loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent) },
      {
        path: 'leave-approvals',
        title: 'Leave approvals',
        canMatch: [roleGuard('HR', 'ADMIN')],
        loadComponent: () => import('./pages/leave-approvals.component').then((m) => m.LeaveApprovalsComponent),
      },
      {
        path: 'employees',
        // canMatch: the remote is not even downloaded for users without the role.
        canMatch: [roleGuard('HR', 'ADMIN')],
        loadChildren: () =>
          loadRemoteModule('employee', './routes')
            .then((m) => m.EMPLOYEE_ROUTES)
            // A failed remote must not take the shell down with it.
            .catch(() => import('./pages/remote-unavailable.component').then((m) => [{ path: '**', component: m.RemoteUnavailableComponent }])),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
