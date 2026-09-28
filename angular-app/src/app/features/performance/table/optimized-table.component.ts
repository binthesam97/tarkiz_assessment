import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EmployeeRecord } from '../data/employee-record';
import { RecordQuery, compareBy, matchesSearch } from '../shared/record-query';
import { RecordRowComponent } from './record-row.component';

const ROW_HEIGHT_PX = 52;

/**
 * Renders 10,000 records efficiently:
 *
 * - OnPush: skipped by change detection unless an input or signal it reads changes.
 * - `computed` memoises filtering and sorting; they re-run only when `records` or `query` change.
 * - CDK virtual scrolling keeps ~20 rows in the DOM regardless of dataset size.
 * - `trackBy` id lets rows be moved and reused rather than destroyed and re-created.
 * - Rows are OnPush components with pure pipes for formatting.
 */
@Component({
  selector: 'app-optimized-table',
  imports: [ScrollingModule, RecordRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cdk-virtual-scroll-viewport class="viewport" [itemSize]="rowHeight" minBufferPx="520" maxBufferPx="1040">
      <app-record-row *cdkVirtualFor="let record of visibleRecords(); trackBy: trackById; templateCacheSize: 40" [record]="record" />
    </cdk-virtual-scroll-viewport>
  `,
  styleUrl: '../shared/table.scss',
})
export class OptimizedTableComponent {
  readonly records = input.required<EmployeeRecord[]>();
  readonly query = input.required<RecordQuery>();

  protected readonly rowHeight = ROW_HEIGHT_PX;

  private readonly filtered = computed(() => {
    const term = this.query().search.trim().toLowerCase();
    return term ? this.records().filter((record) => matchesSearch(record, term)) : this.records();
  });

  /** Separate from `filtered` so that changing only the sort does not re-run the search. */
  protected readonly visibleRecords = computed(() => [...this.filtered()].sort(compareBy(this.query().sort)));

  protected trackById(_index: number, record: EmployeeRecord): number {
    return record.id;
  }
}
