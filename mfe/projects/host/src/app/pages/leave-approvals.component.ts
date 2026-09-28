import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { API_BASE_URL, PageHeaderComponent } from '@acme/shared';
import { filter } from 'rxjs';
import { LiveAlertsService } from '../alerts/live-alerts.service';

interface LeaveRequest {
  id: string;
  employeeId: string;
  type: string;
  from: string;
  to: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

@Component({
  selector: 'app-leave-approvals',
  imports: [PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <acme-page-header heading="Leave approvals" subheading="Requests from the mobile app appear here in real time." />
    @if (error()) {
      <p class="alert error">{{ error() }}</p>
    }
    <div class="card table-card">
      <table>
        <thead>
          <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          @for (leave of leaves(); track leave.id) {
            <tr>
              <td>{{ leave.employeeId }}</td>
              <td>{{ leave.type }}</td>
              <td>{{ leave.from }} → {{ leave.to }}</td>
              <td>{{ leave.reason || '—' }}</td>
              <td><span class="badge" [attr.data-status]="leave.status">{{ leave.status }}</span></td>
              <td class="actions">
                @if (leave.status === 'PENDING') {
                  <button type="button" class="btn small primary" [disabled]="busy() === leave.id" (click)="decide(leave, 'APPROVED')">Approve</button>
                  <button type="button" class="btn small danger" [disabled]="busy() === leave.id" (click)="decide(leave, 'REJECTED')">Reject</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="empty">No leave requests yet.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .table-card { padding: 0; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--border); text-align: left; }
    th { font-size: 0.8125rem; color: var(--text-muted); }
    .actions { display: flex; gap: 0.375rem; justify-content: flex-end; }
    .empty { text-align: center; color: var(--text-muted); padding: 2rem; }
    .badge[data-status='APPROVED'] { background: var(--success-soft); color: var(--success); }
    .badge[data-status='PENDING'] { background: var(--warning-soft); color: var(--warning); }
    .badge[data-status='REJECTED'] { background: var(--danger-soft); color: var(--danger); }
  `,
})
export class LeaveApprovalsComponent {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/leaves`;

  protected readonly leaves = signal<LeaveRequest[]>([]);
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.load();
    inject(LiveAlertsService)
      .resourceChanged$.pipe(
        filter((resource) => resource === 'leave'),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.load());
  }

  protected decide(leave: LeaveRequest, status: 'APPROVED' | 'REJECTED'): void {
    this.busy.set(leave.id);
    this.http.patch<LeaveRequest>(`${this.url}/${leave.id}`, { status }).subscribe({
      next: (updated) => {
        this.leaves.update((leaves) => leaves.map((item) => (item.id === updated.id ? updated : item)));
        this.busy.set(null);
      },
      error: () => {
        this.error.set('Could not update the request.');
        this.busy.set(null);
      },
    });
  }

  private load(): void {
    this.http.get<LeaveRequest[]>(this.url).subscribe({
      next: (leaves) => this.leaves.set([...leaves].reverse()),
      error: () => this.error.set('Could not load leave requests.'),
    });
  }
}
