import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmployeeRecord } from '../data/employee-record';
import { InitialsPipe, InrPipe, ShortDatePipe } from './formatting.pipes';

/** OnPush row: only re-rendered when its `record` input reference changes. */
@Component({
  selector: 'app-record-row',
  imports: [InitialsPipe, InrPipe, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let item = record();
    <span class="cell avatar">{{ item.name | initials }}</span>
    <span class="cell">{{ item.name }}<br /><small>{{ item.email }}</small></span>
    <span class="cell">{{ item.department }}</span>
    <span class="cell">{{ item.location }}</span>
    <span class="cell numeric">{{ item.salary | inr }}</span>
    <span class="cell numeric">{{ item.rating }}</span>
    <span class="cell">{{ item.joinedAt | shortDate }}</span>
  `,
  styleUrl: '../shared/table.scss',
  styles: `
    :host { display: grid; grid-template-columns: var(--record-columns); align-items: center; height: 52px; }
    .cell { display: flex; flex-direction: column; justify-content: center; height: 100%; line-height: 1.3; }
    .numeric { align-items: flex-end; }
  `,
})
export class RecordRowComponent {
  readonly record = input.required<EmployeeRecord>();
}
