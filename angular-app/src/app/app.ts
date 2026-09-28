import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CHALLENGES } from './app.routes';
import { APP_CONFIG } from './core/app-config';
import { NotificationStore } from './features/notifications/state/notification.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly challenges = CHALLENGES;
  protected readonly hrPortalUrl = inject(APP_CONFIG).hrPortalUrl;
  protected readonly employeeAppUrl = inject(APP_CONFIG).employeeAppUrl;

  private readonly notifications = inject(NotificationStore);
  protected readonly unreadNotifications = toSignal(this.notifications.unreadCount$, { initialValue: 0 });

  constructor() {
    // The feed is application-wide so the unread badge stays current on every page.
    this.notifications.connect();
  }
}
