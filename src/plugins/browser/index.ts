export { createStubBrowser } from "./stub"
export { createElectronBrowser } from "./electron"
import type { Browser } from "./types.js"

export async function createPlaywrightBrowser(
  options?: PlaywrightBrowserOptions,
): Promise<Browser> {
  const module = await import("./playwright")
  return module.createPlaywrightBrowser(options)
}

type PlaywrightBrowserOptions = {
  headless?: boolean
  recordDirectory?: string
}
