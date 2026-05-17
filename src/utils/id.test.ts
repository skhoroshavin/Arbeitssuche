import { describe, it, expect } from "vitest"
import { createUniqueDerivedId } from "."

describe("createUniqueDerivedId", () => {
  it("returns the first derived id when available", () => {
    const id = createUniqueDerivedId("Hello World", () => false)
    expect(id).toMatch(/^hello_world_[0-9a-f]{4}$/)
  })

  it("retries derived ids until one is free", () => {
    const seen = new Set<string>()
    let attempts = 0

    const id = createUniqueDerivedId("Hello World", (candidate) => {
      attempts += 1
      if (attempts < 3) {
        seen.add(candidate)
        return true
      }

      return seen.has(candidate)
    })

    expect(seen.has(id)).toBeFalsy()
    expect(attempts).toBe(3)
  })
})
