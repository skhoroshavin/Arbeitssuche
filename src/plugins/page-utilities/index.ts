import * as cheerio from "cheerio/slim"
import type { Browser, OpenPageOptions } from "@/plugins/browser/types.js"

export async function withOpenedPage<T>(
  browser: Browser,
  url: string,
  extract: (html: string) => T | Promise<T>,
  options?: OpenPageOptions,
): Promise<T> {
  const page = await browser.openPage(url, options)
  try {
    return await extract(page.html)
  } finally {
    await page.close()
  }
}

export function extractAbsoluteLinks(
  html: string,
  options: LinkExtractionOptions,
): string[] {
  const $ = cheerio.load(html)
  const urls = new Set<string>()
  $(options.selector).each((_index, element) => {
    const href = $(element).attr("href")
    if (!href || !options.hrefPattern.test(href)) {
      return
    }

    const full = href.startsWith("http") ? href : `${options.baseUrl}${href}`
    urls.add(full)
  })
  return [...urls]
}

interface LinkExtractionOptions {
  selector: string
  hrefPattern: RegExp
  baseUrl: string
}
