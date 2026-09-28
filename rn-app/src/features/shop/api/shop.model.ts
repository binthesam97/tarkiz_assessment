/** Contracts for the storefront API. In production these are generated from the backend's OpenAPI spec. */

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  rating: number;
  imageUrl: string;
  largeImageUrl: string;
  description: string;
  stock: number;
}

export type ShippingOption = 'STANDARD' | 'EXPRESS';

export interface CartLineInput {
  productId: string;
  quantity: number;
}

export interface QuoteRequest {
  items: CartLineInput[];
  shippingOption: ShippingOption;
}

export interface QuoteLine {
  productId: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Quote {
  lines: QuoteLine[];
  shippingOption: ShippingOption;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: 'INR';
}

export interface ShippingAddress {
  name: string;
  line1: string;
  city: string;
  postalCode: string;
}

export type PaymentStatus = 'REQUIRES_CONFIRMATION' | 'SUCCEEDED' | 'DECLINED';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: 'INR';
  status: PaymentStatus;
  declineReason: string | null;
}

export interface Order {
  id: string;
  idempotencyKey: string;
  address: ShippingAddress;
  quote: Quote;
  status: 'CONFIRMED';
  createdAt: string;
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
export const formatPrice = (amount: number) => currency.format(amount);
