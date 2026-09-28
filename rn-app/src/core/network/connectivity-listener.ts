import NetInfo from '@react-native-community/netinfo';
import { connectivityChanged } from './connectivity-slice';
import type { AppDispatch } from '@/core/store/store';

/**
 * Bridges NetInfo into Redux. `isInternetReachable` is null while unknown;
 * treat that as online so a slow reachability probe does not block syncing.
 */
export function startConnectivityListener(dispatch: AppDispatch): () => void {
  return NetInfo.addEventListener((state) => {
    dispatch(connectivityChanged(Boolean(state.isConnected) && state.isInternetReachable !== false));
  });
}
