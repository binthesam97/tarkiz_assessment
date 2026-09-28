import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'acme-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text">
      <h1>{{ heading() }}</h1>
      @if (subheading()) {
        <p>{{ subheading() }}</p>
      }
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
    h1 { margin: 0; font-size: 1.5rem; }
    p { margin: 0.25rem 0 0; color: var(--text-muted); }
    .actions { display: flex; gap: 0.5rem; }
  `,
})
export class PageHeaderComponent {
  readonly heading = input.required<string>();
  readonly subheading = input<string>();
}
