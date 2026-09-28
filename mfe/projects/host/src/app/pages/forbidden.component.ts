import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1>Access denied</h1>
      <p>Your role does not have access to this area.</p>
      <a class="btn primary" routerLink="/dashboard">Back to dashboard</a>
    </div>
  `,
  styles: `.page { display: grid; justify-items: center; gap: 0.5rem; padding: 6rem 1rem; text-align: center; }`,
})
export class ForbiddenComponent {}
