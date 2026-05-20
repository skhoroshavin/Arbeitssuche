import { describe, it, expect } from "vitest"
import { makeDateString } from "./date-string.js"

describe("makeDateString", () => {
  it("returns empty for empty string", () => {
    expect(makeDateString("").value).toBe("")
  })

  it("returns empty for whitespace", () => {
    expect(makeDateString("   ").value).toBe("")
  })

  it("passes through ISO 8601 date", () => {
    expect(makeDateString("2026-01-15").value).toBe("2026-01-15")
  })

  it("normalizes German DD.MM.YYYY format", () => {
    expect(makeDateString("15.01.2026").value).toBe("2026-01-15")
  })

  it("returns empty for unparseable string", () => {
    expect(makeDateString("not-a-date").value).toBe("")
  })

  it("normalizes JSON-LD date", () => {
    expect(makeDateString("2026-02-01T00:00:00Z").value).toBe("2026-02-01")
  })
})
