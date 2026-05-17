import { test, describe, expect } from "vitest"
import { HttpStub } from "."

describe("HttpStub", () => {
  describe("get()", () => {
    test("returns undefined when no patterns are set", () => {
      const stub = new HttpStub<string>()
      expect(stub.get("https://example.com/any")).toBeUndefined()
    })

    test("returns exact match by URL key", () => {
      const stub = new HttpStub<string>()
        .set("https://example.com/exact", "exact-hit")
        .set("other", "other-hit")

      expect(stub.get("https://example.com/exact")).toBe("exact-hit")
    })

    test("returns substring match when no exact key exists", () => {
      const stub = new HttpStub<string>()
        .set("api/search", "search-hit")
        .set("api/detail", "detail-hit")

      expect(stub.get("https://example.com/api/search?q=foo")).toBe("search-hit")
    })

    test("prefers exact match over substring match", () => {
      const stub = new HttpStub<string>()
        .set("search", "substring-hit")
        .set("https://example.com/api/search", "exact-hit")

      expect(stub.get("https://example.com/api/search")).toBe("exact-hit")
    })

    test("returns first substring match in insertion order", () => {
      const stub = new HttpStub<string>()
        .set("search", "first")
        .set("api/search", "second")

      expect(stub.get("https://example.com/api/search")).toBe("first")
    })
  })

  describe("requestedUrls", () => {
    test("tracks URLs in call order", () => {
      const stub = new HttpStub<string>().set("search", "hit")

      stub.get("https://a.com/search")
      stub.get("https://b.com/search")
      stub.get("https://c.com/other")

      expect(stub.requestedUrls).toEqual([
        "https://a.com/search",
        "https://b.com/search",
        "https://c.com/other",
      ])
    })
  })

  describe("set()", () => {
    test("returns this for chaining", () => {
      const stub = new HttpStub<string>()
      expect(stub.set("pattern", "value")).toBe(stub)
    })

    test("overwrites existing pattern with same key", () => {
      const stub = new HttpStub<string>()
        .set("search", "old")
        .set("search", "new")

      expect(stub.get("https://example.com/search")).toBe("new")
    })
  })
})
