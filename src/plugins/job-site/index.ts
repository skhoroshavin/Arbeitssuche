import type { Browser } from "@/plugins/browser"
import type { Address } from "@/utils/index.js"
import type { DateString } from "@/utils/index.js"

import { ArbeitsagenturProvider } from "./arbeitsagentur"
import { DmProvider } from "./dm"
import { XingProvider } from "./xing"
import { ZalandoProvider } from "./zalando"

export interface SearchCriteria {
  location: string
  query: string
  radiusKm: number
  mode: SearchMode
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
  address: Address
  descriptionHtml: string
  startDate: DateString
  publishedAt: DateString
  contact: VacancyContact
}

export interface VacancyContact {
  name: string
  email: string
  phone: string
}

export interface JobSite {
  getVacancyList(criteria: SearchCriteria, pageId?: string): Promise<VacancyListPage>
  getVacancyDetails(url: string): Promise<VacancyDetails>
}

export interface JobSiteProviderInfo {
  readonly id: string
  readonly name: string
  readonly supportedModes: readonly SearchMode[]
}

export interface JobSiteProvider extends JobSiteProviderInfo {
  createScraper(browser: Browser): JobSite
}

export function getJobSiteProviders(): JobSiteProviderInfo[] {
  return PROVIDERS.map(({ id, name, supportedModes }) => ({
    id,
    name,
    supportedModes,
  }))
}

export function getJobSiteProvider(id: string): JobSiteProvider {
  const provider = PROVIDERS.find((p) => p.id === id)
  if (!provider) {
    throw new Error(
      `Unknown site: "${id}". Available: ${PROVIDERS.map((p) => p.id).join(", ")}`,
    )
  }
  return provider
}

export function getJobSiteProviderIds(): string[] {
  return PROVIDERS.map((p) => p.id)
}

const PROVIDERS: readonly JobSiteProvider[] = [
  ArbeitsagenturProvider,
  DmProvider,
  XingProvider,
  ZalandoProvider,
]
