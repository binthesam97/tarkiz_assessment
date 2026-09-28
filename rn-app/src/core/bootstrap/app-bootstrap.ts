import { setAccessTokenProvider } from '@/core/api/http-client';
import { startConnectivityListener } from '@/core/network/connectivity-listener';
import type { AppDispatch, RootState } from '@/core/store/store';
import { restoreSession } from '@/features/auth/auth-slice';
import { hydrateEmployees } from '@/features/employees/state/employees-slice';
import { loadQueuedAttendance } from '@/features/hr/state/hr-slice';
import { hydrateCart } from '@/features/shop';

/** App-wide start-up work. Returns a cleanup function. */
export function bootstrapApp(dispatch: AppDispatch, getState: () => RootState): () => void {
  setAccessTokenProvider(() => getState().auth.session?.accessToken ?? null);
  const stopConnectivity = startConnectivityListener(dispatch);
  void dispatch(restoreSession());
  void dispatch(hydrateEmployees());
  void dispatch(loadQueuedAttendance());
  void dispatch(hydrateCart());
  return () => stopConnectivity();
}
