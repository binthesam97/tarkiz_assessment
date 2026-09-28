import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { map, startWith, switchMap } from 'rxjs';

export interface ControlState {
  showError: boolean;
  errors: ValidationErrors | null;
}

/**
 * Exposes a control's validation state as a signal. Reactive form state changes
 * made from outside a view (e.g. `markAllAsTouched()` on submit) do not notify
 * OnPush children; subscribing to `control.events` keeps them in sync.
 * Must be called in an injection context.
 */
export function controlState(control: Signal<AbstractControl>): Signal<ControlState> {
  return toSignal(
    toObservable(control).pipe(
      switchMap((current) =>
        current.events.pipe(
          startWith(null),
          map(() => ({ showError: current.invalid && current.touched, errors: current.errors })),
        ),
      ),
    ),
    { initialValue: { showError: false, errors: null } },
  );
}
