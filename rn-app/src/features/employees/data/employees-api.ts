import { request } from '@/core/api/http-client';
import type { Employee, EmployeeChanges } from './employee.model';

export interface EmployeePage {
  items: Employee[];
  /** Server clock at the time of the query; the next delta sync starts from here. */
  serverTime: string;
}

export const employeesApi = {
  list(updatedSince?: string): Promise<EmployeePage> {
    return request<EmployeePage>('/employees', { query: { updatedSince } });
  },

  /** Rejected with 409 (body `{ current }`) when `baseVersion` is stale. */
  update(id: string, baseVersion: number, changes: EmployeeChanges): Promise<Employee> {
    return request<Employee>(`/employees/${id}`, { method: 'PUT', body: { ...changes, version: baseVersion } });
  },
};
