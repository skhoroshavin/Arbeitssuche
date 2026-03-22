import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { StatementSync, SQLInputValue } from "node:sqlite";
import { DatabaseSync } from "node:sqlite";

/** SQLite database wrapper with WAL mode, foreign keys, and transaction support. */
export class Database {
  private constructor(private readonly inner: DatabaseSync) {}

  /** Open (or create) a database at the given path, creating parent directories as needed. */
  static open(dbPath: string): Database {
    mkdirSync(dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath, { enableForeignKeyConstraints: true });
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA synchronous = NORMAL");
    db.exec("PRAGMA busy_timeout = 5000");
    return new Database(db);
  }

  prepare(sql: string): StatementSync {
    return this.inner.prepare(sql);
  }

  exec(sql: string): void {
    this.inner.exec(sql);
  }

  close(): void {
    this.inner.close();
  }

  transaction<T>(fn: () => T): T {
    this.inner.exec("BEGIN TRANSACTION");
    try {
      const result = fn();
      this.inner.exec("COMMIT");
      return result;
    } catch (err) {
      this.inner.exec("ROLLBACK");
      throw err;
    }
  }
}

/** Execute a prepared statement and return the first row, or undefined. */
export function queryRow<T>(
  stmt: StatementSync,
  ...params: SQLInputValue[]
): T | undefined {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- SQLite API returns unknown
  return stmt.get(...params) as T | undefined;
}

/** Execute a prepared statement and return all matching rows. */
export function queryRows<T>(
  stmt: StatementSync,
  ...params: SQLInputValue[]
): T[] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- SQLite API returns unknown
  return stmt.all(...params) as T[];
}
