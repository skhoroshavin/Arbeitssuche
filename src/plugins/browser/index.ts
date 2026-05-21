export async function createElectronBrowser(): Promise<Browser> {
  const { createElectronBrowser: factory } = await import("./electron")
  return factory()
}

export { BrowserStub } from "./stub"

export interface Browser {
  openPage(url: string, options?: OpenPageOptions): Promise<Page>
  close(): Promise<void>
}

export interface OpenPageOptions {
  waitFor?: string
  blockPatterns?: RegExp[]
}

export interface Page {
  html: string
  navigate(url: string, options?: { waitFor?: string }): Promise<void>
  close(): Promise<void>
}

export async function createPlaywrightBrowser(options?: {
  headless?: boolean
  recordDirectory?: string
}): Promise<Browser> {
  const module = await import("./playwright")
  return module.createPlaywrightBrowser(options)
}
