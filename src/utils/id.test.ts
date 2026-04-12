import { describe, it, test, expect } from "vitest"
import { createUniqueDerivedId } from "./node"
import { deriveId, createWithUniqueId } from "./node/id.js"

describe("deriveId", () => {
  test("produces a slug with hex suffix", () => {
    const id = deriveId("Hello World")
    expect(id).toMatch(/^hello_world_[0-9a-f]{4}$/)
  })

  test("strips diacritics", () => {
    const id = deriveId("Ünïcödé")
    expect(id).toMatch(/^unicode_[0-9a-f]{4}$/)
  })

  test("replaces non-alphanumeric chars with underscores", () => {
    const id = deriveId("foo@bar.baz!")
    expect(id).toMatch(/^foo_bar_baz_[0-9a-f]{4}$/)
  })

  test("truncates long slugs to 30 characters", () => {
    const long = "a".repeat(50)
    const id = deriveId(long)
    const slug = id.slice(0, id.lastIndexOf("_"))
    expect(slug.length <= 30).toBeTruthy()
  })

  test("produces unique IDs for the same input", () => {
    const ids = new Set(Array.from({ length: 20 }, () => deriveId("same")))
    expect(ids.size > 1).toBeTruthy()
  })

  test("handles empty string", () => {
    const id = deriveId("")
    expect(id).toMatch(/^_[0-9a-f]{4}$/)
  })
})

describe("createWithUniqueId", () => {
  it("returns the first non-existing id", () => {
    const id = createWithUniqueId(
      () => "abc",
      () => false,
    )
    expect(id).toBe("abc")
  })

  it("retries when id already exists", () => {
    const ids = ["taken", "taken", "free"]
    let index = 0
    const existing = new Set(["taken"])

    const id = createWithUniqueId(
      () => ids[index++],
      (id) => existing.has(id),
    )
    expect(id).toBe("free")
  })

  it("throws after 5 failed attempts", () => {
    expect(() =>
      createWithUniqueId(
        () => "collision",
        () => true,
      ),
    ).toThrow("Failed to generate unique id after 5 attempts")
  })
})

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
