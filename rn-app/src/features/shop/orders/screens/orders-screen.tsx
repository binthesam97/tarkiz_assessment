import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { describeError } from '@/core/api/error-message';
import { useAppSelector } from '@/core/store/hooks';
import { Banner } from '@/core/ui/banner';
import { colors, radius, spacing } from '@/core/ui/theme';
import { LoginScreen } from '@/features/auth/screens/login-screen';
import { useGetOrdersQuery } from '../../api/shop-api';
import { formatPrice } from '../../api/shop.model';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function OrdersScreen() {
  const status = useAppSelector((state) => state.auth.status);
  if (status === 'restoring') return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  if (status !== 'signedIn') return <LoginScreen title="Sign in to see your orders" />;
  return <Orders />;
}

function Orders() {
  const { data, error, isLoading, isFetching, refetch } = useGetOrdersQuery();

  if (isLoading) return <ActivityIndicator style={styles.loading} color={colors.accent} />;

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(order) => order.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />}
      ListHeaderComponent={error ? <Banner tone="danger" message={describeError(error)} actionLabel="Retry" onAction={() => void refetch()} /> : null}
      ListEmptyComponent={data ? <Text style={styles.empty}>You have not placed any orders yet.</Text> : null}
      renderItem={({ item: order }) => (
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => router.push({ pathname: '/shop/orders/[id]', params: { id: order.id } })}
          accessibilityRole="button"
        >
          <View style={styles.row}>
            <Text style={styles.id}>{order.id}</Text>
            <Text style={styles.status}>{order.status === 'CONFIRMED' ? 'Confirmed' : order.status}</Text>
          </View>
          <Text style={styles.meta}>{dateFormatter.format(new Date(order.createdAt))} · {order.quote.lines.length} item(s)</Text>
          <Text style={styles.total}>{formatPrice(order.quote.total)}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs },
  pressed: { opacity: 0.75 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  id: { fontSize: 15, fontWeight: '700', color: colors.text },
  status: { fontSize: 13, fontWeight: '600', color: colors.success },
  meta: { fontSize: 13, color: colors.textMuted },
  total: { fontSize: 15, fontWeight: '600', color: colors.text },
});
