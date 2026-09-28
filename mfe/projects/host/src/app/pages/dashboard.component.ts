import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { API_BASE_URL, AuthService, HasRoleDirective, PageHeaderComponent, StatCardComponent } from '@acme/shared';
import { catchError, of } from 'rxjs';

interface HeadcountRow {
  department: string;
  count: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [PageHeaderComponent, StatCardComponent, HasRoleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <acme-page-header [heading]="'Welcome, ' + (auth.user()?.name ?? '')" subheading="HR dashboard — rendered by the host application." />

    <ng-container *acmeHasRole="['HR', 'ADMIN']">
      <div class="stats">
        <acme-stat-card label="Total employees" [value]="totalHeadcount()" />
        <acme-stat-card label="Departments" [value]="headcount().length" />
        <acme-stat-card label="Largest department" [value]="largest()?.department ?? '—'" [hint]="largest() ? largest()!.count + ' people' : undefined" />
      </div>

      <section class="card">
        <h2>Headcount by department</h2>
        <ul class="bars">
          @for (row of headcount(); track row.department) {
            <li>
              <span>{{ row.department }}</span>
              <span class="bar"><span [style.width.%]="(row.count / (largest()?.count ?? 1)) * 100"></span></span>
              <span class="count">{{ row.count }}</span>
            </li>
          }
        </ul>
      </section>
    </ng-container>

    @if (!isManager()) {
      <section class="card note">
        <p>
          Signed in as <strong>{{ auth.user()?.email }}</strong> with the Employee role. Reports and employee administration are
          available to HR and Admin users only.
        </p>
      </section>
    }
  `,
  styles: `
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
    .bars { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.625rem; }
    .bars li { display: grid; grid-template-columns: 8rem 1fr 3rem; align-items: center; gap: 0.75rem; }
    .bar { height: 0.625rem; border-radius: 999px; background: var(--surface-muted); overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--accent); }
    .count { text-align: right; font-variant-numeric: tabular-nums; }
    .note { margin-top: 1.25rem; }
    .note p { margin: 0; }
  `,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL);

  protected readonly headcount = toSignal(
    this.auth.hasAnyRole(['HR', 'ADMIN'])
      ? this.http.get<HeadcountRow[]>(`${this.apiUrl}/reports/headcount`).pipe(catchError(() => of([])))
      : of([]),
    { initialValue: [] },
  );
  protected readonly isManager = computed(() => this.auth.hasAnyRole(['HR', 'ADMIN']));
  protected readonly totalHeadcount = computed(() => this.headcount().reduce((sum, row) => sum + row.count, 0));
  protected readonly largest = computed<HeadcountRow | undefined>(() => [...this.headcount()].sort((a, b) => b.count - a.count)[0]);
}
