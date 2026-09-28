import { EnvironmentProviders, Injectable, InjectionToken, inject, makeEnvironmentProviders } from '@angular/core';
import { ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export interface ValidatorDefinition {
  name: string;
  /** Builds the Angular validator from the value supplied in the JSON config. */
  create: (value: unknown) => ValidatorFn;
  /** Error key produced by the validator, when it differs from `name`. */
  errorKey?: string;
  message: (label: string, error: unknown, configValue: unknown) => string;
}

export const DYNAMIC_VALIDATORS = new InjectionToken<ValidatorDefinition[][]>('DYNAMIC_VALIDATORS');

export function provideDynamicValidators(...definitions: ValidatorDefinition[]): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: DYNAMIC_VALIDATORS, useValue: definitions, multi: true }]);
}

type LengthError = { requiredLength: number };
type RangeError = { min?: number; max?: number };

export const BUILT_IN_VALIDATORS: ValidatorDefinition[] = [
  { name: 'required', create: () => Validators.required, message: (label) => `${label} is required.` },
  {
    // Angular's Validators.requiredTrue reports a generic `required` error; a distinct key lets it carry its own message.
    name: 'requiredTrue',
    create: () => (control) => (control.value === true ? null : { requiredTrue: true }),
    message: (label) => `${label} must be accepted.`,
  },
  { name: 'email', create: () => Validators.email, message: () => 'Enter a valid email address.' },
  {
    name: 'minLength',
    errorKey: 'minlength',
    create: (value) => Validators.minLength(Number(value)),
    message: (label, error) => `${label} must be at least ${(error as LengthError).requiredLength} characters.`,
  },
  {
    name: 'maxLength',
    errorKey: 'maxlength',
    create: (value) => Validators.maxLength(Number(value)),
    message: (label, error) => `${label} cannot exceed ${(error as LengthError).requiredLength} characters.`,
  },
  { name: 'min', create: (value) => Validators.min(Number(value)), message: (label, error) => `${label} must be at least ${(error as RangeError).min}.` },
  { name: 'max', create: (value) => Validators.max(Number(value)), message: (label, error) => `${label} must be at most ${(error as RangeError).max}.` },
  { name: 'pattern', create: (value) => Validators.pattern(String(value)), message: (label) => `${label} has an invalid format.` },
];

@Injectable()
export class ValidatorRegistry {
  private readonly byName = new Map<string, ValidatorDefinition>();
  private readonly byErrorKey = new Map<string, ValidatorDefinition>();

  constructor() {
    const custom = (inject(DYNAMIC_VALIDATORS, { optional: true }) ?? []).flat();
    for (const definition of [...BUILT_IN_VALIDATORS, ...custom]) {
      this.byName.set(definition.name, definition);
      this.byErrorKey.set(definition.errorKey ?? definition.name, definition);
    }
  }

  create(name: string, value: unknown): ValidatorFn {
    const definition = this.byName.get(name);
    if (!definition) throw new Error(`Unknown validator "${name}". Register it with provideDynamicValidators().`);
    return definition.create(value);
  }

  /** Resolves a human-readable message for the first error on a control. */
  describe(errors: ValidationErrors, label: string, overrides: Record<string, string> = {}, configValues: Record<string, unknown> = {}): string | null {
    const [errorKey, error] = Object.entries(errors)[0] ?? [];
    if (!errorKey) return null;
    const definition = this.byErrorKey.get(errorKey);
    const override = definition ? overrides[definition.name] : undefined;
    if (override) return override;
    return definition ? definition.message(label, error, configValues[definition.name]) : `${label} is invalid.`;
  }
}
