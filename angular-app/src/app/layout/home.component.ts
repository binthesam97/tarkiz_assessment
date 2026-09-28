import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CHALLENGES } from '../app.routes';
import { APP_CONFIG } from '../core/app-config';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Tarkiz Angular Assessment</h1>
    <div class="grid">
      @for (challenge of challenges; track challenge.path) {
        <a class="card" [routerLink]="challenge.path">
          <h2>{{ challenge.title }}</h2>
          <p>{{ challenge.summary }}</p>
        </a>
      }
      <div class="card">
        <h2>Micro Frontends</h2>
        <p>HR portal (host) with the Employees module loaded at runtime.</p>
        <div class="links">
          <a class="btn small" [href]="hrPortalUrl" target="_blank" rel="noopener">HR portal (host) ↗</a>
          <a class="btn small" [href]="employeeAppUrl" target="_blank" rel="noopener">Employee admin (remote) ↗</a>
        </div>
      </div>
    </div>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
    }
    .card {
      h2 { margin: 0 0 0.5rem; }
      p { margin: 0; color: var(--text-muted); }
    }
    a.card {
      color: inherit;
      text-decoration: none;
      transition: border-color 120ms ease;
      &:hover { border-color: var(--accent); }
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
      a { text-decoration: none; }
    }
  `,
})
export class HomeComponent {
  protected readonly challenges = CHALLENGES;
  protected readonly hrPortalUrl = inject(APP_CONFIG).hrPortalUrl;
  protected readonly employeeAppUrl = inject(APP_CONFIG).employeeAppUrl;
}
