import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { DynamicControl } from '../core/dynamic-control';

/**
 * Example of a custom control type registered outside the dynamic-form core
 * (see `dynamic-form.routes.ts`). Demonstrates extension without modification.
 */
@Component({
  selector: 'df-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stars" role="radiogroup" [attr.aria-labelledby]="field().id + '-label'">
      @for (star of stars(); track star) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="control().value === star"
          [attr.aria-label]="star + ' of ' + stars().length"
          [class.filled]="star <= (control().value ?? 0)"
          (click)="select(star)"
        >
          ★
        </button>
      }
    </div>
  `,
  styles: `
    .stars { display: flex; gap: 0.25rem; }
    button { border: none; background: none; font-size: 1.5rem; line-height: 1; color: var(--border); cursor: pointer; padding: 0; }
    button.filled { color: #f5a623; }
  `,
})
export class RatingControl extends DynamicControl<number | null> {
  protected readonly stars = computed(() => {
    const max = Number(this.field().props?.['max'] ?? 5);
    return Array.from({ length: max }, (_, index) => index + 1);
  });

  protected select(value: number): void {
    this.control().setValue(value);
    this.control().markAsTouched();
  }
}
