import * as Crypto from 'expo-crypto';
import { ApiError, request } from '@/core/api/http-client';
import { withRetry } from '@/core/api/retry';
import type { CartLineInput, Order, PaymentIntent, ShippingAddress, ShippingOption } from '../../api/shop.model';
import { mockPaymentGateway, type PaymentGateway } from '../../payments/payment-gateway';

export class PaymentDeclinedError extends Error {}

/** The order may or may not exist; the customer must not be asked to pay again. */
export class OrderUnconfirmedError extends Error {}

export interface PlaceOrderInput {
  items: CartLineInput[];
  shippingOption: ShippingOption;
  address: ShippingAddress;
  paymentMethodId: string;
}

/**
 * One checkout attempt, from "Pay" until an order exists. It keeps two things across retries:
 *
 * - the idempotency key, generated once per checkout, so resubmitting can never create a second order;
 * - the payment intent, so a retry after a successful payment reuses it instead of charging again.
 */
export function createCheckoutSession(gateway: PaymentGateway = mockPaymentGateway) {
  const idempotencyKey = Crypto.randomUUID();
  let intent: PaymentIntent | null = null;

  const submitOrder = (input: PlaceOrderInput, paymentIntentId: string) =>
    request<Order>('/shop/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: { items: input.items, shippingOption: input.shippingOption, address: input.address, paymentIntentId },
    });

  /** After a timeout the request may still have succeeded; ask the server before reporting failure. */
  const findPlacedOrder = async () => {
    const orders = await request<Order[]>('/shop/orders', { query: { idempotencyKey } }).catch(() => []);
    return orders[0] ?? null;
  };

  return {
    idempotencyKey,

    async placeOrder(input: PlaceOrderInput): Promise<Order> {
      // The server prices the cart; the client never tells it how much to charge.
      intent ??= await withRetry(() =>
        request<PaymentIntent>('/shop/payment-intents', { method: 'POST', body: { items: input.items, shippingOption: input.shippingOption } }),
      );

      if (intent.status !== 'SUCCEEDED') {
        const result = await gateway.confirm(intent, input.paymentMethodId);
        if (result.status === 'DECLINED') throw new PaymentDeclinedError(result.declineReason ?? 'The payment was declined.');
        intent = result;
      }

      const paymentIntentId = intent.id;
      try {
        // Safe to retry: the idempotency key makes a repeated request return the original order.
        return await withRetry(() => submitOrder(input, paymentIntentId));
      } catch (error) {
        if (!(error instanceof ApiError) || !error.isTransient) throw error;
        const placed = await findPlacedOrder();
        if (placed) return placed;
        throw new OrderUnconfirmedError('We could not confirm your order. Your payment is safe, and trying again will not charge you twice.');
      }
    },
  };
}

export type CheckoutSession = ReturnType<typeof createCheckoutSession>;
