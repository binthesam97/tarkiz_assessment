import { Pipe, PipeTransform } from '@angular/core';

const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1_000],
];

/** Pure pipe: recomputes only when the timestamp or the supplied `now` changes. */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(isoDate: string, now: number): string {
    const diff = Date.parse(isoDate) - now;
    if (Math.abs(diff) < 10_000) return 'just now';
    const [unit, ms] = UNITS.find(([, size]) => Math.abs(diff) >= size) ?? UNITS[UNITS.length - 1]!;
    return formatter.format(Math.round(diff / ms), unit);
  }
}
