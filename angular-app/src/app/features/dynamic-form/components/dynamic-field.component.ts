import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ControlRegistry } from '../core/control-registry';
import { controlState } from '../core/control-state';
import { ResolvedField } from '../core/field-config';
import { ValidatorRegistry } from '../core/validator-registry';

/** Renders label, the registered control component, hint and validation message for one field. */
@Component({
  selector: 'df-field',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let current = field();
    @if (current.type !== 'checkbox') {
      <label class="label" [id]="current.id + '-label'" [for]="current.id">
        {{ current.label }}
        @if (current.required) {
          <span class="required" aria-hidden="true">*</span>
        }
      </label>
    }

    @if (component(); as controlComponent) {
      <ng-container *ngComponentOutlet="controlComponent; inputs: { field: current, control: control() }" />
    } @else {
      <p class="unsupported">Unsupported control type "{{ current.type }}".</p>
    }

    <p class="message" [id]="current.id + '-message'" [class.error]="errorMessage()" aria-live="polite">
      {{ errorMessage() ?? current.hint ?? '' }}
    </p>
  `,
  styles: `
    :host { display: block; }
    .label { display: block; margin-bottom: 0.375rem; font-weight: 500; }
    .required { color: var(--danger); margin-left: 0.125rem; }
    .message { min-height: 1.25rem; margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--text-muted); }
    .message.error { color: var(--danger); }
    .unsupported { margin: 0; padding: 0.5rem 0.75rem; border-radius: var(--radius); background: var(--warning-soft); color: var(--warning); }
  `,
})
export class DynamicFieldComponent {
  readonly field = input.required<ResolvedField>();
  readonly control = input.required<FormControl<unknown>>();

  private readonly controls = inject(ControlRegistry);
  private readonly validators = inject(ValidatorRegistry);
  private readonly state = controlState(this.control);

  protected readonly component = computed(() => this.controls.get(this.field().type)?.component ?? null);

  protected readonly errorMessage = computed(() => {
    const { showError, errors } = this.state();
    if (!showError || !errors) return null;
    const field = this.field();
    const overrides: Record<string, string> = {};
    const configValues: Record<string, unknown> = {};
    for (const validator of field.validators ?? []) {
      if (validator.message) overrides[validator.name] = validator.message;
      configValues[validator.name] = validator.value;
    }
    return this.validators.describe(errors, field.label, overrides, configValues);
  });
}
