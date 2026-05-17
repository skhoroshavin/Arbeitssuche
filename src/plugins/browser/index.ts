import type { Browser } from "./types.js"

export type { Browser, OpenPageOptions, Page } from "./types.js"

export { createElectronBrowser } from "./electron"
export { BrowserStub } from "./stub"

export async function createPlaywrightBrowser(options?: {
  headless?: boolean
  recordDirectory?: string
}): Promise<Browser> {
  const module = await import("./playwright")
  return module.createPlaywrightBrowser(options)
}
