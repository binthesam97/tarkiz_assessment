import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DynamicControl } from '../core/dynamic-control';

@Component({
  selector: 'df-dropdown',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select
      class="input"
      [id]="field().id"
      [formControl]="control()"
      [class.invalid]="state().showError"
      [attr.aria-describedby]="field().id + '-message'"
    >
      <option [ngValue]="null" disabled>{{ field().placeholder ?? 'Select ' + field().label.toLowerCase() }}</option>
      @for (option of field().options; track option.value) {
        <option [ngValue]="option.value">{{ option.label }}</option>
      }
    </select>
  `,
})
export class DropdownControl extends DynamicControl<string | null> {}
