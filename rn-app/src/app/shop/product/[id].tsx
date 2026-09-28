import { useLocalSearchParams } from 'expo-router';
import { ProductScreen } from '@/features/shop';

export { RouteErrorBoundary as ErrorBoundary } from '@/core/ui/route-error';

export default function ProductRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Keyed so navigating between related products starts each page with fresh local state.
  return <ProductScreen key={id} id={id} />;
}
