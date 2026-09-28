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

/** Fields an employee record may be edited on from the mobile app. */
export type EmployeeChanges = Partial<Pick<Employee, 'phone' | 'designation' | 'location'>>;

export function fullName(employee: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${employee.firstName} ${employee.lastName}`;
}
