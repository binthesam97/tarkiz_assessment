import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { describeError } from '@/core/api/error-message';
import { useAppSelector } from '@/core/store/hooks';
import { Banner } from '@/core/ui/banner';
import { colors, radius, spacing } from '@/core/ui/theme';
import { LoginScreen } from '@/features/auth/screens/login-screen';
import { useGetOrderQuery } from '../../api/shop-api';
import { formatPrice } from '../../api/shop.model';
import { OrderSummary } from '../../checkout/components/order-summary';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function OrderScreen({ id }: { id: string }) {
  const status = useAppSelector((state) => state.auth.status);
  if (status === 'restoring') return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  if (status !== 'signedIn') return <LoginScreen title="Sign in to see this order" />;
  return <OrderDetail id={id} />;
}

function OrderDetail({ id }: { id: string }) {
  const { data: order, error, isLoading, refetch } = useGetOrderQuery(id);

  if (isLoading) return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  if (!order) return <Banner tone="danger" message={describeError(error)} actionLabel="Retry" onAction={() => void refetch()} />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Order {order.id}</Text>
        <Text style={styles.status}>Confirmed · {dateFormatter.format(new Date(order.createdAt))}</Text>
        <Text style={styles.muted}>
          Delivering to {order.address.name}, {order.address.line1}, {order.address.city} {order.address.postalCode} ·{' '}
          {order.quote.shippingOption === 'EXPRESS' ? 'Express' : 'Standard'} delivery
        </Text>
      </View>
      <View style={styles.card}>
        {order.quote.lines.map((line) => (
          <View key={line.productId} style={styles.line}>
            <Text style={styles.lineName} numberOfLines={2}>{line.quantity} × {line.name}</Text>
            <Text style={styles.linePrice}>{formatPrice(line.lineTotal)}</Text>
          </View>
        ))}
      </View>
      <OrderSummary quote={order.quote} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  status: { fontSize: 14, fontWeight: '600', color: colors.success },
  muted: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  lineName: { flex: 1, fontSize: 14, color: colors.text },
  linePrice: { fontSize: 14, fontWeight: '600', color: colors.text },
});
