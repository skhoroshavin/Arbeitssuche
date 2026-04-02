export { createElectronBrowser } from "./electron/index.js";
export { createStubBrowser } from "./stub/index.js";
import type { Browser } from "./types.js";

export async function createPlaywrightBrowser(
  options?: PlaywrightBrowserOptions,
): Promise<Browser> {
  const module = await import("./playwright/index.js");
  return module.createPlaywrightBrowser(options);
}

type PlaywrightBrowserOptions = {
  headless?: boolean;
  recordDirectory?: string;
};
