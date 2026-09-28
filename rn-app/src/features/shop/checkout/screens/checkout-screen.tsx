import { router } from 'expo-router';
import { useReducer, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { describeError } from '@/core/api/error-message';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { Banner } from '@/core/ui/banner';
import { Button } from '@/core/ui/button';
import { KeyboardAvoidingScreen } from '@/core/ui/keyboard-avoiding-screen';
import { colors, radius, spacing } from '@/core/ui/theme';
import { LoginScreen } from '@/features/auth/screens/login-screen';
import { shopApi, useGetQuoteQuery } from '../../api/shop-api';
import { formatPrice, type ShippingAddress, type ShippingOption } from '../../api/shop.model';
import { selectCartItems } from '../../cart/state/cart-slice';
import { mockPaymentGateway } from '../../payments/payment-gateway';
import { orderPlaced } from '../../shop-events';
import { AddressForm } from '../components/address-form';
import { ChoiceRow } from '../components/choice-row';
import { OrderSummary } from '../components/order-summary';
import { checkoutMachine, initialCheckoutState, type CheckoutStep } from '../state/checkout-machine';
import { createCheckoutSession, PaymentDeclinedError } from '../state/checkout-session';

const STEPS: { step: CheckoutStep; label: string }[] = [
  { step: 'address', label: 'Address' },
  { step: 'shipping', label: 'Delivery' },
  { step: 'payment', label: 'Payment' },
];

/** Stands in for the customer's saved address book, so the demo checkout needs no typing. */
const SAVED_ADDRESS: Omit<ShippingAddress, 'name'> = { line1: '12 MG Road, Ravipuram', city: 'Kochi', postalCode: '682016' };

const SHIPPING_OPTIONS: { value: ShippingOption; title: string; detail: string }[] = [
  { value: 'STANDARD', title: 'Standard delivery', detail: '3–5 days · free on orders over ₹2,000' },
  { value: 'EXPRESS', title: 'Express delivery', detail: 'Next day' },
];

export function CheckoutScreen() {
  const status = useAppSelector((state) => state.auth.status);
  if (status === 'restoring') return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  if (status !== 'signedIn') return <LoginScreen title="Sign in to check out" subtitle="Your cart is saved on this device and will be here after you sign in." />;
  return <Checkout />;
}

function Checkout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.session!.user);
  const items = useAppSelector(selectCartItems);
  const [state, send] = useReducer(checkoutMachine, initialCheckoutState);
  // One session per checkout: its idempotency key and payment intent survive retries.
  const [session] = useState(createCheckoutSession);
  const [paymentMethodId, setPaymentMethodId] = useState(mockPaymentGateway.methods[0]!.id);
  const [shippingOption, setShippingOption] = useState<ShippingOption>(state.shippingOption);

  const isDone = state.step === 'done';
  const quote = useGetQuoteQuery({ items, shippingOption: state.step === 'shipping' ? shippingOption : state.shippingOption }, { skip: items.length === 0 || isDone });

  const pay = async () => {
    send({ type: 'PAY', paymentMethodId });
    try {
      const order = await session.placeOrder({ items, shippingOption: state.shippingOption, address: state.address!, paymentMethodId });
      send({ type: 'ORDER_CONFIRMED', order });
      dispatch(orderPlaced(order));
      dispatch(shopApi.util.invalidateTags([{ type: 'Order', id: 'LIST' }]));
    } catch (error) {
      send({ type: 'FAILED', error: error instanceof PaymentDeclinedError ? `${error.message} Choose another payment method.` : describeError(error) });
    }
  };

  if (isDone && state.order) {
    const order = state.order;
    return (
      <View style={styles.done}>
        <Text style={styles.doneTitle}>Order placed</Text>
        <Text style={styles.doneBody}>
          Order {order.id} for {formatPrice(order.quote.total)} is confirmed. We will notify you when it ships.
        </Text>
        <Button title="View order" onPress={() => router.replace({ pathname: '/shop/orders/[id]', params: { id: order.id } })} />
        <Button title="Continue shopping" variant="secondary" onPress={() => router.dismissTo('/shop')} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.done}>
        <Text style={styles.doneTitle}>Your cart is empty</Text>
        <Button title="Browse products" onPress={() => router.dismissTo('/shop')} />
      </View>
    );
  }

  const activeIndex = STEPS.findIndex(({ step }) => step === state.step);

  return (
    <KeyboardAvoidingScreen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.steps} accessibilityRole="progressbar" accessibilityLabel={`Step ${activeIndex + 1} of ${STEPS.length}`}>
          {STEPS.map(({ step, label }, index) => {
            const reached = activeIndex === -1 || index <= activeIndex;
            return (
              <View key={step} style={styles.stepItem}>
                <View style={[styles.stepBar, reached && styles.stepBarActive]} />
                <Text style={[styles.stepLabel, reached && styles.stepLabelActive]}>{label}</Text>
              </View>
            );
          })}
        </View>

        {state.step === 'address' ? (
          <AddressForm initial={state.address ?? { name: user.name, ...SAVED_ADDRESS }} onSubmit={(address) => send({ type: 'ADDRESS_SUBMITTED', address })} />
        ) : null}

        {state.step === 'shipping' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivering to {state.address!.name}</Text>
            <Text style={styles.muted}>{state.address!.line1}, {state.address!.city} {state.address!.postalCode}</Text>
            {SHIPPING_OPTIONS.map((option) => (
              <ChoiceRow key={option.value} title={option.title} detail={option.detail} selected={shippingOption === option.value} onPress={() => setShippingOption(option.value)} />
            ))}
            <Button title="Continue to payment" onPress={() => send({ type: 'SHIPPING_CHOSEN', option: shippingOption })} disabled={!quote.data || quote.isFetching} />
            <Button title="Change address" variant="secondary" onPress={() => send({ type: 'BACK' })} />
          </View>
        ) : null}

        {state.step === 'payment' || state.step === 'failed' ? (
          <View style={styles.section}>
            {state.error ? <Banner tone="danger" message={state.error} /> : null}
            <Text style={styles.sectionTitle}>Payment method</Text>
            {mockPaymentGateway.methods.map((method) => (
              <ChoiceRow
                key={method.id}
                title={method.label}
                detail={method.description}
                selected={paymentMethodId === method.id}
                onPress={() => {
                  setPaymentMethodId(method.id);
                  if (state.step === 'failed') send({ type: 'RETRY' });
                }}
              />
            ))}
            {state.step === 'failed' ? (
              <Button title="Try again" onPress={() => send({ type: 'RETRY' })} />
            ) : (
              <>
                <Button title={quote.data ? `Pay ${formatPrice(quote.data.total)}` : 'Pay'} onPress={() => void pay()} disabled={!quote.data || quote.isFetching} />
                <Button title="Change delivery" variant="secondary" onPress={() => send({ type: 'BACK' })} />
              </>
            )}
          </View>
        ) : null}

        {state.step === 'confirming' ? (
          <View style={styles.confirming} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.muted}>Confirming payment and placing your order…</Text>
          </View>
        ) : null}

        {quote.error && !quote.isFetching ? <Banner tone="danger" message={describeError(quote.error)} actionLabel="Back to cart" onAction={() => router.back()} /> : null}
        <OrderSummary quote={quote.data} updating={quote.isFetching} />
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  content: { padding: spacing.lg, gap: spacing.lg },
  steps: { flexDirection: 'row', gap: spacing.sm },
  stepItem: { flex: 1, gap: spacing.xs },
  stepBar: { height: 4, borderRadius: radius.pill, backgroundColor: colors.border },
  stepBarActive: { backgroundColor: colors.accent },
  stepLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  stepLabelActive: { color: colors.accent },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  confirming: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  done: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  doneTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  doneBody: { fontSize: 15, lineHeight: 21, color: colors.textMuted },
});
