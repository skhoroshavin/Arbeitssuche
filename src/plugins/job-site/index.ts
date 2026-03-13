import type { Browser } from "@/plugins/browser/types.js";
import type { JobSite, SearchMode } from "./types.js";
import {
  createArbeitsagenturSite,
  SUPPORTED_MODES as ARBEITSAGENTUR_MODES,
} from "./arbeitsagentur/index.js";
import { createXingSite, SUPPORTED_MODES as XING_MODES } from "./xing/index.js";
import {
  createZalandoSite,
  SUPPORTED_MODES as ZALANDO_MODES,
} from "./zalando/index.js";
import { createDmSite, SUPPORTED_MODES as DM_MODES } from "./dm/index.js";

export type {
  JobSite,
  SearchCriteria,
  VacancyListPage,
  VacancyDetails,
  VacancyContact,
  SearchMode,
} from "./types.js";

interface SiteEntry {
  factory: (browser: Browser) => JobSite;
  supportedModes: readonly SearchMode[];
}

const REGISTRY: Record<string, SiteEntry> = {
  arbeitsagentur: {
    factory: createArbeitsagenturSite,
    supportedModes: ARBEITSAGENTUR_MODES,
  },
  xing: { factory: createXingSite, supportedModes: XING_MODES },
  zalando: { factory: createZalandoSite, supportedModes: ZALANDO_MODES },
  dm: { factory: createDmSite, supportedModes: DM_MODES },
};

export function getJobSiteNames(): string[] {
  return Object.keys(REGISTRY);
}

export interface JobSiteInfo {
  name: string;
  supportedModes: readonly SearchMode[];
}

export function getJobSiteInfos(): JobSiteInfo[] {
  return Object.entries(REGISTRY).map(([name, entry]) => ({
    name,
    supportedModes: entry.supportedModes,
  }));
}

export function createJobSite(name: string, browser: Browser): JobSite {
  const entry = REGISTRY[name];
  if (!entry)
    throw new Error(
      `Unknown site: "${name}". Available: ${getJobSiteNames().join(", ")}`,
    );
  return entry.factory(browser);
}
