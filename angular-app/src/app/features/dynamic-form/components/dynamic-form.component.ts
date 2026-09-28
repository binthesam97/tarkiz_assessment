import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ControlRegistry } from '../core/control-registry';
import { DynamicFormFactory } from '../core/dynamic-form.factory';
import { FieldConfig } from '../core/field-config';
import { ValidatorRegistry } from '../core/validator-registry';
import { DynamicFieldComponent } from './dynamic-field.component';

/**
 * Renders a reactive form from a JSON field configuration.
 *
 * Control types are resolved from the `ControlRegistry` populated via
 * `provideDynamicForms()`, so new types can be added without modifying this
 * component (Open/Closed).
 */
@Component({
  selector: 'df-dynamic-form',
  imports: [ReactiveFormsModule, DynamicFieldComponent],
  providers: [ControlRegistry, ValidatorRegistry, DynamicFormFactory],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let model = formModel();
    <form [formGroup]="model.form" (ngSubmit)="submit()" novalidate>
      @for (field of model.fields; track field.name) {
        <df-field [field]="field" [control]="model.form.controls[field.name]!" />
      }
      <div class="actions">
        <button type="submit" class="btn primary">{{ submitLabel() }}</button>
        <button type="button" class="btn" (click)="reset()">Reset</button>
      </div>
    </form>
  `,
  styles: `
    form { display: grid; gap: 0.5rem; }
    .actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  `,
})
export class DynamicFormComponent {
  readonly config = input.required<FieldConfig[]>();
  readonly submitLabel = input('Submit');

  readonly submitted = output<Record<string, unknown>>();

  private readonly factory = inject(DynamicFormFactory);

  /** Rebuilt whenever the configuration changes. */
  protected readonly formModel = computed(() => this.factory.build(this.config()));

  protected submit(): void {
    const { form } = this.formModel();
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    this.submitted.emit(form.getRawValue());
  }

  protected reset(): void {
    // Rebuilding restores per-field defaults, which `form.reset()` would replace with null.
    const { form } = this.factory.build(this.config());
    this.formModel().form.reset(form.getRawValue());
  }
}
