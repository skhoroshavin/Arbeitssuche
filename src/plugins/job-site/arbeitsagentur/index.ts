import typia from "typia"
import type { Browser } from "@/plugins/browser"
import type { Fetch } from "@/plugins/fetch"
import type {
  VacancyDetails,
  JobSite,
  SearchCriteria,
} from "@/plugins/job-site"
import { joinNormalizedText } from "@/utils/index.js"

export function createArbeitsagenturSite(
  browser: Browser,
  fetch?: Fetch,
): JobSite {
  return new ArbeitsagenturSite(browser, fetch)
}

class ArbeitsagenturSite implements JobSite {
  constructor(_browser: Browser, fetch?: Fetch) {
    this.fetch = fetch ?? globalThis.fetch
  }

  readonly name = "arbeitsagentur"
  readonly supportedModes = [...SUPPORTED_MODES]

  async getVacancyList(criteria: SearchCriteria, pageId?: string) {
    const url = buildSearchApiUrl(criteria, pageId)
    const response = await this.fetch(url, { headers: API_HEADERS })
    assertOk(response, url)
    const data = typia.json.assertParse<ApiSearchResponse>(
      await response.text(),
    )
    return mapSearchResponse(data)
  }

  async getVacancyDetails(url: string) {
    const refnr = url.split("/").pop()
    if (!refnr) throw new Error(`Cannot extract refnr from URL: ${url}`)
    const encodedRefnr = btoa(refnr)
    const apiUrl = `${API_BASE}/pc/v3/jobdetails/${encodedRefnr}`
    const response = await this.fetch(apiUrl, { headers: API_HEADERS })
    assertOk(response, apiUrl)
    const data = typia.json.assertParse<ApiJobDetails>(await response.text())
    return mapDetailsResponse(data, url)
  }

  private readonly fetch: Fetch
}

function assertOk(response: Response, url: string): void {
  if (!response.ok) {
    throw new Error(
      `Arbeitsagentur API error: ${response.status} ${response.statusText} for ${url}`,
    )
  }
}

function mapSearchResponse(data: ApiSearchResponse): {
  urls: string[]
  nextPageId?: string
} {
  const items = data.stellenangebote ?? []
  const urls = items.map((item) => refnrToUrl(item.refnr))
  const totalPages = Math.ceil(data.maxErgebnisse / data.size)
  const nextPageId =
    items.length > 0 && data.page < totalPages
      ? String(data.page + 1)
      : undefined
  return { urls, nextPageId }
}

function mapDetailsResponse(data: ApiJobDetails, url: string): VacancyDetails {
  return {
    url,
    title: data.stellenangebotsTitel ?? "",
    company: data.firma ?? "",
    address: buildAddressFromLocations(data.stellenlokationen),
    descriptionHtml: data.stellenangebotsBeschreibung,
    startDate: data.eintrittszeitraum?.von,
    publishedAt: data.veroeffentlichungszeitraum?.von,
    contact: undefined,
  }
}

function buildSearchApiUrl(criteria: SearchCriteria, pageId?: string): string {
  const qs = new URLSearchParams()
  if (criteria.query) qs.set("was", criteria.query)
  qs.set("wo", criteria.location)
  qs.set("angebotsart", modeToAngebotsart(criteria.mode))
  if (criteria.mode === "entry-level") qs.set("berufserfahrung", "BEL")
  qs.set("umkreis", String(criteria.radiusKm))
  const pageNumber = Number(pageId ?? "1")
  qs.set("page", String(pageNumber))
  qs.set("size", "25")
  return `${API_BASE}/pc/v4/jobs?${qs.toString()}`
}

function refnrToUrl(refnr: string): string {
  return `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refnr}`
}

function buildAddressFromLocations(
  locations?: ApiJobDetails["stellenlokationen"],
): string | undefined {
  if (!locations?.length) return undefined
  const addr = locations[0].adresse
  if (!addr) return undefined
  const cityLine = joinNormalizedText([addr.plz, addr.ort], " ")
  return joinNormalizedText([addr.strasse, cityLine])
}

function modeToAngebotsart(mode: string): string {
  if (mode === "apprenticeship") return "4"
  return "1"
}

export const SUPPORTED_MODES = [
  "employment",
  "entry-level",
  "apprenticeship",
] as const

const API_BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service"
const API_HEADERS = { "X-API-Key": "jobboerse-jobsuche" }

interface ApiSearchResponse {
  stellenangebote?: ApiSearchResult[]
  maxErgebnisse: number
  page: number
  size: number
}

interface ApiJobDetails {
  stellenangebotsTitel?: string
  stellenangebotsBeschreibung?: string
  firma?: string
  stellenlokationen?: Array<{
    adresse?: {
      strasse?: string
      plz?: string
      ort?: string
    }
  }>
  eintrittszeitraum?: { von?: string }
  veroeffentlichungszeitraum?: { von?: string }
  referenznummer?: string
}

interface ApiSearchResult {
  refnr: string
}
