import { readFileSync } from "fs";
import { join } from "path";
import { gunzipSync } from "node:zlib";
import type {
  Browser,
  Page,
  OpenPageOptions,
} from "@/plugins/browser/types.js";

interface StubBrowser extends Browser {
  visitedUrls: string[];
}

function loadData(dir: string): Record<string, string> {
  return JSON.parse(
    gunzipSync(readFileSync(join(dir, "data.json.gz"))).toString("utf-8"),
  );
}

class StubBrowserImpl implements StubBrowser {
  readonly visitedUrls: string[] = [];
  private readonly pages: Record<string, string>;

  constructor(pagesOrDir: Record<string, string> | string) {
    this.pages =
      typeof pagesOrDir === "string" ? loadData(pagesOrDir) : pagesOrDir;
  }

  private resolve(url: string): string {
    if (url in this.pages) return this.pages[url];
    for (const [pattern, html] of Object.entries(this.pages)) {
      if (url.includes(pattern)) return html;
    }
    return "";
  }

  async openPage(url: string, _opts?: OpenPageOptions): Promise<Page> {
    const visitedUrls = this.visitedUrls;
    const resolve = this.resolve.bind(this);
    visitedUrls.push(url);
    let html = resolve(url);
    return {
      get html() {
        return html;
      },
      async navigate(nextUrl: string) {
        visitedUrls.push(nextUrl);
        html = resolve(nextUrl);
      },
      async close() {},
    };
  }

  async close() {}
}

export function createStubBrowser(
  pagesOrDir: Record<string, string> | string,
): StubBrowser {
  return new StubBrowserImpl(pagesOrDir);
}
