import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as cheerio from "cheerio/slim";
import { extractJsonLd } from "./json-ld.js";

function html(jsonLd: object): ReturnType<typeof cheerio.load> {
  return cheerio.load(
    `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head></html>`,
  );
}

describe("extractJsonLd", () => {
  test("extracts object matching the requested @type", () => {
    const $ = html({ "@type": "Person", name: "Alice" });
    const result = extractJsonLd($, "Person");
    assert.equal(result?.["name"], "Alice");
  });

  test("returns null when @type does not match", () => {
    const $ = html({ "@type": "Organization", name: "Acme" });
    assert.equal(extractJsonLd($, "Person"), null);
  });

  test("returns null when no JSON-LD is present", () => {
    const $ = cheerio.load("<html><body>No JSON-LD</body></html>");
    assert.equal(extractJsonLd($, "Person"), null);
  });

  test("returns the first match when multiple JSON-LD blocks exist", () => {
    const $ = cheerio.load(`<html><head>
      <script type="application/ld+json">{"@type":"Item","id":1}</script>
      <script type="application/ld+json">{"@type":"Item","id":2}</script>
    </head></html>`);
    const result = extractJsonLd($, "Item");
    assert.equal(result?.["id"], 1);
  });

  test("skips invalid JSON gracefully", () => {
    const $ = cheerio.load(`<html><head>
      <script type="application/ld+json">not valid json</script>
      <script type="application/ld+json">{"@type":"Valid","ok":true}</script>
    </head></html>`);
    const result = extractJsonLd($, "Valid");
    assert.equal(result?.["ok"], true);
  });
});
