import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LoginFormComponent } from '@acme/shared';

@Component({
  selector: 'app-login-page',
  imports: [LoginFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="card"><acme-login-form (signedIn)="onSignedIn()" /></div>
    </div>
  `,
  styles: `.page { display: grid; place-items: center; min-height: 100vh; background: var(--surface-muted); } .card { padding: 2rem; }`,
})
export class LoginPageComponent {
  /** Bound from the `returnUrl` query parameter. */
  readonly returnUrl = input<string>();
  private readonly router = inject(Router);

  protected onSignedIn(): void {
    void this.router.navigateByUrl(this.returnUrl() || '/dashboard');
  }
}
