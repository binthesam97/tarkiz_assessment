import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DynamicControl } from '../core/dynamic-control';

@Component({
  selector: 'df-textarea',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <textarea
      class="input"
      rows="4"
      [id]="field().id"
      [formControl]="control()"
      [placeholder]="field().placeholder ?? ''"
      [class.invalid]="state().showError"
      [attr.aria-describedby]="field().id + '-message'"
    ></textarea>
  `,
})
export class TextareaControl extends DynamicControl<string> {}
