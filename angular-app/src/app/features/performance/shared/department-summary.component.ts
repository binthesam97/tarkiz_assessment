import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EmployeeRecord } from '../data/employee-record';

/** Loaded with `@defer`, so its code is a separate chunk fetched only when it scrolls into view. */
@Component({
  selector: 'app-department-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Headcount by department</h2>
    <ul>
      @for (entry of summary(); track entry.department) {
        <li>
          <span class="label">{{ entry.department }}</span>
          <span class="bar"><span [style.width.%]="entry.share"></span></span>
          <span class="value">{{ entry.count }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.5rem; }
    li { display: grid; grid-template-columns: 7rem 1fr 3.5rem; align-items: center; gap: 0.75rem; font-size: 0.875rem; }
    .bar { height: 0.5rem; border-radius: 999px; background: var(--surface-muted); overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--accent); }
    .value { text-align: right; font-variant-numeric: tabular-nums; color: var(--text-muted); }
  `,
})
export class DepartmentSummaryComponent {
  readonly records = input.required<EmployeeRecord[]>();

  protected readonly summary = computed(() => {
    const counts = new Map<string, number>();
    this.records().forEach(({ department }) => counts.set(department, (counts.get(department) ?? 0) + 1));
    const max = Math.max(...counts.values());
    return [...counts]
      .map(([department, count]) => ({ department, count, share: (count / max) * 100 }))
      .sort((a, b) => b.count - a.count);
  });
}
