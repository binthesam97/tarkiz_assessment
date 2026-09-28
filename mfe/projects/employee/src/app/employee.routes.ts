import { Routes } from '@angular/router';
import { EmployeeDetailComponent } from './detail/employee-detail.component';
import { EmployeeListComponent } from './list/employee-list.component';

/** Exposed to the host through Native Federation as `employee/./routes`. */
export const EMPLOYEE_ROUTES: Routes = [
  { path: '', title: 'Employees', component: EmployeeListComponent },
  { path: ':id', title: 'Employee', component: EmployeeDetailComponent },
];
