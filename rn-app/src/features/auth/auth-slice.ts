import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError, request } from '@/core/api/http-client';
import { toSession, type Session, type TokenResponse } from './auth.model';
import { sessionStorage } from './session-storage';

/** Refresh slightly before expiry to avoid racing the server clock. */
const EXPIRY_SKEW_MS = 60_000;

interface AuthState {
  status: 'restoring' | 'signedOut' | 'signedIn';
  session: Session | null;
  error: string | null;
  submitting: boolean;
}

const initialState: AuthState = { status: 'restoring', session: null, error: null, submitting: false };

export const restoreSession = createAsyncThunk('auth/restore', async () => {
  const stored = await sessionStorage.read();
  if (!stored) return null;
  if (stored.expiresAt - EXPIRY_SKEW_MS > Date.now()) return stored;
  try {
    const refreshed = toSession(await request<TokenResponse>('/auth/refresh', { method: 'POST', body: { refreshToken: stored.refreshToken } }));
    await sessionStorage.write(refreshed);
    return refreshed;
  } catch (error) {
    // Offline: keep the stored session so cached data stays usable; the API will reject stale tokens later.
    if (error instanceof ApiError && error.isTransient) return stored;
    await sessionStorage.clear();
    return null;
  }
});

export const signIn = createAsyncThunk('auth/signIn', async ({ email, password }: { email: string; password: string }) => {
  const session = toSession(await request<TokenResponse>('/auth/login', { method: 'POST', body: { email, password } }));
  await sessionStorage.write(session);
  return session;
});

export const signOut = createAsyncThunk('auth/signOut', () => sessionStorage.clear());

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, { payload }) => {
        state.session = payload;
        state.status = payload ? 'signedIn' : 'signedOut';
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = 'signedOut';
      })
      .addCase(signIn.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, { payload }) => {
        state.session = payload;
        state.status = 'signedIn';
        state.submitting = false;
      })
      .addCase(signIn.rejected, (state, { error }) => {
        state.submitting = false;
        state.error = error.message === 'Invalid email or password' ? error.message : 'Unable to sign in. Check your connection and try again.';
      })
      .addCase(signOut.fulfilled, (state) => {
        state.session = null;
        state.status = 'signedOut';
      });
  },
});
