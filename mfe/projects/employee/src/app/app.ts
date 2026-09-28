import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>Employee administration (micro frontend remote), <strong>running standalone</strong></header>
    <main><router-outlet /></main>
  `,
  styles: `
    header { padding: 0.75rem 1.5rem; background: var(--warning-soft); color: var(--warning); font-size: 0.875rem; }
    main { padding: 2rem 1.5rem; max-width: 1200px; margin: 0 auto; }
  `,
})
export class App {}
