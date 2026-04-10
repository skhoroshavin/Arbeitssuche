import { test, describe, expect } from "vitest"
import * as cheerio from "cheerio/slim"
import { extractJsonLd } from "."
import {
  joinNormalizedText,
  normalizeContact,
  normalizeMailtoHref,
  normalizeOptionalText,
} from "."

describe("extractJsonLd", () => {
  test("extracts object matching the requested @type", () => {
    const $ = html({ "@type": "Person", name: "Alice" })
    const result = extractJsonLd($, "Person")
    expect(result?.["name"]).toBe("Alice")
  })

  test("returns undefined when @type does not match", () => {
    const $ = html({ "@type": "Organization", name: "Acme" })
    expect(extractJsonLd($, "Person")).toBe(undefined)
  })

  test("returns undefined when no JSON-LD is present", () => {
    const $ = cheerio.load("<html><body>No JSON-LD</body></html>")
    expect(extractJsonLd($, "Person")).toBe(undefined)
  })

  test("returns the first match when multiple JSON-LD blocks exist", () => {
    const $ = cheerio.load(`<html><head>
      <script type="application/ld+json">{"@type":"Item","id":1}</script>
      <script type="application/ld+json">{"@type":"Item","id":2}</script>
    </head></html>`)
    const result = extractJsonLd($, "Item")
    expect(result?.["id"]).toBe(1)
  })

  test("skips invalid JSON gracefully", () => {
    const $ = cheerio.load(`<html><head>
      <script type="application/ld+json">not valid json</script>
      <script type="application/ld+json">{"@type":"Valid","ok":true}</script>
    </head></html>`)
    const result = extractJsonLd($, "Valid")
    expect(result?.["ok"]).toBe(true)
  })
})

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

describe("normalizeMailtoHref", () => {
  test("strips mailto prefix and trims", () => {
    expect(normalizeMailtoHref("mailto: test@example.com ")).toBe(
      "test@example.com",
    )
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

describe("normalizeContact", () => {
  test("normalizes contact fields", () => {
    expect(
      normalizeContact({
        name: " Jane Doe ",
        email: "jane@example.com",
        phone: " ",
      }),
    ).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: undefined,
    })
  })

  test("returns undefined when all fields normalize empty", () => {
    expect(
      normalizeContact({ name: " ", email: undefined, phone: "null" }),
    ).toBe(undefined)
  })
})

function html(jsonLd: object): ReturnType<typeof cheerio.load> {
  return cheerio.load(
    `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head></html>`,
  )
}
