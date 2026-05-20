export interface OpenPageOptions {
  waitFor?: string
  blockPatterns?: RegExp[]
}

export interface Browser {
  openPage(url: string, options?: OpenPageOptions): Promise<Page>
  close(): Promise<void>
}

export interface Page {
  html: string
  navigate(url: string, options?: { waitFor?: string }): Promise<void>
  close(): Promise<void>
}

export { createElectronBrowser } from "./electron"
export { BrowserStub } from "./stub"

export async function createPlaywrightBrowser(options?: {
  headless?: boolean
  recordDirectory?: string
}): Promise<Browser> {
  const module = await import("./playwright")
  return module.createPlaywrightBrowser(options)
}
