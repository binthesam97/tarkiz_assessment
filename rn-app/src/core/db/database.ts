import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './migrations';

const DATABASE_NAME = 'tarkiz.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Lazily opens the database and applies pending migrations. A module-level
 * singleton (rather than SQLiteProvider) because background tasks and the
 * sync engine run outside the React tree.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= open().catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  await migrate(db);
  return db;
}

/** Forward-only migrations tracked with `PRAGMA user_version`. */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (const [index, sql] of MIGRATIONS.entries()) {
    const version = index + 1;
    if (version <= current) continue;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(sql);
      await txn.execAsync(`PRAGMA user_version = ${version}`);
    });
  }
}

/**
 * Runs an exclusive write transaction, serialised with every other write.
 *
 * expo-sqlite executes exclusive transactions on a separate connection, so two
 * concurrent ones (e.g. a chat flush racing an employee sync) would otherwise
 * fail with SQLITE_BUSY. Queueing them keeps writes safe from any caller,
 * including background tasks.
 */
export function writeTransaction<T>(work: (txn: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await getDatabase();
    let result!: T;
    await db.withExclusiveTransactionAsync(async (txn) => {
      result = await work(txn);
    });
    return result;
  });
  // Keep the queue alive after a failure; the caller still receives the rejection.
  writeQueue = run.catch(() => undefined);
  return run;
}
