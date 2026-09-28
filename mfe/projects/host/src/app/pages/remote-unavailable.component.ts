import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-remote-unavailable',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alert error" role="alert">
      <strong>The Employees module is currently unavailable.</strong>
      The rest of the application keeps working; please try again shortly.
    </div>
  `,
})
export class RemoteUnavailableComponent {}
