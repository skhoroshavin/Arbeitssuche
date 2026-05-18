import { mkdirSync } from "node:fs"

import { z } from "zod"

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

  prepare(sql: string): Statement {
    return new Statement(this.inner.prepare(sql))
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

/** Wraps node:sqlite StatementSync, adding getJsonData for the `data` column pattern. */
export class Statement {
  constructor(private readonly inner: StatementSync) {}

  get(...parameters: SqlValue[]): Record<string, unknown> | undefined {
    return this.inner.get(...parameters)
  }

  all(...parameters: SqlValue[]): Record<string, unknown>[] {
    return this.inner.all(...parameters)
  }

  run(...parameters: SqlValue[]): { changes: number; lastInsertRowid: bigint } {
    return this.inner.run(...parameters)
  }

  /** Execute get() and parse the `data` column as JSON. Returns undefined when no row matches. */
  getJsonData(...parameters: SqlValue[]): unknown {
    const row = this.inner.get(...parameters)
    if (row === undefined) return undefined
    return JSON.parse(z.object({ data: z.string() }).parse(row).data)
  }
}

/** Wraps node:sqlite StatementSync, adding getJsonData for the `data` column pattern. */
type SqlValue = string | number | null | bigint | Buffer
