import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { env } from '@/core/config/env';
import type { RootState } from '@/core/store/store';
import type { AttendanceAction, AttendanceRecord, LeaveRequest, LeaveType } from './hr.model';

/**
 * RTK Query gives the HR screens request de-duplication, caching and
 * tag-based invalidation: a check-in mutation invalidates `Attendance`, so the
 * list refetches exactly once. Cached data is kept for 5 minutes after the
 * last subscriber unmounts.
 */
export const hrApi = createApi({
  reducerPath: 'hrApi',
  baseQuery: fetchBaseQuery({
    baseUrl: env.apiUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Attendance', 'Leave'],
  keepUnusedDataFor: 300,
  refetchOnReconnect: true,
  endpoints: (build) => ({
    getMyAttendance: build.query<AttendanceRecord[], void>({
      query: () => '/attendance/me',
      providesTags: ['Attendance'],
    }),
    recordAttendance: build.mutation<AttendanceRecord, { action: AttendanceAction; date: string; timestamp: string }>({
      query: ({ action, date, timestamp }) => ({ url: `/attendance/${action}`, method: 'POST', body: { date, timestamp } }),
      invalidatesTags: ['Attendance'],
    }),
    getMyLeaves: build.query<LeaveRequest[], void>({
      query: () => '/leaves/me',
      providesTags: ['Leave'],
    }),
    applyLeave: build.mutation<LeaveRequest, { type: LeaveType; from: string; to: string; reason: string }>({
      query: (body) => ({ url: '/leaves', method: 'POST', body }),
      invalidatesTags: ['Leave'],
    }),
  }),
});

export const { useGetMyAttendanceQuery, useRecordAttendanceMutation, useGetMyLeavesQuery, useApplyLeaveMutation } = hrApi;
