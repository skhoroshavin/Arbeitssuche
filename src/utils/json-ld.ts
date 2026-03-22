import type { CheerioAPI } from "cheerio/slim";

/** Extract the first JSON-LD object matching the given `@type` from a parsed HTML document. */
export function extractJsonLd(
  $: CheerioAPI,
  type: string,
): Record<string, unknown> | null {
  let result: Record<string, unknown> | null = null;

  $('script[type="application/ld+json"]').each((_i, el) => {
    if (result) return;
    try {
      const data = JSON.parse($(el).html() || "");
      if (data["@type"] === type) {
        result = data;
      }
    } catch {
      // invalid JSON — skip
    }
  });

  return result;
}
