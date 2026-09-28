export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  location: string;
  version: number;
  updatedAt: string;
}

export type EmployeeChanges = Pick<Employee, 'department' | 'designation' | 'location' | 'phone'>;

export const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations', 'IT'] as const;
