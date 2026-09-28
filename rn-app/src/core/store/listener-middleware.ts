import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { connectivityChanged } from '@/core/network/connectivity-slice';
import { editEmployee, hydrateEmployees, synchronizeEmployees } from '@/features/employees/state/employees-slice';
import { flushAttendanceQueue } from '@/features/hr/state/hr-slice';
import { cartStorage } from '@/features/shop';
import type { AppDispatch, RootState } from './store';

export const listenerMiddleware = createListenerMiddleware();
const startListening = listenerMiddleware.startListening.withTypes<RootState, AppDispatch>();

/** Sync the directory when the device comes back online, after start-up hydration, and after a local edit. */
startListening({
  matcher: isAnyOf(connectivityChanged, hydrateEmployees.fulfilled, editEmployee.fulfilled),
  effect: async (action, api) => {
    const { connectivity, employees } = api.getState();
    if (!connectivity.isOnline || !employees.hydrated) return;
    // Only an offline → online transition should trigger a sync, not repeated "still online" events.
    const before = api.getOriginalState().connectivity;
    if (connectivityChanged.match(action) && before.isKnown && before.isOnline) return;
    // Debounce bursts (rapid edits, flapping connectivity).
    api.cancelActiveListeners();
    await api.delay(500);
    void api.dispatch(synchronizeEmployees());
  },
});

/** Replay attendance recorded offline as soon as the device reconnects. */
startListening({
  actionCreator: connectivityChanged,
  effect: async (action, api) => {
    const before = api.getOriginalState().connectivity;
    if (!action.payload || (before.isKnown && before.isOnline) || !api.getState().auth.session) return;
    await api.dispatch(flushAttendanceQueue());
  },
});

/** Persist the cart after it changes, coalescing a burst of quantity taps into a single write. */
startListening({
  predicate: (_action, current, previous) => current.cart.hydrated && current.cart.lines !== previous.cart.lines,
  effect: async (_action, api) => {
    api.cancelActiveListeners();
    await api.delay(300);
    await cartStorage.write(Object.values(api.getState().cart.lines));
  },
});
