import { getDatabase, writeTransaction } from '@/core/db/database';
import type { Employee, EmployeeChanges } from './employee.model';

interface EmployeeRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  location: string;
  version: number;
  updated_at: string;
}

export interface OutboxEntry {
  id: number;
  entityId: string;
  changes: EmployeeChanges;
  baseVersion: number;
  attempts: number;
}

const ENTITY = 'employee';

const toEmployee = (row: EmployeeRow): Employee => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  department: row.department,
  designation: row.designation,
  location: row.location,
  version: row.version,
  updatedAt: row.updated_at,
});

const UPSERT_SQL = `
  INSERT INTO employees (id, first_name, last_name, email, phone, department, designation, location, version, updated_at)
  VALUES ($id, $firstName, $lastName, $email, $phone, $department, $designation, $location, $version, $updatedAt)
  ON CONFLICT(id) DO UPDATE SET
    first_name = excluded.first_name, last_name = excluded.last_name, email = excluded.email,
    phone = excluded.phone, department = excluded.department, designation = excluded.designation,
    location = excluded.location, version = excluded.version, updated_at = excluded.updated_at`;

/** Local persistence for the employee directory: the SQLite table is the offline source of truth. */
export const employeeRepository = {
  async getAll(): Promise<Employee[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<EmployeeRow>('SELECT * FROM employees ORDER BY first_name, last_name');
    return rows.map(toEmployee);
  },

  /**
   * Stores server records. Rows with unsynced local edits are skipped so a pull
   * never overwrites work the user has not uploaded yet.
   */
  async upsertFromServer(employees: Employee[]): Promise<void> {
    if (!employees.length) return;
    await writeTransaction(async (txn) => {
      const pending = new Set(
        (await txn.getAllAsync<{ entity_id: string }>('SELECT DISTINCT entity_id FROM outbox WHERE entity = ?', ENTITY)).map((row) => row.entity_id),
      );
      const statement = await txn.prepareAsync(UPSERT_SQL);
      try {
        for (const employee of employees) {
          if (pending.has(employee.id)) continue;
          await statement.executeAsync(toParams(employee));
        }
      } finally {
        await statement.finalizeAsync();
      }
    });
  },

  /** Replaces a local row unconditionally (used when resolving a conflict in favour of the server). */
  async overwrite(employee: Employee): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(UPSERT_SQL, toParams(employee));
  },

  /**
   * Applies an edit locally and queues it for upload, atomically. Consecutive
   * edits to the same record are coalesced into one outbox entry that keeps
   * the original base version, so the server sees a single change.
   */
  async applyLocalChange(employee: Employee, changes: EmployeeChanges): Promise<Employee> {
    const updated: Employee = { ...employee, ...changes };
    await writeTransaction(async (txn) => {
      await txn.runAsync('UPDATE employees SET phone = ?, designation = ?, location = ? WHERE id = ?', updated.phone, updated.designation, updated.location, employee.id);
      const existing = await txn.getFirstAsync<{ id: number; payload: string }>('SELECT id, payload FROM outbox WHERE entity = ? AND entity_id = ?', ENTITY, employee.id);
      if (existing) {
        const merged = { ...(JSON.parse(existing.payload) as EmployeeChanges), ...changes };
        await txn.runAsync('UPDATE outbox SET payload = ? WHERE id = ?', JSON.stringify(merged), existing.id);
      } else {
        await txn.runAsync(
          'INSERT INTO outbox (entity, entity_id, operation, payload, base_version, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ENTITY, employee.id, 'update', JSON.stringify(changes), employee.version, new Date().toISOString(),
        );
      }
    });
    return updated;
  },

  async getOutbox(): Promise<OutboxEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: number; entity_id: string; payload: string; base_version: number; attempts: number }>(
      'SELECT id, entity_id, payload, base_version, attempts FROM outbox WHERE entity = ? ORDER BY id', ENTITY,
    );
    return rows.map((row) => ({ id: row.id, entityId: row.entity_id, changes: JSON.parse(row.payload) as EmployeeChanges, baseVersion: row.base_version, attempts: row.attempts }));
  },

  async pendingIds(): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ entity_id: string }>('SELECT DISTINCT entity_id FROM outbox WHERE entity = ?', ENTITY);
    return rows.map((row) => row.entity_id);
  },

  /** Removes a delivered entry and stores the server's copy in one transaction. */
  async completeOutboxEntry(entryId: number, confirmed: Employee): Promise<void> {
    await writeTransaction(async (txn) => {
      await txn.runAsync('DELETE FROM outbox WHERE id = ?', entryId);
      await txn.runAsync(UPSERT_SQL, toParams(confirmed));
    });
  },

  async discardOutboxEntry(entryId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM outbox WHERE id = ?', entryId);
  },

  async recordFailedAttempt(entryId: number, error: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?', error, entryId);
  },
};

function toParams(employee: Employee) {
  return {
    $id: employee.id,
    $firstName: employee.firstName,
    $lastName: employee.lastName,
    $email: employee.email,
    $phone: employee.phone,
    $department: employee.department,
    $designation: employee.designation,
    $location: employee.location,
    $version: employee.version,
    $updatedAt: employee.updatedAt,
  };
}
