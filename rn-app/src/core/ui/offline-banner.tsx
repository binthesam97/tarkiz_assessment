import { useAppSelector } from '@/core/store/hooks';
import { Banner } from './banner';

export function OfflineBanner({ message = 'You are offline. Changes are saved on this device and will sync automatically.' }: { message?: string }) {
  const isOffline = useAppSelector((state) => state.connectivity.isKnown && !state.connectivity.isOnline);
  return isOffline ? <Banner tone="warning" message={message} /> : null;
}
