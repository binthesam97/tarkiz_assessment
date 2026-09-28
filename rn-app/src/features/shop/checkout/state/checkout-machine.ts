import type { Order, ShippingAddress, ShippingOption } from '../../api/shop.model';

export type CheckoutStep = 'address' | 'shipping' | 'payment' | 'confirming' | 'done' | 'failed';

export interface CheckoutState {
  step: CheckoutStep;
  address: ShippingAddress | null;
  shippingOption: ShippingOption;
  paymentMethodId: string | null;
  order: Order | null;
  error: string | null;
}

export type CheckoutEvent =
  | { type: 'ADDRESS_SUBMITTED'; address: ShippingAddress }
  | { type: 'SHIPPING_CHOSEN'; option: ShippingOption }
  | { type: 'PAY'; paymentMethodId: string }
  | { type: 'ORDER_CONFIRMED'; order: Order }
  | { type: 'FAILED'; error: string }
  | { type: 'RETRY' }
  | { type: 'BACK' };

/** Every legal transition. Anything not listed (e.g. paying twice, or going back mid-payment) is ignored. */
const TRANSITIONS: Record<CheckoutStep, Partial<Record<CheckoutEvent['type'], CheckoutStep>>> = {
  address: { ADDRESS_SUBMITTED: 'shipping' },
  shipping: { SHIPPING_CHOSEN: 'payment', BACK: 'address' },
  payment: { PAY: 'confirming', BACK: 'shipping' },
  confirming: { ORDER_CONFIRMED: 'done', FAILED: 'failed' },
  failed: { RETRY: 'payment' },
  done: {},
};

export const initialCheckoutState: CheckoutState = {
  step: 'address',
  address: null,
  shippingOption: 'STANDARD',
  paymentMethodId: null,
  order: null,
  error: null,
};

export function checkoutMachine(state: CheckoutState, event: CheckoutEvent): CheckoutState {
  const step = TRANSITIONS[state.step][event.type];
  if (!step) return state;

  switch (event.type) {
    case 'ADDRESS_SUBMITTED':
      return { ...state, step, address: event.address };
    case 'SHIPPING_CHOSEN':
      return { ...state, step, shippingOption: event.option };
    case 'PAY':
      return { ...state, step, paymentMethodId: event.paymentMethodId, error: null };
    case 'ORDER_CONFIRMED':
      return { ...state, step, order: event.order };
    case 'FAILED':
      return { ...state, step, error: event.error };
    case 'RETRY':
    case 'BACK':
      return { ...state, step };
  }
}
