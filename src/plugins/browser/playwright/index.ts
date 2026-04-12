import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { gzipSync } from "node:zlib"
import {
  chromium,
  type Page as PwPage,
  type Browser as PwBrowser,
} from "playwright"
import type { Browser, Page, OpenPageOptions } from "@/plugins/browser"

export async function createPlaywrightBrowser(options?: {
  headless?: boolean
  recordDirectory?: string
}): Promise<Browser> {
  const pw = await chromium.launch({ headless: options?.headless ?? true })
  return new PlaywrightBrowser(pw, options?.recordDirectory)
}

class PlaywrightBrowser implements Browser {
  constructor(
    private readonly pw: PwBrowser,
    private readonly recordDirectory?: string,
  ) {}

  async openPage(url: string, options?: OpenPageOptions): Promise<Page> {
    const pwPage = await this.pw.newPage()
    const record = this.record.bind(this)

    if (options?.blockPatterns) {
      const patterns = options.blockPatterns
      await pwPage.route(
        (u) => patterns.some((p) => p.test(u.toString())),
        (route) => route.abort(),
      )
    }

    let html = await navigateAndCapture(pwPage, url, options?.waitFor)
    record(url, html)

    return {
      get html() {
        return html
      },
      async navigate(nextUrl: string, navOptions?: { waitFor?: string }) {
        html = await navigateAndCapture(pwPage, nextUrl, navOptions?.waitFor)
        record(nextUrl, html)
      },
      async close() {
        await pwPage.close()
      },
    }
  }

  async close() {
    await this.pw.close()

    if (this.recordDirectory && this.recorded.length > 0) {
      mkdirSync(this.recordDirectory, { recursive: true })
      const data: Record<string, string> = {}
      for (const { url, html } of this.recorded) {
        data[url] = html
      }
      writeFileSync(
        path.join(this.recordDirectory, "data.json.gz"),
        gzipSync(Buffer.from(JSON.stringify(data), "utf8")),
      )
    }
  }

  private record(url: string, html: string): void {
    if (this.recordDirectory) this.recorded.push({ url, html })
  }

  private readonly recorded: { url: string; html: string }[] = []
}

async function navigateAndCapture(
  page: PwPage,
  url: string,
  waitFor?: string,
): Promise<string> {
  if (waitFor) {
    await page.goto(url, { waitUntil: "commit", timeout: 10_000 })
    await page.waitForSelector(waitFor, { timeout: 15_000 }).catch(() => {})
  } else {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10_000 })
  }
  return page.content()
}
