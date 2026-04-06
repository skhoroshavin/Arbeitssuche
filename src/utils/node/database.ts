import { mkdirSync } from "node:fs"
import typia from "typia"
import path from "node:path"
import { DatabaseSync, StatementSync } from "node:sqlite"

/** SQLite database wrapper with WAL mode, foreign keys, and transaction support. */
export class Database {
  private constructor(private readonly inner: DatabaseSync) {}

  /** Open (or create) a database at the given path, creating parent directories as needed. */
  static open(databasePath: string): Database {
    mkdirSync(path.dirname(databasePath), { recursive: true })
    const database = new DatabaseSync(databasePath, {
      enableForeignKeyConstraints: true,
    })
    database.exec("PRAGMA journal_mode = WAL")
    database.exec("PRAGMA synchronous = NORMAL")
    database.exec("PRAGMA busy_timeout = 5000")
    return new Database(database)
  }

  prepare(sql: string): StatementSync {
    return this.inner.prepare(sql)
  }

  exec(sql: string): void {
    this.inner.exec(sql)
  }

  close(): void {
    this.inner.close()
  }

  transaction<T>(function_: () => T): T {
    this.inner.exec("BEGIN TRANSACTION")
    try {
      const result = function_()
      this.inner.exec("COMMIT")
      return result
    } catch (error) {
      this.inner.exec("ROLLBACK")
      throw error
    }
  }
}

/** Parse a row which may be undefined; returns undefined when row is missing. */
export function parseRow(row: unknown): unknown {
  if (row === undefined) return undefined
  return JSON.parse(typia.assert<{ data: string }>(row).data)
}
