import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'acme-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="label">{{ label() }}</span>
    <span class="value">{{ value() }}</span>
    @if (hint()) {
      <span class="hint">{{ hint() }}</span>
    }
  `,
  styles: `
    :host { display: grid; gap: 0.25rem; padding: 1rem 1.25rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
    .label { font-size: 0.8125rem; color: var(--text-muted); }
    .value { font-size: 1.75rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .hint { font-size: 0.75rem; color: var(--text-muted); }
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
}
