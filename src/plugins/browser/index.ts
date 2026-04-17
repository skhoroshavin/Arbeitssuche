export type { Browser, OpenPageOptions, Page } from "./types.js"

export { createElectronBrowser } from "./electron"
export { createStubBrowser } from "./stub"

export async function createPlaywrightBrowser(options?: {
  headless?: boolean
  recordDirectory?: string
}): Promise<import("./types.js").Browser> {
  const module = await import("./playwright")
  return module.createPlaywrightBrowser(options)
}
