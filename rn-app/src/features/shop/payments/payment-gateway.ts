import { request } from '@/core/api/http-client';
import type { PaymentIntent } from '../api/shop.model';

export interface PaymentMethod {
  id: string;
  label: string;
  description: string;
}

/**
 * The seam between checkout and the payment provider. Production uses the provider's native SDK
 * (Stripe, Razorpay, Adyen) with Apple Pay / Google Pay; its payment sheet collects card details,
 * so card data never reaches this app or our servers (PCI DSS SAQ-A).
 */
export interface PaymentGateway {
  readonly methods: readonly PaymentMethod[];
  confirm(intent: PaymentIntent, paymentMethodId: string): Promise<PaymentIntent>;
}

/** Talks to the mock provider exposed by the demo backend; the methods mirror a provider's test tokens. */
export const mockPaymentGateway: PaymentGateway = {
  methods: [
    { id: 'pm_card_success', label: 'Visa ending 4242', description: 'Test card · approved' },
    { id: 'pm_card_declined', label: 'Mastercard ending 0002', description: 'Test card · declined' },
    { id: 'pm_card_insufficient_funds', label: 'Visa ending 9995', description: 'Test card · insufficient funds' },
  ],
  confirm: (intent, paymentMethodId) =>
    request<PaymentIntent>(`/shop/gateway/payment-intents/${encodeURIComponent(intent.id)}/confirm`, {
      method: 'POST',
      body: { paymentMethod: paymentMethodId },
    }),
};
