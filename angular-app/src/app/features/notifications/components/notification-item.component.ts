import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { StoredNotification } from '../data/notification.model';
import { RelativeTimePipe } from './relative-time.pipe';

@Component({
  selector: 'app-notification-item',
  imports: [DatePipe, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let item = notification();
    <article [class.unread]="!item.read" [attr.data-category]="item.category">
      <span class="dot" [attr.aria-label]="item.read ? null : 'Unread'"></span>
      <div class="body">
        <header>
          <span class="category">{{ item.category }}</span>
          <h3>{{ item.title }}</h3>
          <time [attr.datetime]="item.createdAt" [title]="item.createdAt | date: 'medium'">{{ item.createdAt | relativeTime: now() }}</time>
        </header>
        <p>{{ item.message }}</p>
      </div>
      <div class="actions">
        @if (!item.read) {
          <button type="button" class="btn small" (click)="markRead.emit(item.id)">Mark read</button>
        }
        <button type="button" class="btn small" aria-label="Remove notification" (click)="remove.emit(item.id)">✕</button>
      </div>
    </article>
  `,
  styles: `
    article { display: grid; grid-template-columns: 0.75rem 1fr auto; gap: 0.75rem; align-items: start; padding: 0.875rem 1rem; border-bottom: 1px solid var(--border); }
    article.unread { background: var(--accent-soft); }
    .dot { width: 0.5rem; height: 0.5rem; margin-top: 0.5rem; border-radius: 50%; }
    .unread .dot { background: var(--accent); }
    header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; }
    h3 { margin: 0; font-size: 0.9375rem; }
    .unread h3 { font-weight: 700; }
    time { margin-left: auto; font-size: 0.75rem; color: var(--text-muted); }
    p { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.875rem; }
    .actions { display: flex; gap: 0.375rem; }
    .category { font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.04em; padding: 0.0625rem 0.375rem; border-radius: 4px; background: var(--surface-muted); color: var(--text-muted); }
    [data-category='ALERT'] .category { background: var(--danger-soft); color: var(--danger); }
    [data-category='TASK'] .category { background: var(--warning-soft); color: var(--warning); }
    [data-category='MESSAGE'] .category { background: var(--success-soft); color: var(--success); }
  `,
})
export class NotificationItemComponent {
  readonly notification = input.required<StoredNotification>();
  /** Passed in so that all items share one ticking clock instead of one timer each. */
  readonly now = input.required<number>();

  readonly markRead = output<string>();
  readonly remove = output<string>();
}
