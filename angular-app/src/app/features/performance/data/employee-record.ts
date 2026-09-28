export interface EmployeeRecord {
  id: number;
  name: string;
  email: string;
  department: string;
  location: string;
  salary: number;
  rating: number;
  joinedAt: string;
}

const FIRST = ['Aarav', 'Priya', 'Rahul', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Meera', 'Karthik', 'Divya', 'John', 'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia'];
const LAST = ['Sharma', 'Iyer', 'Nair', 'Menon', 'Reddy', 'Patel', 'Gupta', 'Kumar', 'Smith', 'Brown', 'Wilson', 'Taylor'];
const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations', 'IT', 'Legal'];
const LOCATIONS = ['Bengaluru', 'Kochi', 'Chennai', 'Hyderabad', 'Pune', 'London', 'Dubai', 'Singapore'];

/** Deterministic so that measurements are comparable between runs. */
export function generateRecords(count: number): EmployeeRecord[] {
  let seed = 20260927;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;

  return Array.from({ length: count }, (_, index) => {
    const first = pick(FIRST);
    const last = pick(LAST);
    return {
      id: index + 1,
      name: `${first} ${last}`,
      email: `${first}.${last}.${index + 1}@acme.test`.toLowerCase(),
      department: pick(DEPARTMENTS),
      location: pick(LOCATIONS),
      salary: Math.round(300_000 + random() * 4_700_000),
      rating: Math.round((1 + random() * 4) * 10) / 10,
      joinedAt: new Date(Date.UTC(2010 + Math.floor(random() * 16), Math.floor(random() * 12), 1 + Math.floor(random() * 28))).toISOString(),
    };
  });
}
