export type Role = 'ADMIN' | 'HR' | 'EMPLOYEE';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  roles: Role[];
  employeeId: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  updatedAt: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  location: string;
  /** Monotonic revision used by clients for optimistic concurrency during offline sync. */
  version: number;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  rating: number;
  imageUrl: string;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  recordedAt: string;
}

export interface RouteBatch {
  id: string;
  employeeId: string;
  points: LocationPoint[];
  receivedAt: string;
}

export type NotificationCategory = 'SYSTEM' | 'TASK' | 'MESSAGE' | 'ALERT';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  /** Resource the event relates to, so clients can refresh the matching cached data. */
  resource?: 'leave' | 'attendance' | 'order';
  /** In-app route the notification opens, e.g. `/shop/orders/ORD-123`. */
  link?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  updatedAt: string;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'CASUAL' | 'SICK' | 'EARNED';
  from: string;
  to: string;
  reason: string;
  status: LeaveStatus;
  updatedAt: string;
}

export type ShippingOption = 'STANDARD' | 'EXPRESS';

export interface CartLineInput {
  productId: string;
  quantity: number;
}

export interface QuoteLine {
  productId: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

/** Server-calculated totals. Clients display these and never compute prices themselves. */
export interface Quote {
  lines: QuoteLine[];
  shippingOption: ShippingOption;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: 'INR';
}

export type PaymentStatus = 'REQUIRES_CONFIRMATION' | 'SUCCEEDED' | 'DECLINED';

export interface PaymentIntent {
  id: string;
  userId: string;
  amount: number;
  currency: 'INR';
  status: PaymentStatus;
  declineReason: string | null;
  updatedAt: string;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  city: string;
  postalCode: string;
}

export interface ShopOrder {
  id: string;
  userId: string;
  /** Client-generated key for the "place order" intent; a replay returns the original order. */
  idempotencyKey: string;
  paymentIntentId: string;
  address: ShippingAddress;
  quote: Quote;
  status: 'CONFIRMED';
  createdAt: string;
  updatedAt: string;
}
