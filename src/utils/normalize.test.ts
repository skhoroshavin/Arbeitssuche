import { describe, test, expect } from "vitest"
import { joinNormalizedText, normalizeOptionalText } from "."

describe("normalizeOptionalText", () => {
  test("trims non-empty values", () => {
    expect(normalizeOptionalText("  hello  ")).toBe("hello")
  })

  test("drops empty and null-like values", () => {
    expect(normalizeOptionalText(" ")).toBe(undefined)
    expect(normalizeOptionalText("null")).toBe(undefined)
    const missing: string | undefined = undefined
    expect(normalizeOptionalText(missing)).toBe(undefined)
  })
})

describe("joinNormalizedText", () => {
  test("joins normalized non-empty parts", () => {
    expect(joinNormalizedText([" 10115", "Berlin "], " ")).toBe("10115 Berlin")
  })

  test("returns undefined when all parts are empty", () => {
    expect(joinNormalizedText([" ", undefined, "null"])).toBe(undefined)
  })
})
