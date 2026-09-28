import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/core/ui/theme';
import { formatPrice, type Quote } from '../../api/shop.model';

interface OrderSummaryProps {
  quote: Quote | undefined;
  updating?: boolean;
}

/** Renders server-calculated totals. The app never adds up prices itself. */
export function OrderSummary({ quote, updating = false }: OrderSummaryProps) {
  if (!quote) {
    return (
      <View style={[styles.card, styles.loading]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return (
    <View style={[styles.card, updating && styles.stale]} accessibilityLabel={`Order total ${formatPrice(quote.total)}`}>
      <Row label="Subtotal" value={formatPrice(quote.subtotal)} />
      <Row label="Delivery" value={quote.shipping ? formatPrice(quote.shipping) : 'Free'} />
      <Row label="GST (18%)" value={formatPrice(quote.tax)} />
      <View style={styles.divider} />
      <Row label="Total" value={formatPrice(quote.total)} strong />
    </View>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.value, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  loading: { alignItems: 'center', paddingVertical: spacing.xl },
  stale: { opacity: 0.6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 14, color: colors.textMuted },
  value: { fontSize: 14, color: colors.text },
  strong: { fontSize: 16, fontWeight: '700', color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xs },
});
