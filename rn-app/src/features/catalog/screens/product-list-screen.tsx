import { useCallback, useDeferredValue, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native';
import { Banner } from '@/core/ui/banner';
import { colors, radius, spacing } from '@/core/ui/theme';
import { PRODUCT_ROW_HEIGHT, ProductRow } from '../components/product-row';
import { RenderStats } from '../components/render-stats';
import type { CatalogItem } from '../data/catalog.model';
import { generateLocalCatalog } from '../data/local-catalog';
import { useDebouncedValue } from '@/core/hooks/use-debounced-value';
import { usePaginatedCatalog } from '../hooks/use-paginated-catalog';

type Mode = 'server' | 'local';

const CATALOG_SIZE = 50_000;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Two ways of showing 50,000 products:
 *
 * - server: infinite scroll over a paginated API. Memory grows with what the
 *   user actually scrolls through, not with the size of the catalog.
 * - local: the full 50k array in memory, to show that virtualisation alone
 *   keeps rendering cheap. Search runs on a deferred value so typing never blocks.
 */
export function ProductListScreen() {
  const [mode, setMode] = useState<Mode>('server');
  const [query, setQuery] = useState('');

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <View style={styles.segmented} accessibilityRole="tablist">
          {(['server', 'local'] as const).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === option }}
              style={[styles.segment, mode === option && styles.segmentActive]}
              onPress={() => setMode(option)}
            >
              <Text style={[styles.segmentText, mode === option && styles.segmentTextActive]}>
                {option === 'server' ? 'Paginated API' : 'All 50,000 in memory'}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search name, brand or SKU"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel="Search products"
        />
      </View>
      {mode === 'server' ? <ServerCatalog query={query} /> : <LocalCatalog query={query} />}
    </View>
  );
}

function ServerCatalog({ query }: { query: string }) {
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const { items, total, status, error, hasMore, refresh, loadMore, retry } = usePaginatedCatalog(debouncedQuery);

  if (status === 'loading' && items.length === 0) return <ActivityIndicator style={styles.loader} />;

  return (
    <>
      {status === 'error' ? <Banner tone="danger" message={error ?? 'Failed to load products'} actionLabel="Retry" onAction={retry} /> : null}
      <RenderStats mode="Paginated" loaded={items.length} total={total} />
      <ProductList
        // A new query starts a new result set; remounting resets the scroll position to the top.
        key={debouncedQuery}
        items={items}
        refreshing={status === 'refreshing'}
        onRefresh={refresh}
        onEndReached={loadMore}
        footer={status === 'loadingMore' ? <ActivityIndicator style={styles.footer} /> : !hasMore && items.length ? <Text style={styles.end}>End of catalog</Text> : null}
      />
    </>
  );
}

function LocalCatalog({ query }: { query: string }) {
  // Generated once per mount; useMemo keeps the 50k array referentially stable across renders.
  const catalog = useMemo(() => generateLocalCatalog(CATALOG_SIZE), []);
  const [refreshing, setRefreshing] = useState(false);

  // Keeps typing responsive: filtering 50k items renders at lower priority than the input.
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const filtered = useMemo(
    () => (deferredQuery ? catalog.filter((item) => item.name.toLowerCase().includes(deferredQuery) || item.brand.toLowerCase().includes(deferredQuery) || item.sku.toLowerCase().includes(deferredQuery)) : catalog),
    [catalog, deferredQuery],
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  return (
    <>
      <RenderStats mode="In memory" loaded={catalog.length} total={filtered.length} />
      <ProductList items={filtered} refreshing={refreshing} onRefresh={refresh} />
    </>
  );
}

interface ProductListProps {
  items: CatalogItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached?: () => void;
  footer?: ReactElement | null;
}

function ProductList({ items, refreshing, onRefresh, onEndReached, footer }: ProductListProps) {
  const openProduct = useCallback((item: CatalogItem) => Alert.alert(item.name, `${item.sku} · ${item.brand}`), []);
  const renderItem = useCallback<ListRenderItem<CatalogItem>>(({ item }) => <ProductRow item={item} onPress={openProduct} />, [openProduct]);

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // Fixed row height: FlatList can compute offsets without measuring, enabling instant jumps and cheap scrolling.
      getItemLayout={getItemLayout}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      // ~5 screens of content instead of the default 21, reducing memory and mount work.
      windowSize={5}
      removeClippedSubviews
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListFooterComponent={footer}
      ListEmptyComponent={<Text style={styles.end}>No products found.</Text>}
      keyboardDismissMode="on-drag"
    />
  );
}

const keyExtractor = (item: CatalogItem) => item.id;
const getItemLayout = (_: ArrayLike<CatalogItem> | null | undefined, index: number) => ({ length: PRODUCT_ROW_HEIGHT, offset: PRODUCT_ROW_HEIGHT * index, index });

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: { padding: spacing.lg, gap: spacing.md },
  segmented: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  segmentTextActive: { color: colors.text, fontWeight: '600' },
  search: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: spacing.md, fontSize: 15, color: colors.text },
  loader: { flex: 1 },
  footer: { paddingVertical: spacing.lg },
  end: { textAlign: 'center', color: colors.textMuted, padding: spacing.lg },
});
