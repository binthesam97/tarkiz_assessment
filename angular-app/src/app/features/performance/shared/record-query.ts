import { EmployeeRecord } from '../data/employee-record';

export type SortKey = 'name' | 'salary' | 'rating' | 'joinedAt';

export interface RecordQuery {
  search: string;
  sort: SortKey;
}

export function matchesSearch(record: EmployeeRecord, term: string): boolean {
  if (!term) return true;
  return (
    record.name.toLowerCase().includes(term) ||
    record.email.includes(term) ||
    record.department.toLowerCase().includes(term) ||
    record.location.toLowerCase().includes(term)
  );
}

export function compareBy(sort: SortKey): (a: EmployeeRecord, b: EmployeeRecord) => number {
  switch (sort) {
    case 'salary':
      return (a, b) => b.salary - a.salary;
    case 'rating':
      return (a, b) => b.rating - a.rating;
    case 'joinedAt':
      return (a, b) => b.joinedAt.localeCompare(a.joinedAt);
    default:
      return (a, b) => a.name.localeCompare(b.name);
  }
}
