import { ChangeDetectionStrategy, Component, OnDestroy, inject, input } from '@angular/core';
import { MockNetworkSettings } from './mock-network.settings';

/** Demo panel for slowing down or breaking the mock API. Settings reset when the page is left. */
@Component({
  selector: 'app-network-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset>
      <legend>Simulated network</legend>
      <label>
        <span>Latency: <strong>{{ settings.latencyMs() ?? defaultLatencyMs() }} ms</strong></span>
        <input
          type="range" min="0" max="3000" step="100"
          [value]="settings.latencyMs() ?? defaultLatencyMs()"
          (input)="settings.latencyMs.set($any($event.target).valueAsNumber)"
        />
      </label>
      @if (showFailureRate()) {
        <label>
          <span>Random failure rate: <strong>{{ (settings.failureRate() ?? 0) * 100 }}%</strong></span>
          <input
            type="range" min="0" max="1" step="0.1"
            [value]="settings.failureRate() ?? 0"
            (input)="settings.failureRate.set($any($event.target).valueAsNumber)"
          />
        </label>
      }
      @if (showFailMutations()) {
        <label class="toggle">
          <input type="checkbox" [checked]="settings.failMutations()" (change)="settings.failMutations.set($any($event.target).checked)" />
          Fail all create / update / delete requests
        </label>
      }
    </fieldset>
  `,
  styles: `
    fieldset { display: grid; gap: 0.75rem; margin: 0; padding: 1rem; border: 1px dashed var(--border); border-radius: var(--radius); }
    legend { padding: 0 0.375rem; font-weight: 600; font-size: 0.8125rem; color: var(--text-muted); }
    label { display: grid; gap: 0.25rem; font-size: 0.875rem; }
    label.toggle { display: flex; align-items: center; gap: 0.5rem; }
  `,
})
export class NetworkControlsComponent implements OnDestroy {
  readonly defaultLatencyMs = input(300);
  readonly showFailureRate = input(true);
  readonly showFailMutations = input(false);

  protected readonly settings = inject(MockNetworkSettings);

  ngOnDestroy(): void {
    this.settings.reset();
  }
}
