import { test, describe, expect } from "vitest";
import * as cheerio from "cheerio/slim";
import { extractJsonLd } from "./json-ld";

function html(jsonLd: object): ReturnType<typeof cheerio.load> {
  return cheerio.load(
    `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head></html>`,
  );
}

describe("extractJsonLd", () => {
  test("extracts object matching the requested @type", () => {
    const $ = html({ "@type": "Person", name: "Alice" });
    const result = extractJsonLd($, "Person");
    expect(result?.["name"]).toBe("Alice");
  });

  test("returns null when @type does not match", () => {
    const $ = html({ "@type": "Organization", name: "Acme" });
    expect(extractJsonLd($, "Person")).toBe(null);
  });

  test("returns null when no JSON-LD is present", () => {
    const $ = cheerio.load("<html><body>No JSON-LD</body></html>");
    expect(extractJsonLd($, "Person")).toBe(null);
  });

  test("returns the first match when multiple JSON-LD blocks exist", () => {
    const $ = cheerio.load(`<html><head>
      <script type="application/ld+json">{"@type":"Item","id":1}</script>
      <script type="application/ld+json">{"@type":"Item","id":2}</script>
    </head></html>`);
    const result = extractJsonLd($, "Item");
    expect(result?.["id"]).toBe(1);
  });

  test("skips invalid JSON gracefully", () => {
    const $ = cheerio.load(`<html><head>
      <script type="application/ld+json">not valid json</script>
      <script type="application/ld+json">{"@type":"Valid","ok":true}</script>
    </head></html>`);
    const result = extractJsonLd($, "Valid");
    expect(result?.["ok"]).toBe(true);
  });
});
