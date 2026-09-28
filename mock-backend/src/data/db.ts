import { config } from '../config.js';
import { Collection } from '../lib/collection.js';
import type { AppNotification, AttendanceRecord, CatalogItem, Employee, LeaveRequest, PaymentIntent, Product, RouteBatch, ShopOrder } from './models.js';
import { catalogItemAt, seedEmployees, seedProducts, seedUsers } from './seed.js';

/** Process-wide in-memory state. Restarting the server resets all data. */
export const db = {
  users: seedUsers(),
  products: new Collection<Product>('Product', seedProducts()),
  employees: new Collection<Employee>('Employee', seedEmployees()),
  catalog: Array.from({ length: config.catalogSize }, (_, index): CatalogItem => catalogItemAt(index)),
  routes: [] as RouteBatch[],
  attendance: new Collection<AttendanceRecord>('Attendance'),
  leaves: new Collection<LeaveRequest>('Leave request'),
  notifications: [] as AppNotification[],
  paymentIntents: new Collection<PaymentIntent>('Payment intent'),
  orders: new Collection<ShopOrder>('Order'),
};
