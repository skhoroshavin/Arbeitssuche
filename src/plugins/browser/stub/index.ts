import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"
import typia from "typia"
import { HttpStub } from "@/utils/index.js"
import type { Browser, Page, OpenPageOptions } from "@/plugins/browser"

export class BrowserStub extends HttpStub<string> implements Browser {
  static fromDirectory(directory: string): BrowserStub {
    const data = typia.json.assertParse<Record<string, string>>(
      gunzipSync(readFileSync(path.join(directory, "data.json.gz"))).toString(
        "utf8",
      ),
    )
    const stub = new BrowserStub()
    for (const [urlPattern, html] of Object.entries(data)) {
      stub.set(urlPattern, html)
    }
    return stub
  }

  openPage(url: string, _options?: OpenPageOptions): Promise<Page> {
    let html = this.get(url) ?? ""
    return Promise.resolve({
      get html() {
        return html
      },
      navigate: (nextUrl: string): Promise<void> => {
        html = this.get(nextUrl) ?? ""
        return Promise.resolve()
      },
      close: () => Promise.resolve(),
    })
  }

  async close(): Promise<void> {}
}
