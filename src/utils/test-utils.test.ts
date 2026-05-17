import { test, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { setupTemporaryDatabaseDirectory } from "./test-utils.js"

const { nextId, pathForId } = setupTemporaryDatabaseDirectory(
  "test-utils-test",
)

test("nextId returns incrementing string ids", () => {
  expect(nextId()).toBe("0")
  expect(nextId()).toBe("1")
  expect(nextId()).toBe("2")
})

test("pathForId returns a path ending with <id>.db inside an existing directory", () => {
  const p = pathForId("myid")
  expect(p).toMatch(/myid\.db$/)
  expect(fs.existsSync(path.dirname(p))).toBe(true)
})
