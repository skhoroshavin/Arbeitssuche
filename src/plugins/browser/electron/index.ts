import { BrowserWindow } from "electron"
import type { Browser, Page, OpenPageOptions } from "@/plugins/browser/types.js"

export function createElectronBrowser(): Browser {
  return new ElectronBrowser()
}

class ElectronBrowser implements Browser {
  async openPage(url: string, options?: OpenPageOptions): Promise<Page> {
    const partition = `crawl-${++this.partitionCounter}`
    const ep = createElectronPage(partition)
    const pages = this.pages
    pages.push(ep)

    if (options?.blockPatterns) {
      ep.blockUrlPatterns(options.blockPatterns)
    }

    let html = await navigateAndCapture(ep, url, options?.waitFor)

    return {
      get html() {
        return html
      },
      async navigate(nextUrl: string, navOptions?: { waitFor?: string }) {
        html = await navigateAndCapture(ep, nextUrl, navOptions?.waitFor)
      },
      async close() {
        await ep.close()
        const index = pages.indexOf(ep)
        if (index !== -1) pages.splice(index, 1)
      },
    }
  }

  async close() {
    for (const ep of this.pages) {
      await ep.close()
    }
    this.pages.length = 0
  }

  private partitionCounter = 0
  private readonly pages: ReturnType<typeof createElectronPage>[] = []
}

async function navigateAndCapture(
  ep: ReturnType<typeof createElectronPage>,
  url: string,
  waitFor?: string,
): Promise<string> {
  if (waitFor) {
    await ep.goto(url, "commit", 10_000)
    await ep.waitForSelector(waitFor, 15_000).catch(() => {})
  } else {
    await ep.goto(url, "domcontentloaded", 10_000)
  }
  return ep.content()
}

function createElectronPage(partition: string): {
  goto: (url: string, waitUntil: WaitUntil, timeout: number) => Promise<void>
  waitForSelector: (selector: string, timeout: number) => Promise<void>
  content: () => Promise<string>
  blockUrlPatterns: (patterns: RegExp[]) => void
  close: () => Promise<void>
} {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      partition,
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  async function goto(
    url: string,
    waitUntil: WaitUntil,
    timeout: number,
  ): Promise<void> {
    const wc = win.webContents
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(`Navigation to ${url} timed out after ${timeout}ms`),
          ),
        timeout,
      )

      const cleanup = () => {
        clearTimeout(timer)
        wc.removeAllListeners("did-navigate")
        wc.removeAllListeners("dom-ready")
        wc.removeAllListeners("did-finish-load")
        wc.removeAllListeners("did-fail-load")
      }

      const onSuccess = () => {
        cleanup()
        resolve()
      }

      if (waitUntil === "commit") wc.once("did-navigate", onSuccess)
      else if (waitUntil === "domcontentloaded") wc.once("dom-ready", onSuccess)
      else wc.once("did-finish-load", onSuccess)

      wc.once("did-fail-load", (_error, code, desc) => {
        cleanup()
        reject(new Error(`Navigation failed: ${desc} (${code})`))
      })

      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        cleanup()
        reject(
          new Error(`Refused to load URL with disallowed protocol: ${url}`),
        )
        return
      }

      void wc.loadURL(url)
    })
  }

  async function waitForSelector(
    selector: string,
    timeout: number,
  ): Promise<void> {
    const start = Date.now()
    const escaped = selector
      .replaceAll("\\", "\\\\")
      .replaceAll("'", String.raw`\'`)
    while (Date.now() - start < timeout) {
      const found = Boolean(
        await win.webContents.executeJavaScript(
          `!!document.querySelector('${escaped}')`,
        ),
      )
      if (found) return
      await new Promise((r) => setTimeout(r, 100))
    }
    throw new Error(
      `waitForSelector("${selector}") timed out after ${timeout}ms`,
    )
  }

  async function content(): Promise<string> {
    return String(
      await win.webContents.executeJavaScript(
        "document.documentElement.outerHTML",
      ),
    )
  }

  function blockUrlPatterns(patterns: RegExp[]): void {
    win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      if (patterns.some((p) => p.test(details.url))) {
        callback({ cancel: true })
      } else {
        callback({})
      }
    })
  }

  async function close(): Promise<void> {
    if (!win.isDestroyed()) {
      const ses = win.webContents.session
      await ses.clearStorageData()
      await ses.clearCache()
      win.destroy()
    }
  }

  return { goto, waitForSelector, content, blockUrlPatterns, close }
}

type WaitUntil = "commit" | "domcontentloaded" | "load"
