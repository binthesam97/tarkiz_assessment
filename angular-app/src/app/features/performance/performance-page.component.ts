import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { generateRecords } from './data/employee-record';
import { RecordQuery, SortKey } from './shared/record-query';
import { OptimizedTableComponent } from './table/optimized-table.component';

const RECORD_COUNT = 10_000;
const SEARCH_DEBOUNCE_MS = 250;

@Component({
  selector: 'app-performance-page',
  imports: [OptimizedTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './performance-page.component.html',
  styleUrl: './performance-page.component.scss',
})
export class PerformancePageComponent {
  private readonly injector = inject(Injector);
  private readonly tableHost = viewChild.required<ElementRef<HTMLElement>>('tableHost');

  protected readonly recordCount = RECORD_COUNT;
  protected readonly records = signal(generateRecords(RECORD_COUNT));
  protected readonly sort = signal<SortKey>('name');
  protected readonly searchInput = signal('');

  /** Search is debounced so filtering 10k rows does not run on every keystroke. */
  private readonly debouncedSearch = toSignal(toObservable(this.searchInput).pipe(debounceTime(SEARCH_DEBOUNCE_MS)), {
    initialValue: '',
  });

  protected readonly query = computed<RecordQuery>(() => ({ search: this.debouncedSearch(), sort: this.sort() }));

  protected readonly renderMs = signal<number | null>(null);
  protected readonly domNodes = signal<number | null>(null);

  constructor() {
    this.measure(() => undefined);
  }

  protected setSort(sort: SortKey): void {
    this.measure(() => this.sort.set(sort));
  }

  /**
   * Time from a state change until the resulting frame has been painted, plus
   * the resulting DOM size. Waiting for the paint (rAF + macrotask) also
   * captures the rows the virtual-scroll viewport renders a frame later.
   */
  private measure(change: () => void): void {
    const start = performance.now();
    change();
    afterNextRender(
      () =>
        requestAnimationFrame(() =>
          setTimeout(() => {
            this.renderMs.set(Math.round(performance.now() - start));
            this.domNodes.set(this.tableHost().nativeElement.querySelectorAll('*').length);
          }),
        ),
      { injector: this.injector },
    );
  }
}
