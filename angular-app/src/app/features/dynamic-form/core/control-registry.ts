import { EnvironmentProviders, Injectable, InjectionToken, Type, inject, makeEnvironmentProviders } from '@angular/core';
import { ValidatorFn } from '@angular/forms';
import { DynamicControl } from './dynamic-control';
import { ResolvedField } from './field-config';

export interface ControlDefinition {
  /** Control types this definition handles, e.g. `['text', 'email']`. */
  types: string[];
  // Controls are typed by their own value (boolean, number, ...). Signal inputs are invariant in
  // that type, so no single concrete type accepts them all; `any` is the deliberate escape hatch.
  component: Type<DynamicControl<any>>;
  /** Initial value when the field config does not specify `defaultValue`. */
  defaultValue?: unknown;
  /** Validators intrinsic to the control type (e.g. `email`), applied in addition to configured ones. */
  validators?: (field: ResolvedField) => ValidatorFn[];
}

export const DYNAMIC_CONTROLS = new InjectionToken<ControlDefinition[][]>('DYNAMIC_CONTROLS');

/**
 * Registers control types with the form builder. This is the extension point:
 * supporting a new `type` means providing a component here — the form builder
 * itself never changes.
 */
export function provideDynamicControls(...definitions: ControlDefinition[]): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: DYNAMIC_CONTROLS, useValue: definitions, multi: true }]);
}

@Injectable()
export class ControlRegistry {
  private readonly definitions = new Map<string, ControlDefinition>();

  constructor() {
    // Later registrations win, so an application can override a built-in type.
    for (const definition of (inject(DYNAMIC_CONTROLS, { optional: true }) ?? []).flat()) {
      definition.types.forEach((type) => this.definitions.set(type, definition));
    }
  }

  get(type: string): ControlDefinition | undefined {
    return this.definitions.get(type);
  }

  has(type: string): boolean {
    return this.definitions.has(type);
  }
}
