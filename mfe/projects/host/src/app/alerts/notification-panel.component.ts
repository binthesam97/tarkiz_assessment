import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { LiveAlertsService, type PortalNotification } from './live-alerts.service';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

function ago(iso: string): string {
  const diff = Date.parse(iso) - Date.now();
  const unit = UNITS.find(([, ms]) => Math.abs(diff) >= ms);
  return unit ? relativeTime.format(Math.round(diff / unit[1]), unit[0]) : 'just now';
}

/** Bell button with a dropdown listing every notification; unread ones are highlighted. */
@Component({
  selector: 'app-notification-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="bell"
      aria-haspopup="dialog"
      aria-controls="notification-panel"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="alerts.unread() ? alerts.unread() + ' unread notifications' : 'Notifications'"
      (click)="toggle()"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      @if (alerts.unread()) {
        <span class="count">{{ alerts.unread() }}</span>
      }
    </button>

    @if (open()) {
      <section id="notification-panel" class="panel" role="dialog" aria-label="Notifications">
        <header>
          <div>
            <h2>Notifications</h2>
            <p>{{ alerts.unread() }} unread</p>
          </div>
          <button type="button" class="btn small" [disabled]="!alerts.unread()" (click)="alerts.markAllRead()">Mark all as read</button>
        </header>

        <ul>
          @for (item of alerts.notifications(); track item.id) {
            <li>
              <button
                type="button"
                class="item"
                [class.unread]="!item.read"
                [attr.data-category]="item.category"
                [attr.aria-label]="(item.read ? '' : 'Unread: ') + item.title + '. ' + item.message"
                (click)="alerts.markRead(item.id)"
              >
                <span class="dot" aria-hidden="true"></span>
                <span class="body">
                  <span class="top">
                    <span class="category">{{ label(item) }}</span>
                    <time [attr.datetime]="item.createdAt">{{ timeAgo(item.createdAt) }}</time>
                  </span>
                  <span class="title">{{ item.title }}</span>
                  <span class="message">{{ item.message }}</span>
                </span>
              </button>
            </li>
          } @empty {
            <li class="empty">No notifications yet.</li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host { position: relative; display: inline-flex; }

    .bell { position: relative; display: inline-grid; place-items: center; width: 2.25rem; height: 2.25rem; border: none; border-radius: var(--radius); background: none; color: var(--text-muted); cursor: pointer; }
    .bell:hover, .bell[aria-expanded='true'] { background: var(--surface-muted); color: var(--text); }
    .bell svg { display: block; }
    .count { position: absolute; top: 0.125rem; right: 0.125rem; min-width: 1.125rem; padding: 0 0.25rem; border-radius: 999px; background: var(--danger); color: #fff; font-size: 0.6875rem; font-weight: 700; line-height: 1.125rem; text-align: center; }

    .panel { position: absolute; top: calc(100% + 0.5rem); right: -0.5rem; z-index: 20; width: min(400px, calc(100vw - 2rem)); background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 16px 40px rgb(16 24 40 / 0.16); overflow: hidden; text-align: left; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.875rem 1rem; border-bottom: 1px solid var(--border); }
    h2 { margin: 0; font-size: 1rem; }
    header p { margin: 0.125rem 0 0; font-size: 0.8125rem; color: var(--text-muted); }

    ul { margin: 0; padding: 0; list-style: none; max-height: min(28rem, 70vh); overflow-y: auto; }
    li + li { border-top: 1px solid var(--border); }
    .item { display: grid; grid-template-columns: 0.5rem 1fr; gap: 0.75rem; width: 100%; padding: 0.75rem 1rem; border: none; background: var(--surface); color: var(--text-muted); font: inherit; text-align: left; cursor: pointer; }
    .item:hover { background: var(--surface-muted); }
    .dot { width: 0.5rem; height: 0.5rem; margin-top: 0.4rem; border-radius: 50%; }
    .body { display: grid; gap: 0.125rem; min-width: 0; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .category { font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 0.0625rem 0.375rem; border-radius: 4px; background: var(--surface-muted); color: var(--text-muted); }
    time { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }
    .title { font-size: 0.875rem; font-weight: 500; color: var(--text-muted); }
    .message { font-size: 0.8125rem; line-height: 1.4; }

    /* Unread: tinted background, accent dot, strong title. Read items stay neutral and muted. */
    .item.unread { background: var(--accent-soft); color: var(--text); }
    .item.unread:hover { background: color-mix(in srgb, var(--accent-soft) 70%, var(--accent) 12%); }
    .item.unread .dot { background: var(--accent); }
    .item.unread .title { font-weight: 700; color: var(--text); }
    .item.unread[data-category='ALERT'] .category { background: var(--danger-soft); color: var(--danger); }
    .item.unread[data-category='TASK'] .category { background: var(--warning-soft); color: var(--warning); }
    .item.unread[data-category='MESSAGE'] .category { background: var(--success-soft); color: var(--success); }

    .empty { padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.875rem; }
  `,
})
export class NotificationPanelComponent {
  protected readonly alerts = inject(LiveAlertsService);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly open = signal(false);

  protected toggle(): void {
    this.open.update((value) => !value);
    if (this.open()) this.alerts.dismissToast();
  }

  protected label(item: PortalNotification): string {
    return item.category.charAt(0) + item.category.slice(1).toLowerCase();
  }

  protected timeAgo(iso: string): string {
    return ago(iso);
  }

  @HostListener('document:click', ['$event'])
  protected closeOnOutsideClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.open.set(false);
  }
}
