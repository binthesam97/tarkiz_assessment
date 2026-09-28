import { EnvironmentProviders } from '@angular/core';
import { BUILT_IN_CONTROLS } from '../controls/built-in-controls';
import { ControlDefinition, provideDynamicControls } from './control-registry';

/** Registers the built-in control set, optionally followed by application-specific controls. */
export function provideDynamicForms(...additionalControls: ControlDefinition[]): EnvironmentProviders[] {
  return [provideDynamicControls(...BUILT_IN_CONTROLS), provideDynamicControls(...additionalControls)];
}
