/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Order } from '../../../api/shop.model';
import { checkoutMachine, initialCheckoutState, type CheckoutEvent, type CheckoutState } from '../checkout-machine';

const address = { name: 'Esha', line1: '1 MG Road', city: 'Kochi', postalCode: '682001' };
const order = { id: 'ORD-1' } as Order;

const run = (...events: CheckoutEvent[]): CheckoutState => events.reduce(checkoutMachine, initialCheckoutState);

describe('checkoutMachine', () => {
  it('walks the happy path from address to done', () => {
    const state = run(
      { type: 'ADDRESS_SUBMITTED', address },
      { type: 'SHIPPING_CHOSEN', option: 'EXPRESS' },
      { type: 'PAY', paymentMethodId: 'pm_card_success' },
      { type: 'ORDER_CONFIRMED', order },
    );
    assert.equal(state.step, 'done');
    assert.deepEqual(state.address, address);
    assert.equal(state.shippingOption, 'EXPRESS');
    assert.equal(state.order, order);
  });

  it('ignores events that are not valid in the current step', () => {
    assert.equal(run({ type: 'PAY', paymentMethodId: 'pm_card_success' }), initialCheckoutState);
    const confirming = run({ type: 'ADDRESS_SUBMITTED', address }, { type: 'SHIPPING_CHOSEN', option: 'STANDARD' }, { type: 'PAY', paymentMethodId: 'pm_card_success' });
    // A second tap on "Pay" or a back gesture while the payment is in flight changes nothing.
    assert.equal(checkoutMachine(confirming, { type: 'PAY', paymentMethodId: 'pm_card_declined' }), confirming);
    assert.equal(checkoutMachine(confirming, { type: 'BACK' }), confirming);
  });

  it('returns to payment after a failure and clears the error on the next attempt', () => {
    const failed = run(
      { type: 'ADDRESS_SUBMITTED', address },
      { type: 'SHIPPING_CHOSEN', option: 'STANDARD' },
      { type: 'PAY', paymentMethodId: 'pm_card_declined' },
      { type: 'FAILED', error: 'Your card was declined.' },
    );
    assert.equal(failed.step, 'failed');
    assert.equal(failed.error, 'Your card was declined.');

    const retried = run(
      { type: 'ADDRESS_SUBMITTED', address },
      { type: 'SHIPPING_CHOSEN', option: 'STANDARD' },
      { type: 'PAY', paymentMethodId: 'pm_card_declined' },
      { type: 'FAILED', error: 'Your card was declined.' },
      { type: 'RETRY' },
      { type: 'PAY', paymentMethodId: 'pm_card_success' },
    );
    assert.equal(retried.step, 'confirming');
    assert.equal(retried.error, null);
  });

  it('allows going back to earlier steps before payment starts', () => {
    const state = run({ type: 'ADDRESS_SUBMITTED', address }, { type: 'SHIPPING_CHOSEN', option: 'STANDARD' }, { type: 'BACK' }, { type: 'BACK' });
    assert.equal(state.step, 'address');
    assert.deepEqual(state.address, address);
  });

  it('is terminal once the order is confirmed', () => {
    const done = run(
      { type: 'ADDRESS_SUBMITTED', address },
      { type: 'SHIPPING_CHOSEN', option: 'STANDARD' },
      { type: 'PAY', paymentMethodId: 'pm_card_success' },
      { type: 'ORDER_CONFIRMED', order },
    );
    assert.equal(checkoutMachine(done, { type: 'BACK' }), done);
    assert.equal(checkoutMachine(done, { type: 'RETRY' }), done);
  });
});
