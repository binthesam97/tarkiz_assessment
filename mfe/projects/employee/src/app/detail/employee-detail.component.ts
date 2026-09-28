import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HasRoleDirective, PageHeaderComponent } from '@acme/shared';
import { EmployeesApi } from '../data/employees-api.service';
import { DEPARTMENTS, Employee } from '../data/employee.model';

@Component({
  selector: 'emp-employee-detail',
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, HasRoleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink=".." class="back">← All employees</a>

    @if (employee(); as current) {
      <acme-page-header [heading]="current.firstName + ' ' + current.lastName" [subheading]="current.email" />

      @if (message(); as note) {
        <p class="alert" [class.error]="note.kind === 'error'" [class.info]="note.kind === 'info'" role="status">{{ note.text }}</p>
      }

      <form class="card" [formGroup]="form" (ngSubmit)="save(current)">
        <div class="grid">
          <label>Department
            <select class="input" formControlName="department">
              @for (option of departments; track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select>
          </label>
          <label>Designation <input class="input" formControlName="designation" /></label>
          <label>Location <input class="input" formControlName="location" /></label>
          <label>Phone <input class="input" formControlName="phone" /></label>
        </div>
        <p class="meta">Version {{ current.version }} · last updated {{ current.updatedAt }}</p>
        <!-- Only admins may edit; HR has read access. The server remains the source of truth for authorisation. -->
        <button *acmeHasRole="['ADMIN']" type="submit" class="btn primary" [disabled]="saving() || form.pristine">
          {{ saving() ? 'Saving…' : 'Save changes' }}
        </button>
      </form>
    } @else if (loadFailed()) {
      <p class="alert error">Employee not found.</p>
    } @else {
      <p>Loading…</p>
    }
  `,
  styles: `
    .back { display: inline-block; margin-bottom: 1rem; color: var(--accent); text-decoration: none; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    label { display: grid; gap: 0.375rem; font-weight: 500; font-size: 0.875rem; }
    .meta { color: var(--text-muted); font-size: 0.8125rem; }
  `,
})
export class EmployeeDetailComponent {
  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  private readonly api = inject(EmployeesApi);
  protected readonly departments = DEPARTMENTS;
  protected readonly employee = signal<Employee | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly message = signal<{ kind: 'info' | 'error'; text: string } | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    department: ['', Validators.required],
    designation: ['', Validators.required],
    location: [''],
    phone: [''],
  });

  constructor() {
    effect((onCleanup) => {
      const subscription = this.api.get(this.id()).subscribe({
        next: (employee) => this.load(employee),
        error: () => this.loadFailed.set(true),
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected save(current: Employee): void {
    this.saving.set(true);
    this.api.update(current.id, current.version, this.form.getRawValue()).subscribe({
      next: (updated) => {
        this.load(updated);
        this.message.set({ kind: 'info', text: 'Changes saved.' });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (error instanceof HttpErrorResponse && error.status === 409) {
          // Someone else saved first: show their version rather than silently overwriting it.
          this.load((error.error as { current: Employee }).current);
          this.message.set({ kind: 'error', text: 'This record was changed by someone else. The latest version has been loaded — please re-apply your changes.' });
          return;
        }
        this.message.set({ kind: 'error', text: 'Could not save changes.' });
      },
    });
  }

  private load(employee: Employee): void {
    this.employee.set(employee);
    this.saving.set(false);
    this.form.reset({ department: employee.department, designation: employee.designation, location: employee.location, phone: employee.phone });
  }
}
