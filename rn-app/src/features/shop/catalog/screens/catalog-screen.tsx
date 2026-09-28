import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { describeError } from '@/core/api/error-message';
import { useDebouncedValue } from '@/core/hooks/use-debounced-value';
import { Banner } from '@/core/ui/banner';
import { OfflineBanner } from '@/core/ui/offline-banner';
import { colors, radius, spacing } from '@/core/ui/theme';
import { useGetCategoriesQuery, useGetProductsQuery } from '../../api/shop-api';
import type { Product } from '../../api/shop.model';
import { ProductCard } from '../components/product-card';

export function CatalogScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const products = useGetProductsQuery({ category, q });
  // Categories are an enhancement: if they fail to load, the chips are simply not shown.
  const { data: categories } = useGetCategoriesQuery();

  const open = useCallback((product: Product) => router.push({ pathname: '/shop/product/[id]', params: { id: product.id } }), []);

  return (
    <View style={styles.screen}>
      <OfflineBanner message="You are offline. Showing products from your last visit." />
      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          placeholder="Search products or brands"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search products"
        />
        {categories?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {['', ...categories].map((value) => (
              <Pressable
                key={value || 'all'}
                style={[styles.chip, category === value && styles.chipActive]}
                onPress={() => setCategory(value)}
                accessibilityRole="button"
                accessibilityState={{ selected: category === value }}
              >
                <Text style={[styles.chipLabel, category === value && styles.chipLabelActive]}>{value || 'All'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {products.error && !products.data ? (
        <Banner tone="danger" message={describeError(products.error)} actionLabel="Retry" onAction={() => void products.refetch()} />
      ) : null}

      {products.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : (
        <FlatList
          data={products.data ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ProductCard product={item} onPress={open} />}
          refreshControl={<RefreshControl refreshing={products.isFetching && !products.isLoading} onRefresh={() => void products.refetch()} />}
          ListEmptyComponent={products.data ? <Text style={styles.empty}>No products match your search.</Text> : null}
          initialNumToRender={6}
          windowSize={7}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  filters: { gap: spacing.sm, paddingTop: spacing.md },
  search: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, color: colors.text },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipLabelActive: { color: '#fff' },
  loading: { marginTop: spacing.xl },
  list: { padding: spacing.lg, gap: spacing.md },
  column: { gap: spacing.md },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
