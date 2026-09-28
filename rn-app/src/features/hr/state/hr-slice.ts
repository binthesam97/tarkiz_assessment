import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { ApiError, request } from '@/core/api/http-client';
import type { RootState } from '@/core/store/store';
import { attendanceQueue } from '../data/attendance-queue';
import { hrApi } from '../data/hr-api';
import type { QueuedAttendance } from '../data/hr.model';

export interface HrNotification {
  id: string;
  category: string;
  title: string;
  message: string;
  resource?: 'leave' | 'attendance';
  createdAt: string;
}

interface HrState {
  queuedAttendance: QueuedAttendance[];
  notifications: HrNotification[];
}

const MAX_NOTIFICATIONS = 50;

const initialState: HrState = { queuedAttendance: [], notifications: [] };

export const loadQueuedAttendance = createAsyncThunk('hr/loadQueue', () => attendanceQueue.list());

/** Online: send immediately. Offline or on a transient failure: queue and replay later. */
export const recordAttendance = createAsyncThunk('hr/recordAttendance', async (entry: QueuedAttendance, { getState, dispatch }) => {
  if ((getState() as RootState).connectivity.isOnline) {
    try {
      await dispatch(hrApi.endpoints.recordAttendance.initiate(entry)).unwrap();
      return { queued: false };
    } catch (error) {
      const status = (error as { status?: number | string }).status;
      if (typeof status === 'number' && status < 500) throw new Error('The server rejected this attendance entry.');
    }
  }
  await attendanceQueue.enqueue(entry);
  await dispatch(loadQueuedAttendance());
  return { queued: true };
});

export const flushAttendanceQueue = createAsyncThunk('hr/flushQueue', async (_arg, { dispatch }) => {
  for (const entry of await attendanceQueue.list()) {
    try {
      await request(`/attendance/${entry.action}`, { method: 'POST', body: { date: entry.date, timestamp: entry.timestamp } });
      await attendanceQueue.remove(entry.id);
    } catch (error) {
      if (error instanceof ApiError && !error.isTransient) {
        await attendanceQueue.remove(entry.id);
        continue;
      }
      break;
    }
  }
  dispatch(hrApi.util.invalidateTags(['Attendance']));
  await dispatch(loadQueuedAttendance());
});

export const hrSlice = createSlice({
  name: 'hr',
  initialState,
  reducers: {
    notificationReceived(state, action: PayloadAction<HrNotification>) {
      if (state.notifications.some((item) => item.id === action.payload.id)) return;
      state.notifications.unshift(action.payload);
      state.notifications.length = Math.min(state.notifications.length, MAX_NOTIFICATIONS);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadQueuedAttendance.fulfilled, (state, { payload }) => {
      state.queuedAttendance = payload.map(({ action, date, timestamp }) => ({ action, date, timestamp }));
    });
  },
});

export const { notificationReceived } = hrSlice.actions;
