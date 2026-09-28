import { ValidatorFn } from '@angular/forms';
import { ValidatorDefinition } from '../core/validator-registry';

const noDigits: ValidatorFn = (control) => (/\d/.test(String(control.value ?? '')) ? { noDigits: true } : null);

export const CUSTOM_VALIDATORS: ValidatorDefinition[] = [
  { name: 'noDigits', create: () => noDigits, message: (label) => `${label} cannot contain digits.` },
];
