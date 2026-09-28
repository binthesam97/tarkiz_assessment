import { useLocalSearchParams } from 'expo-router';
import { OrderScreen } from '@/features/shop';

export { RouteErrorBoundary as ErrorBoundary } from '@/core/ui/route-error';

export default function OrderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderScreen id={id} />;
}
