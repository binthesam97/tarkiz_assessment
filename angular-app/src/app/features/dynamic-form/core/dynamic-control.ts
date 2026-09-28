import { Directive, input } from '@angular/core';
import { controlState } from './control-state';
import { FormControl } from '@angular/forms';
import { ResolvedField } from './field-config';

/**
 * Contract every renderable control implements. Controls receive the resolved
 * field definition and the `FormControl` created for it; they own presentation
 * only — validation and value management stay with the form.
 */
@Directive()
export abstract class DynamicControl<TValue = unknown> {
  readonly field = input.required<ResolvedField>();
  readonly control = input.required<FormControl<TValue>>();
  protected readonly state = controlState(this.control);
}
