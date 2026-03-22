import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createStubPdfRenderer } from "@/plugins/pdf-renderer/stub/index.js";

describe("StubPdfRenderer", () => {
  test("returns default buffer", async () => {
    const renderer = createStubPdfRenderer();
    const result = await renderer.htmlToPdf("<h1>Test</h1>");
    assert.ok(result instanceof Buffer || result instanceof Uint8Array);
    assert.ok(result.length > 0);
  });

  test("returns configured buffer", async () => {
    const custom = Buffer.from("custom pdf content");
    const renderer = createStubPdfRenderer(custom);
    const result = await renderer.htmlToPdf("<h1>Test</h1>");
    assert.deepEqual(result, custom);
  });
});
