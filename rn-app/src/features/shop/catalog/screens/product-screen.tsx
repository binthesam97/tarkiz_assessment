import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { describeError } from '@/core/api/error-message';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { Banner } from '@/core/ui/banner';
import { Button } from '@/core/ui/button';
import { colors, radius, spacing } from '@/core/ui/theme';
import { useGetProductQuery, useGetProductsQuery } from '../../api/shop-api';
import { formatPrice, type Product } from '../../api/shop.model';
import { QuantityStepper } from '../../cart/components/quantity-stepper';
import { MAX_QUANTITY, itemAdded, selectQuantityInCart } from '../../cart/state/cart-slice';

export function ProductScreen({ id }: { id: string }) {
  const dispatch = useAppDispatch();
  const { data: product, error, isLoading, refetch } = useGetProductQuery(id);
  const inCart = useAppSelector((state) => selectQuantityInCart(state, id));
  const [quantity, setQuantity] = useState(1);

  if (isLoading) return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  if (!product) return <Banner tone="danger" message={describeError(error)} actionLabel="Retry" onAction={() => void refetch()} />;

  const available = Math.max(0, Math.min(MAX_QUANTITY, product.stock) - inCart);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Image source={product.largeImageUrl} style={styles.image} cachePolicy="memory-disk" transition={150} accessibilityIgnoresInvertColors />
      <View style={styles.card}>
        <Text style={styles.brand}>{product.brand} · {product.category}</Text>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.rating}>★ {product.rating} · SKU {product.sku}</Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
        <Text style={[styles.stock, product.stock === 0 && styles.outOfStock]}>
          {product.stock === 0 ? 'Out of stock' : product.stock < 10 ? `Only ${product.stock} left` : 'In stock'}
        </Text>
        <Text style={styles.description}>{product.description}</Text>

        {available > 0 ? (
          <View style={styles.actions}>
            <QuantityStepper value={Math.min(quantity, available)} max={available} onChange={setQuantity} label={product.name} />
            <View style={styles.flex}>
              <Button title="Add to cart" onPress={() => dispatch(itemAdded(product, Math.min(quantity, available)))} />
            </View>
          </View>
        ) : null}
        {inCart ? <Button title={`In your cart (${inCart}) · View cart`} variant="secondary" onPress={() => router.push('/shop/cart')} /> : null}
      </View>
      <RelatedProducts product={product} />
    </ScrollView>
  );
}

/**
 * Secondary content degrades gracefully: if this request fails the section is hidden and the rest
 * of the page, including "Add to cart", keeps working.
 */
function RelatedProducts({ product }: { product: Product }) {
  const { data } = useGetProductsQuery({ category: product.category });
  const related = data?.filter((item) => item.id !== product.id).slice(0, 8);
  if (!related?.length) return null;

  return (
    <View style={styles.related}>
      <Text style={styles.relatedTitle}>More in {product.category}</Text>
      <FlatList
        horizontal
        data={related}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.relatedList}
        renderItem={({ item }) => (
          <Pressable style={styles.relatedItem} onPress={() => router.push({ pathname: '/shop/product/[id]', params: { id: item.id } })} accessibilityRole="button" accessibilityLabel={item.name}>
            <Image source={item.imageUrl} style={styles.relatedImage} recyclingKey={item.id} cachePolicy="memory-disk" />
            <Text style={styles.relatedName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.relatedPrice}>{formatPrice(item.price)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  content: { paddingBottom: spacing.xl, gap: spacing.lg },
  image: { width: '100%', aspectRatio: 1.2, backgroundColor: colors.border },
  card: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  brand: { fontSize: 13, color: colors.textMuted },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  rating: { fontSize: 13, color: colors.textMuted },
  price: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  stock: { fontSize: 14, fontWeight: '600', color: colors.success },
  outOfStock: { color: colors.danger },
  description: { fontSize: 15, lineHeight: 21, color: colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  flex: { flex: 1 },
  related: { gap: spacing.sm },
  relatedTitle: { fontSize: 16, fontWeight: '700', color: colors.text, paddingHorizontal: spacing.lg },
  relatedList: { paddingHorizontal: spacing.lg, gap: spacing.md },
  relatedItem: { width: 120, gap: 2 },
  relatedImage: { width: 120, height: 120, borderRadius: radius.md, backgroundColor: colors.border },
  relatedName: { fontSize: 13, color: colors.text },
  relatedPrice: { fontSize: 13, fontWeight: '700', color: colors.text },
});
