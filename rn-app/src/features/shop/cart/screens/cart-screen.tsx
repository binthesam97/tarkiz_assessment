import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { describeError } from '@/core/api/error-message';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { Banner } from '@/core/ui/banner';
import { Button } from '@/core/ui/button';
import { colors, radius, spacing } from '@/core/ui/theme';
import { useGetQuoteQuery } from '../../api/shop-api';
import { formatPrice } from '../../api/shop.model';
import { OrderSummary } from '../../checkout/components/order-summary';
import { QuantityStepper } from '../components/quantity-stepper';
import { MAX_QUANTITY, itemRemoved, quantityChanged, selectCartItems, selectCartLines } from '../state/cart-slice';

export function CartScreen() {
  const dispatch = useAppDispatch();
  const lines = useAppSelector(selectCartLines);
  const items = useAppSelector(selectCartItems);
  const quote = useGetQuoteQuery({ items, shippingOption: 'STANDARD' }, { skip: items.length === 0 });

  if (lines.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Button title="Browse products" onPress={() => router.dismissTo('/shop')} />
      </View>
    );
  }

  const unitPrices = new Map(quote.data?.lines.map((line) => [line.productId, line.unitPrice]));
  // Show the latest successful quote while a new one loads, but never let checkout start on a failed one.
  const quoteFailed = Boolean(quote.error) && !quote.isFetching;

  return (
    <FlatList
      data={lines}
      keyExtractor={(line) => line.productId}
      contentContainerStyle={styles.list}
      renderItem={({ item: line }) => (
        <View style={styles.line}>
          <Image source={line.imageUrl} style={styles.image} recyclingKey={line.productId} cachePolicy="memory-disk" />
          <View style={styles.lineBody}>
            <Text style={styles.name} numberOfLines={2}>{line.name}</Text>
            <Text style={styles.price}>{formatPrice(unitPrices.get(line.productId) ?? line.price)}</Text>
            <View style={styles.lineActions}>
              <QuantityStepper
                value={line.quantity}
                max={MAX_QUANTITY}
                label={line.name}
                onChange={(quantity) => dispatch(quantityChanged({ productId: line.productId, quantity }))}
              />
              <Pressable onPress={() => dispatch(itemRemoved(line.productId))} accessibilityRole="button" accessibilityLabel={`Remove ${line.name}`} hitSlop={8}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      ListFooterComponent={
        <View style={styles.footer}>
          {quoteFailed ? <Banner tone="danger" message={describeError(quote.error)} actionLabel="Retry" onAction={() => void quote.refetch()} /> : null}
          <OrderSummary quote={quote.data} updating={quote.isFetching} />
          <Text style={styles.note}>Prices and stock are confirmed by the store when you check out.</Text>
          <Button title="Proceed to checkout" onPress={() => router.push('/shop/checkout')} disabled={quoteFailed || !quote.data} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  list: { padding: spacing.lg, gap: spacing.md },
  line: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  image: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.border },
  lineBody: { flex: 1, gap: spacing.xs },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  price: { fontSize: 14, color: colors.text },
  lineActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  remove: { fontSize: 14, fontWeight: '600', color: colors.danger },
  footer: { gap: spacing.md, marginTop: spacing.sm },
  note: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
