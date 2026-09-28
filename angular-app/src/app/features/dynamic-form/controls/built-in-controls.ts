import { Validators } from '@angular/forms';
import { ControlDefinition } from '../core/control-registry';
import { CheckboxControl } from './checkbox.control';
import { DropdownControl } from './dropdown.control';
import { RadioGroupControl } from './radio-group.control';
import { TextInputControl } from './text-input.control';
import { TextareaControl } from './textarea.control';

export const BUILT_IN_CONTROLS: ControlDefinition[] = [
  { types: ['text', 'password', 'tel', 'url', 'date'], component: TextInputControl, defaultValue: '' },
  { types: ['email'], component: TextInputControl, defaultValue: '', validators: () => [Validators.email] },
  { types: ['number'], component: TextInputControl, defaultValue: null },
  { types: ['textarea'], component: TextareaControl, defaultValue: '' },
  { types: ['dropdown', 'select'], component: DropdownControl, defaultValue: null },
  { types: ['radio'], component: RadioGroupControl, defaultValue: null },
  { types: ['checkbox'], component: CheckboxControl, defaultValue: false },
];
