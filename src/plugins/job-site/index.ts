import type { Browser } from "@/plugins/browser/types.js"
import type { JobSite, SearchMode } from "./types.js"
import {
  createArbeitsagenturSite,
  SUPPORTED_MODES as ARBEITSAGENTUR_MODES,
} from "./arbeitsagentur"
import { createXingSite, SUPPORTED_MODES as XING_MODES } from "./xing"
import { createZalandoSite, SUPPORTED_MODES as ZALANDO_MODES } from "./zalando"
import { createDmSite, SUPPORTED_MODES as DM_MODES } from "./dm"

export function getJobSiteInfos(): JobSiteInfo[] {
  return Object.entries(REGISTRY).map(([name, entry]) => ({
    name,
    supportedModes: entry.supportedModes,
  }))
}

export function createJobSite(name: string, browser: Browser): JobSite {
  if (!isRegistryKey(name))
    throw new Error(
      `Unknown site: "${name}". Available: ${getJobSiteNames().join(", ")}`,
    )
  return REGISTRY[name].factory(browser)
}

export function getJobSiteNames(): string[] {
  return Object.keys(REGISTRY)
}

function isRegistryKey(name: string): name is keyof typeof REGISTRY {
  return name in REGISTRY
}

interface JobSiteInfo {
  name: string
  supportedModes: readonly SearchMode[]
}

const REGISTRY = {
  arbeitsagentur: {
    factory: createArbeitsagenturSite,
    supportedModes: ARBEITSAGENTUR_MODES,
  },
  xing: { factory: createXingSite, supportedModes: XING_MODES },
  zalando: { factory: createZalandoSite, supportedModes: ZALANDO_MODES },
  dm: { factory: createDmSite, supportedModes: DM_MODES },
} satisfies Record<string, SiteEntry>

interface SiteEntry {
  factory: (browser: Browser) => JobSite
  supportedModes: readonly SearchMode[]
}
