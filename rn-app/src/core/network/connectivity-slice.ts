import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ConnectivityState {
  isOnline: boolean;
  /** False until NetInfo reports its first state, so the UI does not flash "offline" at startup. */
  isKnown: boolean;
}

const initialState: ConnectivityState = { isOnline: true, isKnown: false };

export const connectivitySlice = createSlice({
  name: 'connectivity',
  initialState,
  reducers: {
    connectivityChanged(state, action: PayloadAction<boolean>) {
      state.isOnline = action.payload;
      state.isKnown = true;
    },
  },
});

export const { connectivityChanged } = connectivitySlice.actions;
