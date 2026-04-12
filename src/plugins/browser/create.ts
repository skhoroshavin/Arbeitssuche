export { createElectronBrowser } from "./electron"

export async function createPlaywrightBrowser(options?: {
  headless?: boolean
  recordDirectory?: string
}): Promise<import("./types.js").Browser> {
  const module = await import("./playwright")
  return module.createPlaywrightBrowser(options)
}
