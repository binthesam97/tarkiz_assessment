import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DynamicControl } from '../core/dynamic-control';

@Component({
  selector: 'df-checkbox',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="checkbox">
      <input type="checkbox" [id]="field().id" [formControl]="control()" />
      {{ field().placeholder ?? field().label }}
    </label>
  `,
  styles: `.checkbox { display: inline-flex; align-items: center; gap: 0.5rem; }`,
})
export class CheckboxControl extends DynamicControl<boolean> {}
