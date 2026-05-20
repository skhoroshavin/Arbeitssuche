import type { Browser } from "@/plugins/browser"

import {
  createArbeitsagenturSite,
  SUPPORTED_MODES as ARBEITSAGENTUR_MODES,
} from "./arbeitsagentur"

import { createDmSite, SUPPORTED_MODES as DM_MODES } from "./dm"

import { createXingSite, SUPPORTED_MODES as XING_MODES } from "./xing"

import { createZalandoSite, SUPPORTED_MODES as ZALANDO_MODES } from "./zalando"

export interface SearchCriteria {
  location: string
  query: string
  radiusKm: number
  mode: SearchMode
}

export function getJobSiteInfos(): JobSiteInfo[] {
  return Object.entries(REGISTRY).map(([name, entry]) => ({
    name,
    supportedModes: entry.supportedModes,
  }))
}

export interface JobSiteInfo {
  name: string
  supportedModes: readonly SearchMode[]
}

export function createJobSite(name: string, browser: Browser): JobSite {
  if (!isRegistryKey(name)) {
    throw new Error(
      `Unknown site: "${name}". Available: ${getJobSiteNames().join(", ")}`,
    )
  }
  return REGISTRY[name].factory(browser)
}

export interface JobSite {
  name: string
  supportedModes: SearchMode[]
  getVacancyList(
    criteria: SearchCriteria,
    pageId?: string,
  ): Promise<VacancyListPage>
  getVacancyDetails(url: string): Promise<VacancyDetails>
}

export type SearchMode = "employment" | "entry-level" | "apprenticeship"

export interface VacancyListPage {
  urls: string[]
  nextPageId?: string
}

export interface VacancyDetails {
  url: string
  title: string
  company: string
  address?: string
  descriptionHtml?: string
  startDate?: string
  publishedAt?: string
  contact?: VacancyContact
}

export interface VacancyContact {
  name?: string
  email?: string
  phone?: string
}

export function getJobSiteNames(): string[] {
  return Object.keys(REGISTRY)
}

interface SiteEntry {
  factory: (browser: Browser) => JobSite
  supportedModes: readonly SearchMode[]
}

function isRegistryKey(name: string): name is keyof typeof REGISTRY {
  return name in REGISTRY
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
