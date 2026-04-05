import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"
import typia from "typia"
import { findStubMatch } from "@/utils/stub-utilities.js"
import type { Browser, Page, OpenPageOptions } from "@/plugins/browser/types.js"

export function createStubBrowser(
  pagesOrDirectory: Record<string, string> | string,
): StubBrowser {
  return new StubBrowserImpl(pagesOrDirectory)
}

class StubBrowserImpl implements StubBrowser {
  constructor(pagesOrDirectory: Record<string, string> | string) {
    this.pages =
      typeof pagesOrDirectory === "string"
        ? loadData(pagesOrDirectory)
        : pagesOrDirectory
  }

  readonly visitedUrls: string[] = []

  openPage(url: string, _options?: OpenPageOptions): Promise<Page> {
    const visitedUrls = this.visitedUrls
    const resolve = this.resolve.bind(this)
    visitedUrls.push(url)
    let html = resolve(url)
    return Promise.resolve({
      get html() {
        return html
      },
      navigate(nextUrl: string): Promise<void> {
        visitedUrls.push(nextUrl)
        html = resolve(nextUrl)
        return Promise.resolve()
      },
      async close() {},
    })
  }

  async close() {}

  private resolve(url: string): string {
    return findStubMatch(this.pages, url) ?? ""
  }

  private readonly pages: Record<string, string>
}

interface StubBrowser extends Browser {
  visitedUrls: string[]
}

function loadData(directory: string): Record<string, string> {
  return typia.json.assertParse<Record<string, string>>(
    gunzipSync(readFileSync(path.join(directory, "data.json.gz"))).toString(
      "utf8",
    ),
  )
}
