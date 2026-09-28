import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth/auth.service';

export type DemoAccountLabel = 'Admin' | 'HR' | 'Employee';

export const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@acme.test', password: 'Admin@123' },
  { label: 'HR', email: 'hr@acme.test', password: 'Hr@12345' },
  { label: 'Employee', email: 'employee@acme.test', password: 'Emp@12345' },
] as const;

@Component({
  selector: 'acme-login-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <h1>Sign in</h1>
      @if (note()) {
        <p class="note">{{ note() }}</p>
      }
      @if (error()) {
        <p class="alert error" role="alert">{{ error() }}</p>
      }
      <label for="login-email">Email</label>
      <input id="login-email" class="input" type="email" autocomplete="username" formControlName="email" />
      <label for="login-password">Password</label>
      <input id="login-password" class="input" type="password" autocomplete="current-password" formControlName="password" />
      <button type="submit" class="btn primary" [disabled]="submitting()">{{ submitting() ? 'Signing in…' : 'Sign in' }}</button>

      <div class="demo">
        <span>Demo accounts:</span>
        @for (account of visibleAccounts(); track account.email) {
          <button type="button" class="btn small" (click)="useAccount(account.email, account.password)">{{ account.label }}</button>
        }
      </div>
    </form>
  `,
  styles: `
    form { display: grid; gap: 0.5rem; width: min(360px, 100%); }
    h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
    .note { margin: -0.25rem 0 0.5rem; color: var(--text-muted); font-size: 0.875rem; }
    label { margin-top: 0.25rem; font-weight: 500; font-size: 0.875rem; }
    button[type='submit'] { margin-top: 0.75rem; justify-content: center; }
    .demo { display: flex; flex-wrap: wrap; align-items: center; gap: 0.375rem; margin-top: 1rem; font-size: 0.8125rem; color: var(--text-muted); }
  `,
})
export class LoginFormComponent {
  /** Demo accounts to offer as shortcuts; defaults to all of them. */
  readonly demoAccounts = input<readonly DemoAccountLabel[]>(['Admin', 'HR', 'Employee']);
  /** Optional line under the heading, e.g. who the application is for. */
  readonly note = input<string>();
  readonly signedIn = output<void>();

  private readonly auth = inject(AuthService);
  protected readonly visibleAccounts = computed(() => DEMO_ACCOUNTS.filter((account) => this.demoAccounts().includes(account.label)));
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected useAccount(email: string, password: string): void {
    this.form.setValue({ email, password });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.auth.login(email, password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.signedIn.emit();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(error instanceof HttpErrorResponse && error.status === 401 ? 'Invalid email or password.' : 'Unable to sign in. Is the mock backend running?');
      },
    });
  }
}
