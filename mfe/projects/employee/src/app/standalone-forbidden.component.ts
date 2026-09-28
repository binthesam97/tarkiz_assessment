import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@acme/shared';

/** Shown when a signed-in user lacks the HR or Admin role, instead of bouncing back to the login form. */
@Component({
  selector: 'emp-standalone-forbidden',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1>Access denied</h1>
      <p>
        @if (auth.user(); as user) {
          {{ user.email }} does not have access to employee administration.
        }
        It is available to HR and Admin users only.
      </p>
      <button type="button" class="btn primary" (click)="signOut()">Sign in with a different account</button>
    </div>
  `,
  styles: `.page { display: grid; justify-items: center; gap: 0.5rem; padding: 6rem 1rem; text-align: center; } p { max-width: 46ch; color: var(--text-muted); }`,
})
export class StandaloneForbiddenComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected signOut(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
