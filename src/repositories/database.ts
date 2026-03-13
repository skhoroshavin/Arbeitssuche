import type { StatementSync, SQLInputValue } from "node:sqlite";
import { DatabaseSync } from "node:sqlite";

export class Database {
  private constructor(private readonly inner: DatabaseSync) {}

  static open(dbPath: string): Database {
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

export function queryRow<T>(
  stmt: StatementSync,
  ...params: SQLInputValue[]
): T | undefined {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- SQLite API returns unknown
  return stmt.get(...params) as T | undefined;
}

export function queryRows<T>(
  stmt: StatementSync,
  ...params: SQLInputValue[]
): T[] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- SQLite API returns unknown
  return stmt.all(...params) as T[];
}
