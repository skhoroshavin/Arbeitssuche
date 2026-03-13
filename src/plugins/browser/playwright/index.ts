import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";
import type {
  Browser,
  Page,
  OpenPageOptions,
} from "@/plugins/browser/types.js";

async function navigateAndCapture(
  page: Awaited<
    ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>
  >,
  url: string,
  waitFor?: string,
): Promise<string> {
  if (waitFor) {
    await page.goto(url, { waitUntil: "commit", timeout: 10_000 });
    await page.waitForSelector(waitFor, { timeout: 15_000 }).catch(() => null);
  } else {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10_000 });
  }
  return page.content();
}

class PlaywrightBrowser implements Browser {
  private readonly recorded: { url: string; html: string }[] = [];

  constructor(
    private readonly pw: Awaited<ReturnType<typeof chromium.launch>>,
    private readonly recordDir?: string,
  ) {}

  private record(url: string, html: string): void {
    if (this.recordDir) this.recorded.push({ url, html });
  }

  async openPage(url: string, opts?: OpenPageOptions): Promise<Page> {
    const pwPage = await this.pw.newPage();
    const record = this.record.bind(this);

    if (opts?.blockPatterns) {
      const patterns = opts.blockPatterns;
      await pwPage.route(
        (u) => patterns.some((p) => p.test(u.toString())),
        (route) => route.abort(),
      );
    }

    let html = await navigateAndCapture(pwPage, url, opts?.waitFor);
    record(url, html);

    return {
      get html() {
        return html;
      },
      async navigate(nextUrl: string, navOpts?: { waitFor?: string }) {
        html = await navigateAndCapture(pwPage, nextUrl, navOpts?.waitFor);
        record(nextUrl, html);
      },
      async close() {
        await pwPage.close();
      },
    };
  }

  async close() {
    await this.pw.close();

    if (this.recordDir && this.recorded.length > 0) {
      mkdirSync(this.recordDir, { recursive: true });
      const index: Record<string, string> = {};
      for (let i = 0; i < this.recorded.length; i++) {
        const file = `${i}.html`;
        writeFileSync(
          join(this.recordDir, file),
          this.recorded[i].html,
          "utf-8",
        );
        index[this.recorded[i].url] = file;
      }
      writeFileSync(
        join(this.recordDir, "index.json"),
        JSON.stringify(index, null, 2),
        "utf-8",
      );
    }
  }
}

export async function createPlaywrightBrowser(options?: {
  headless?: boolean;
  recordDir?: string;
}): Promise<Browser> {
  const pw = await chromium.launch({ headless: options?.headless ?? true });
  return new PlaywrightBrowser(pw, options?.recordDir);
}
