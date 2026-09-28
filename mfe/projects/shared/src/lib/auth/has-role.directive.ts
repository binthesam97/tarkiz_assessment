import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { Role } from './auth.models';
import { AuthService } from './auth.service';

/** Structural directive for role-based UI: `<button *acmeHasRole="['HR']">`. Reacts to sign-in/out. */
@Directive({ selector: '[acmeHasRole]' })
export class HasRoleDirective {
  readonly acmeHasRole = input.required<Role[]>();

  private readonly auth = inject(AuthService);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);

  constructor() {
    // hasAnyRole reads the session signal, so the view updates on sign-in/out.
    effect(() => {
      const allowed = this.auth.hasAnyRole(this.acmeHasRole());
      this.container.clear();
      if (allowed) this.container.createEmbeddedView(this.template);
    });
  }
}
