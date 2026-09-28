import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/core/ui/theme';
import { formatPrice, type Product } from '../../api/shop.model';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

export const ProductCard = memo(function ProductCard({ product, onPress }: ProductCardProps) {
  const outOfStock = product.stock === 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(product)}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatPrice(product.price)}${outOfStock ? ', out of stock' : ''}`}
    >
      <Image source={product.largeImageUrl} style={styles.image} recyclingKey={product.id} cachePolicy="memory-disk" transition={100} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{product.brand} · ★ {product.rating}</Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
        {outOfStock ? <Text style={styles.stock}>Out of stock</Text> : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  pressed: { opacity: 0.75 },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
  body: { padding: spacing.md, gap: 2 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text, minHeight: 36 },
  meta: { fontSize: 12, color: colors.textMuted },
  price: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  stock: { fontSize: 12, fontWeight: '600', color: colors.danger },
});
