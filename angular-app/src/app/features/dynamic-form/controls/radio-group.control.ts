import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DynamicControl } from '../core/dynamic-control';

@Component({
  selector: 'df-radio-group',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="options" role="radiogroup" [attr.aria-labelledby]="field().id + '-label'">
      @for (option of field().options; track option.value) {
        <label>
          <input type="radio" [name]="field().name" [value]="option.value" [formControl]="control()" />
          {{ option.label }}
        </label>
      }
    </div>
  `,
  styles: `.options { display: flex; flex-wrap: wrap; gap: 1rem; }`,
})
export class RadioGroupControl extends DynamicControl<string | null> {}
