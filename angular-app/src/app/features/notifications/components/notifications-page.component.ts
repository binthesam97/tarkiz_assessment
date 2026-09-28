import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';
import { APP_CONFIG } from '../../../core/app-config';
import { NotificationSocket } from '../data/notification-socket.service';
import { NOTIFICATION_CATEGORIES, NotificationCategory } from '../data/notification.model';
import { NotificationStore } from '../state/notification.store';
import { NotificationItemComponent } from './notification-item.component';

type CategoryFilter = NotificationCategory | 'ALL';

@Component({
  selector: 'app-notifications-page',
  imports: [NotificationItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
})
export class NotificationsPageComponent {
  protected readonly store = inject(NotificationStore);
  protected readonly socket = inject(NotificationSocket);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_CONFIG).apiUrl;

  protected readonly categories = NOTIFICATION_CATEGORIES;
  protected readonly filter = signal<CategoryFilter>('ALL');
  protected readonly unreadOnly = signal(false);
  protected readonly testCategory = signal<NotificationCategory>('ALERT');

  protected readonly notifications = toSignal(this.store.notifications$, { initialValue: [] });
  protected readonly unreadCount = toSignal(this.store.unreadCount$, { initialValue: 0 });
  protected readonly counts = toSignal(this.store.countsByCategory$, { requireSync: true });
  protected readonly now = toSignal(interval(30_000).pipe(map(() => Date.now())), { initialValue: Date.now() });

  protected readonly visible = computed(() => {
    const filter = this.filter();
    const unreadOnly = this.unreadOnly();
    return this.notifications().filter((item) => (filter === 'ALL' || item.category === filter) && (!unreadOnly || !item.read));
  });

  protected markAllAsRead(): void {
    const filter = this.filter();
    this.store.markAllAsRead(filter === 'ALL' ? undefined : filter);
  }

  protected sendTestNotification(): void {
    this.http
      .post(`${this.apiUrl}/_admin/notifications`, {
        category: this.testCategory(),
        title: 'Test notification',
        message: `Triggered manually at ${new Date().toLocaleTimeString()}.`,
      })
      .subscribe();
  }

  /** Asks the server to drop every socket, to demonstrate automatic reconnection. */
  protected dropConnection(): void {
    this.http.post(`${this.apiUrl}/_admin/ws/disconnect`, {}).subscribe();
  }
}
