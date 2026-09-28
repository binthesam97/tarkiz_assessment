import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@acme/shared';
import { catchError, map, of, startWith } from 'rxjs';
import { EmployeesApi } from '../data/employees-api.service';
import { DEPARTMENTS, Employee } from '../data/employee.model';

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; employees: Employee[] };

@Component({
  selector: 'emp-employee-list',
  imports: [RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <acme-page-header heading="Employees" subheading="Served by the employee micro frontend." />

    <div class="toolbar">
      <input class="input search" type="search" placeholder="Search by name or email" aria-label="Search employees" (input)="search.set($any($event.target).value)" />
      <select class="input department" aria-label="Filter by department" (change)="department.set($any($event.target).value)">
        <option value="">All departments</option>
        @for (option of departments; track option) {
          <option [value]="option">{{ option }}</option>
        }
      </select>
    </div>

    @switch (state().status) {
      @case ('loading') {
        <p class="muted">Loading employees…</p>
      }
      @case ('error') {
        <p class="alert error">Could not load employees.</p>
      }
      @default {
        <div class="card table-card">
          <table>
            <thead>
              <tr><th>Name</th><th>Department</th><th>Designation</th><th>Location</th></tr>
            </thead>
            <tbody>
              @for (employee of filtered(); track employee.id) {
                <tr>
                  <td>
                    <a [routerLink]="[employee.id]">{{ employee.firstName }} {{ employee.lastName }}</a>
                    <small>{{ employee.email }}</small>
                  </td>
                  <td>{{ employee.department }}</td>
                  <td>{{ employee.designation }}</td>
                  <td>{{ employee.location }}</td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="muted">No employees match the filters.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="muted count">{{ filtered().length }} of {{ total() }} employees</p>
      }
    }
  `,
  styles: `
    .search { flex: 1; }
    .department { width: auto; }
    .table-card { padding: 0; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--border); text-align: left; }
    th { font-size: 0.8125rem; color: var(--text-muted); }
    td a { display: block; font-weight: 600; color: var(--accent); text-decoration: none; }
    small, .muted { color: var(--text-muted); }
    .count { font-size: 0.8125rem; }
  `,
})
export class EmployeeListComponent {
  protected readonly departments = DEPARTMENTS;
  protected readonly search = signal('');
  protected readonly department = signal('');

  protected readonly state = toSignal(
    inject(EmployeesApi)
      .list()
      .pipe(
        map((employees): ListState => ({ status: 'loaded', employees })),
        startWith<ListState>({ status: 'loading' }),
        catchError(() => of<ListState>({ status: 'error' })),
      ),
    { requireSync: true },
  );

  private readonly employees = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.employees : [];
  });
  protected readonly total = computed(() => this.employees().length);

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const department = this.department();
    return this.employees().filter(
      (employee) =>
        (!department || employee.department === department) &&
        (!term || `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(term) || employee.email.includes(term)),
    );
  });
}
