import typia from "typia"
import type { CheerioAPI } from "cheerio/slim"

/** Extract the first JSON-LD object matching the given `@type` from a parsed HTML document. */
export function extractJsonLd(
  $: CheerioAPI,
  type: string,
): Record<string, unknown> | undefined {
  let result: Record<string, unknown> | undefined

  $('script[type="application/ld+json"]').each((_index, element) => {
    if (result) return
    try {
      const data = typia.json.isParse<Record<string, unknown>>(
        $(element).html() || "",
      )
      if (data && data["@type"] === type) {
        result = data
      }
    } catch {
      // invalid JSON — skip
    }
  })

  return result
}
