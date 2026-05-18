import { z } from "zod"
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
      const raw = $(element).html() || ""
      const data = z.record(z.unknown()).safeParse(JSON.parse(raw))
      if (data.success && data.data["@type"] === type) {
        result = data.data
      }
    } catch {
      // invalid JSON — skip
    }
  })

  return result
}
