import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DynamicControl } from '../core/dynamic-control';

/** Handles every single-line input type (`text`, `email`, `number`, `password`, `date`, ...). */
@Component({
  selector: 'df-text-input',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      class="input"
      [id]="field().id"
      [type]="inputType()"
      [formControl]="control()"
      [placeholder]="field().placeholder ?? ''"
      [class.invalid]="state().showError"
      [attr.aria-describedby]="field().id + '-message'"
    />
  `,
})
export class TextInputControl extends DynamicControl {
  protected readonly inputType = computed(() => (this.field().type === 'text' ? 'text' : this.field().type));
}
