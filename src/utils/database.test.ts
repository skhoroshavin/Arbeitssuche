import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { Database } from "."

const testDirectory = path.join(tmpdir(), `db-test-${Date.now()}`)
let database: Database

beforeAll(() => {
  database = Database.open(path.join(testDirectory, "test.db"))
  database.exec("CREATE TABLE test (id TEXT PRIMARY KEY, data TEXT NOT NULL)")
})

afterAll(() => {
  database.close()
  rmSync(testDirectory, { recursive: true, force: true })
})

describe("Database", () => {
  it("creates parent directories when they do not exist", () => {
    const nestedPath = path.join(testDirectory, "nested", "sub", "nested.db")
    const nested = Database.open(nestedPath)
    nested.close()
  })

  it("exec runs SQL statements", () => {
    database.exec("INSERT INTO test (id, data) VALUES ('a', '1')")
    database.exec("INSERT INTO test (id, data) VALUES ('b', '2')")
  })

  it("prepare returns a Statement", () => {
    const stmt = database.prepare("SELECT data FROM test WHERE id = ?")
    const row = stmt.get("a")
    expect(row?.data).toBe("1")
  })

  describe("transaction", () => {
    it("commits on success", () => {
      database.transaction(() => {
        database.exec("INSERT INTO test (id, data) VALUES ('tx1', 'ok')")
      })
      const row = database
        .prepare("SELECT data FROM test WHERE id = ?")
        .get("tx1")
      expect(row?.data).toBe("ok")
    })

    it("rolls back on error", () => {
      expect(() =>
        database.transaction(() => {
          database.exec(
            "INSERT INTO test (id, data) VALUES ('tx2', 'rollback')",
          )
          throw new Error("abort")
        }),
      ).toThrow("abort")
      const row = database
        .prepare("SELECT data FROM test WHERE id = ?")
        .get("tx2")
      expect(row).toBe(undefined)
    })
  })
})

describe("Statement", () => {
  it("get returns matching row", () => {
    const stmt = database.prepare("SELECT data FROM test WHERE id = ?")
    const row = stmt.get("a")
    expect(row?.data).toBe("1")
  })

  it("get returns undefined for no match", () => {
    const stmt = database.prepare("SELECT data FROM test WHERE id = ?")
    expect(stmt.get("nonexistent")).toBe(undefined)
  })

  it("all returns all matching rows", () => {
    const stmt = database.prepare("SELECT id FROM test ORDER BY id")
    const rows = stmt.all()
    const ids = rows.map((r) => r.id)
    expect(ids).toContain("a")
    expect(ids).toContain("b")
  })

  it("run returns changes count", () => {
    const stmt = database.prepare("UPDATE test SET data = ? WHERE id = ?")
    const result = stmt.run("updated", "a")
    expect(result.changes).toBe(1)
  })

  it("run returns 0 changes on no match", () => {
    const stmt = database.prepare("UPDATE test SET data = ? WHERE id = ?")
    const result = stmt.run("nope", "nonexistent")
    expect(result.changes).toBe(0)
  })

  describe("getJsonData", () => {
    beforeAll(() => {
      database.exec("DELETE FROM test")
      database.exec(
        `INSERT INTO test (id, data) VALUES ('json1', '{"name":"Alice","age":30}')`,
      )
      database.exec(
        `INSERT INTO test (id, data) VALUES ('json2', '{"name":"Bob","age":25}')`,
      )
    })

    it("parses the data column as JSON", () => {
      const stmt = database.prepare("SELECT data FROM test WHERE id = ?")
      const result = stmt.getJsonData("json1")
      expect(result).toEqual({ name: "Alice", age: 30 })
    })

    it("returns undefined when no row matches", () => {
      const stmt = database.prepare("SELECT data FROM test WHERE id = ?")
      expect(stmt.getJsonData("missing")).toBe(undefined)
    })
  })
})
