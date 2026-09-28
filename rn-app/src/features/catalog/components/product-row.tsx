import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/core/ui/theme';
import type { CatalogItem } from '../data/catalog.model';

export const PRODUCT_ROW_HEIGHT = 88;

const priceFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

interface ProductRowProps {
  item: CatalogItem;
  onPress: (item: CatalogItem) => void;
}

/**
 * Memoised with stable props (`item` references never change and `onPress`
 * is a useCallback), so a row re-renders only when its own data changes.
 * Fixed height enables getItemLayout.
 */
export const ProductRow = memo(function ProductRow({ item, onPress }: ProductRowProps) {
  return (
    <Pressable style={styles.row} onPress={() => onPress(item)} accessibilityRole="button" accessibilityLabel={`${item.name}, ${priceFormatter.format(item.price)}`}>
      <Image
        source={item.imageUrl}
        style={styles.image}
        // Lets expo-image reuse native views as FlatList recycles rows.
        recyclingKey={item.id}
        cachePolicy="memory-disk"
        transition={100}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{item.brand} · {item.category} · ★ {item.rating}</Text>
        <Text style={styles.price}>{priceFormatter.format(item.price)}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { height: PRODUCT_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  image: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.background },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  price: { fontSize: 14, fontWeight: '700', color: colors.text },
});
