import { Pipe, PipeTransform } from '@angular/core';

// Formatter construction is comparatively expensive; create each one once per module.
const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });

/**
 * Pure pipes are memoised by Angular: `transform` re-runs only when the input
 * reference changes, not on every change-detection pass.
 */
@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('');
  }
}

@Pipe({ name: 'inr' })
export class InrPipe implements PipeTransform {
  transform(value: number): string {
    return currencyFormatter.format(value);
  }
}

@Pipe({ name: 'shortDate' })
export class ShortDatePipe implements PipeTransform {
  transform(value: string): string {
    return dateFormatter.format(new Date(value));
  }
}
