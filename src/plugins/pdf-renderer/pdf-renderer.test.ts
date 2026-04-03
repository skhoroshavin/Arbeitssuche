import { test, describe, expect } from "vitest"
import { createStubPdfRenderer } from "@/plugins/pdf-renderer/index.js"

describe("StubPdfRenderer", () => {
  test("returns default buffer", async () => {
    const renderer = createStubPdfRenderer()
    const result = await renderer.htmlToPdf("<h1>Test</h1>")
    expect(
      result instanceof Buffer || result instanceof Uint8Array,
    ).toBeTruthy()
    expect(result.length > 0).toBeTruthy()
  })

  test("returns configured buffer", async () => {
    const custom = Buffer.from("custom pdf content")
    const renderer = createStubPdfRenderer(custom)
    const result = await renderer.htmlToPdf("<h1>Test</h1>")
    expect(result).toEqual(custom)
  })
})
