import { BrowserWindow } from "electron";
import type {
  Browser,
  Page,
  OpenPageOptions,
} from "@/plugins/browser/types.js";

type WaitUntil = "commit" | "domcontentloaded" | "load";

function createElectronPage(partition: string): {
  goto: (url: string, waitUntil: WaitUntil, timeout: number) => Promise<void>;
  waitForSelector: (selector: string, timeout: number) => Promise<void>;
  content: () => Promise<string>;
  blockUrlPatterns: (patterns: RegExp[]) => void;
  close: () => Promise<void>;
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
  });

  async function goto(
    url: string,
    waitUntil: WaitUntil,
    timeout: number,
  ): Promise<void> {
    const wc = win.webContents;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(`Navigation to ${url} timed out after ${timeout}ms`),
          ),
        timeout,
      );

      const cleanup = () => {
        clearTimeout(timer);
        wc.removeAllListeners("did-navigate");
        wc.removeAllListeners("dom-ready");
        wc.removeAllListeners("did-finish-load");
        wc.removeAllListeners("did-fail-load");
      };

      const onSuccess = () => {
        cleanup();
        resolve();
      };

      if (waitUntil === "commit") wc.once("did-navigate", onSuccess);
      else if (waitUntil === "domcontentloaded")
        wc.once("dom-ready", onSuccess);
      else wc.once("did-finish-load", onSuccess);

      wc.once("did-fail-load", (_e, code, desc) => {
        cleanup();
        reject(new Error(`Navigation failed: ${desc} (${code})`));
      });

      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        cleanup();
        reject(
          new Error(`Refused to load URL with disallowed protocol: ${url}`),
        );
        return;
      }

      wc.loadURL(url);
    });
  }

  async function waitForSelector(
    selector: string,
    timeout: number,
  ): Promise<void> {
    const start = Date.now();
    const escaped = selector.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    while (Date.now() - start < timeout) {
      const found = await win.webContents.executeJavaScript(
        `!!document.querySelector('${escaped}')`,
      );
      if (found) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(
      `waitForSelector("${selector}") timed out after ${timeout}ms`,
    );
  }

  async function content(): Promise<string> {
    return win.webContents.executeJavaScript(
      "document.documentElement.outerHTML",
    );
  }

  function blockUrlPatterns(patterns: RegExp[]): void {
    win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      if (patterns.some((p) => p.test(details.url))) {
        callback({ cancel: true });
      } else {
        callback({});
      }
    });
  }

  async function close(): Promise<void> {
    if (!win.isDestroyed()) {
      const ses = win.webContents.session;
      await ses.clearStorageData();
      await ses.clearCache();
      win.destroy();
    }
  }

  return { goto, waitForSelector, content, blockUrlPatterns, close };
}

async function navigateAndCapture(
  ep: ReturnType<typeof createElectronPage>,
  url: string,
  waitFor?: string,
): Promise<string> {
  if (waitFor) {
    await ep.goto(url, "commit", 10_000);
    await ep.waitForSelector(waitFor, 15_000).catch(() => null);
  } else {
    await ep.goto(url, "domcontentloaded", 10_000);
  }
  return ep.content();
}

class ElectronBrowser implements Browser {
  private partitionCounter = 0;
  private readonly pages: ReturnType<typeof createElectronPage>[] = [];

  async openPage(url: string, opts?: OpenPageOptions): Promise<Page> {
    const partition = `crawl-${++this.partitionCounter}`;
    const ep = createElectronPage(partition);
    const pages = this.pages;
    pages.push(ep);

    if (opts?.blockPatterns) {
      ep.blockUrlPatterns(opts.blockPatterns);
    }

    let html = await navigateAndCapture(ep, url, opts?.waitFor);

    return {
      get html() {
        return html;
      },
      async navigate(nextUrl: string, navOpts?: { waitFor?: string }) {
        html = await navigateAndCapture(ep, nextUrl, navOpts?.waitFor);
      },
      async close() {
        await ep.close();
        const idx = pages.indexOf(ep);
        if (idx !== -1) pages.splice(idx, 1);
      },
    };
  }

  async close() {
    for (const ep of this.pages) {
      await ep.close();
    }
    this.pages.length = 0;
  }
}

export function createElectronBrowser(): Browser {
  return new ElectronBrowser();
}
