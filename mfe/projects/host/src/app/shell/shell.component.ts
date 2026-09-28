import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, HasRoleDirective } from '@acme/shared';
import { LiveAlertsService } from '../alerts/live-alerts.service';
import { NotificationPanelComponent } from '../alerts/notification-panel.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HasRoleDirective, NotificationPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      @if (assessmentUrl) {
        <a class="back" [href]="assessmentUrl" title="Back to the Tarkiz Angular Assessment">← Tarkiz Angular Assessment</a>
      }
      <a class="brand" routerLink="/">Tarkiz HR portal</a>
      <nav>
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a *acmeHasRole="['HR', 'ADMIN']" routerLink="/employees" routerLinkActive="active">
          Employees <span class="remote-tag" title="Loaded at runtime from the employee micro frontend">remote</span>
        </a>
        <a *acmeHasRole="['HR', 'ADMIN']" routerLink="/leave-approvals" routerLinkActive="active">Leave approvals</a>
      </nav>
      @if (auth.user(); as user) {
        <div class="user">
          <app-notification-panel />
          <span>{{ user.name }}</span>
          <span class="badge">{{ user.roles.join(' · ') }}</span>
          <button type="button" class="btn small" (click)="logout()">Sign out</button>
        </div>
      }
    </header>
    @if (alerts.toast(); as toast) {
      <aside class="toast" role="status" aria-live="polite" (click)="alerts.dismissToast()">
        <strong>{{ toast.title }}</strong>
        <span>{{ toast.message }}</span>
      </aside>
    }
    <main><router-outlet /></main>
  `,
  styles: `
    header { display: flex; align-items: center; gap: 2rem; padding: 0 1.5rem; height: 60px; border-bottom: 1px solid var(--border); background: var(--surface); }
    .back { font-size: 0.8125rem; color: var(--text-muted); text-decoration: none; white-space: nowrap; }
    .back:hover { color: var(--accent); }
    .brand { font-weight: 700; font-size: 1.125rem; color: var(--text); text-decoration: none; }
    nav { display: flex; gap: 0.25rem; }
    nav a { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border-radius: var(--radius); color: var(--text-muted); text-decoration: none; }
    nav a.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
    .remote-tag { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 0 0.3rem; border: 1px solid currentColor; border-radius: 4px; }
    .user { display: flex; align-items: center; gap: 0.75rem; margin-left: auto; font-size: 0.875rem; }
    main { padding: 2rem 1.5rem; max-width: 1200px; margin: 0 auto; }
    .toast { position: fixed; right: 1.5rem; bottom: 1.5rem; z-index: 10; display: grid; gap: 0.125rem; max-width: 320px; padding: 0.75rem 1rem; border-radius: var(--radius); background: var(--text); color: #fff; box-shadow: 0 12px 32px rgb(16 24 40 / 0.25); font-size: 0.875rem; cursor: pointer; }
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  /** Set in config.js when deployed next to the Angular assessment app. */
  protected readonly assessmentUrl = window.__APP_CONFIG__?.assessmentUrl ?? null;
  protected readonly alerts = inject(LiveAlertsService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
