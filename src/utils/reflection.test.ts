import { describe, test, expect } from "vitest"
import { isRecord, stringField } from "."

describe("isRecord", () => {
  test("returns true for objects", () => {
    expect(isRecord({ a: 1 })).toBe(true)
  })

  test("returns false for non-objects", () => {
    expect(isRecord()).toBe(false)
    expect(isRecord("string")).toBe(false)
    expect(isRecord(42)).toBe(false)
    expect(isRecord([])).toBe(true)
  })
})

describe("stringField", () => {
  test("extracts string value from a record", () => {
    expect(stringField({ name: "Alice" }, "name")).toBe("Alice")
  })

  test("returns undefined for non-string value", () => {
    expect(stringField({ age: 30 }, "age")).toBe(undefined)
  })

  test("returns undefined for missing key", () => {
    expect(stringField({ name: "Alice" }, "missing")).toBe(undefined)
  })
})
