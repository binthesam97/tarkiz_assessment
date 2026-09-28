import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '@acme/shared';
import { Observable, map } from 'rxjs';
import { Employee, EmployeeChanges } from './employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/employees`;

  list(): Observable<Employee[]> {
    return this.http.get<{ items: Employee[] }>(this.baseUrl).pipe(map((response) => response.items));
  }

  get(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/${id}`);
  }

  /** Sends the version the user edited; the server answers 409 if someone else saved first. */
  update(id: string, version: number, changes: EmployeeChanges): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/${id}`, { ...changes, version });
  }
}
