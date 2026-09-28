import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoginFormComponent } from '@acme/shared';

@Component({
  selector: 'emp-standalone-login',
  imports: [LoginFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="card">
        <acme-login-form
          [demoAccounts]="['Admin', 'HR']"
          note="Employee administration: HR and Admin access."
          (signedIn)="router.navigate(['/'])"
        />
      </div>
    </div>
  `,
  styles: `.page { display: grid; place-items: center; padding: 4rem 1rem; } .card { padding: 2rem; }`,
})
export class StandaloneLoginComponent {
  protected readonly router = inject(Router);
}
