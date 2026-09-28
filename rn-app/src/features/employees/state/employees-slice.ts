import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import type { RootState } from '@/core/store/store';
import type { Employee, EmployeeChanges } from '../data/employee.model';
import { employeeRepository } from '../data/employee-repository';
import { syncEmployees, type SyncConflict } from '../data/employee-sync';
import { syncMetadata } from '../data/sync-metadata';

export const employeesAdapter = createEntityAdapter<Employee>({
  sortComparer: (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
});

interface EmployeesState extends ReturnType<typeof employeesAdapter.getInitialState> {
  hydrated: boolean;
  syncStatus: 'idle' | 'syncing' | 'failed';
  syncError: string | null;
  lastSyncedAt: string | null;
  /** Ids with local edits that have not reached the server yet. */
  pendingIds: string[];
  conflicts: SyncConflict[];
}

const initialState: EmployeesState = employeesAdapter.getInitialState({
  hydrated: false,
  syncStatus: 'idle',
  syncError: null,
  lastSyncedAt: null,
  pendingIds: [],
  conflicts: [],
});

/** Loads the directory from SQLite — works without any network. */
export const hydrateEmployees = createAsyncThunk('employees/hydrate', async () => {
  const [employees, pendingIds, metadata] = await Promise.all([employeeRepository.getAll(), employeeRepository.pendingIds(), syncMetadata.read()]);
  return { employees, pendingIds, lastSyncedAt: metadata.syncedAt };
});

export const synchronizeEmployees = createAsyncThunk(
  'employees/sync',
  async () => {
    const result = await syncEmployees();
    const [employees, pendingIds] = await Promise.all([employeeRepository.getAll(), employeeRepository.pendingIds()]);
    return { result, employees, pendingIds };
  },
  {
    // Never run two syncs at once, and do not attempt one while offline.
    condition: (_arg, { getState }) => {
      const state = getState() as RootState;
      return state.employees.syncStatus !== 'syncing' && state.connectivity.isOnline;
    },
  },
);

/** Saves locally and queues for upload; the listener middleware triggers a sync when online. */
export const editEmployee = createAsyncThunk('employees/edit', async ({ id, changes }: { id: string; changes: EmployeeChanges }, { getState }) => {
  const current = (getState() as RootState).employees.entities[id];
  if (!current) throw new Error(`Employee ${id} is not loaded`);
  return employeeRepository.applyLocalChange(current, changes);
});

export const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    conflictsDismissed(state) {
      state.conflicts = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateEmployees.fulfilled, (state, { payload }) => {
        employeesAdapter.setAll(state, payload.employees);
        state.pendingIds = payload.pendingIds;
        state.lastSyncedAt = payload.lastSyncedAt;
        state.hydrated = true;
      })
      .addCase(hydrateEmployees.rejected, (state) => {
        state.hydrated = true;
      })
      .addCase(synchronizeEmployees.pending, (state) => {
        state.syncStatus = 'syncing';
        state.syncError = null;
      })
      .addCase(synchronizeEmployees.fulfilled, (state, { payload }) => {
        employeesAdapter.setAll(state, payload.employees);
        state.pendingIds = payload.pendingIds;
        state.lastSyncedAt = payload.result.syncedAt;
        state.conflicts.push(...payload.result.conflicts);
        state.syncStatus = 'idle';
      })
      .addCase(synchronizeEmployees.rejected, (state, { error }) => {
        state.syncStatus = 'failed';
        state.syncError = error.message ?? 'Sync failed';
      })
      .addCase(editEmployee.fulfilled, (state, { payload }) => {
        employeesAdapter.upsertOne(state, payload);
        if (!state.pendingIds.includes(payload.id)) state.pendingIds.push(payload.id);
      });
  },
});

export const { conflictsDismissed } = employeesSlice.actions;

export const employeeSelectors = employeesAdapter.getSelectors<RootState>((state) => state.employees);
