import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { connectivitySlice } from '@/core/network/connectivity-slice';
import { authSlice } from '@/features/auth/auth-slice';
import { chatSlice } from '@/features/chat/state/chat-slice';
import { employeesSlice } from '@/features/employees/state/employees-slice';
import { hrApi } from '@/features/hr/data/hr-api';
import { hrSlice } from '@/features/hr/state/hr-slice';
import { cartSlice, shopApi } from '@/features/shop';
import { listenerMiddleware } from './listener-middleware';

const rootReducer = combineReducers({
  auth: authSlice.reducer,
  cart: cartSlice.reducer,
  chat: chatSlice.reducer,
  connectivity: connectivitySlice.reducer,
  employees: employeesSlice.reducer,
  hr: hrSlice.reducer,
  [hrApi.reducerPath]: hrApi.reducer,
  [shopApi.reducerPath]: shopApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) =>
    getDefault({
      // Dev-only invariant checks walk the whole state on every action; skip the high-volume chat slice
      // so load tests measure the app rather than the tooling. Production builds disable them anyway.
      serializableCheck: { ignoredPaths: ['chat'] },
      immutableCheck: { ignoredPaths: ['chat'] },
    })
      .prepend(listenerMiddleware.middleware)
      .concat(hrApi.middleware, shopApi.middleware),
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
