import { z } from "zod"

import type { Browser } from "@/plugins/browser"
import type {
  JobSite,
  JobSiteProvider,
  SearchCriteria,
  VacancyDetails,
} from "@/plugins/job-site"
import { Address } from "@/utils/index.js"
import { makeDateString } from "../date-string.js"

export const ArbeitsagenturProvider: JobSiteProvider = {
  id: "arbeitsagentur",
  name: "arbeitsagentur",
  supportedModes: ["employment", "entry-level", "apprenticeship"],
  createScraper: (browser: Browser, fetch?: Fetch) =>
    new ArbeitsagenturSite(browser, fetch),
}

const API_BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service"

export class ArbeitsagenturSite implements JobSite {
  constructor(_browser: Browser, fetch?: Fetch) {
    this.fetch = fetch ?? globalThis.fetch
  }

  async getVacancyList(criteria: SearchCriteria, pageId?: string) {
    const url = buildSearchApiUrl(criteria, pageId)
    const response = await this.fetch(url, { headers: API_HEADERS })
    assertOk(response, url)
    const data = ApiSearchResponseSchema.parse(
      JSON.parse(await response.text()),
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
    const data = ApiJobDetailsSchema.parse(JSON.parse(await response.text()))
    return mapDetailsResponse(data, url)
  }

  private readonly fetch: Fetch
}

const API_HEADERS = { "X-API-Key": "jobboerse-jobsuche" }

type Fetch = (url: string, init?: RequestInit) => Promise<Response>

function assertOk(response: Response, url: string): void {
  if (!response.ok) {
    throw new Error(
      `Arbeitsagentur API error: ${response.status} ${response.statusText} for ${url}`,
    )
  }
}

function mapSearchResponse(data: z.infer<typeof ApiSearchResponseSchema>): {
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

function mapDetailsResponse(
  data: z.infer<typeof ApiJobDetailsSchema>,
  url: string,
): VacancyDetails {
  return {
    url,
    title: data.stellenangebotsTitel ?? "",
    company: data.firma ?? "",
    address: buildAddressFromLocations(data.stellenlokationen),
    descriptionHtml: data.stellenangebotsBeschreibung ?? "",
    startDate: dateFromNested(data.eintrittszeitraum),
    publishedAt: dateFromNested(data.veroeffentlichungszeitraum),
    contact: { name: "", email: "", phone: "" },
  }
}

function dateFromNested(nested: { von?: string } | undefined): {
  value: string
} {
  return makeDateString(nested?.von ?? "")
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
  locations: z.infer<typeof ApiJobDetailsSchema>["stellenlokationen"],
): Address {
  const address = new Address()
  if (!locations?.length) return address
  const addr = locations[0].adresse
  if (!addr) return address
  address.street = addr.strasse ?? ""
  address.zip = addr.plz ?? ""
  address.city = addr.ort ?? ""
  return address
}

function modeToAngebotsart(mode: string): string {
  if (mode === "apprenticeship") return "4"
  return "1"
}

const ApiSearchResponseSchema = z.object({
  stellenangebote: z.array(z.object({ refnr: z.string() })).optional(),
  maxErgebnisse: z.number(),
  page: z.number(),
  size: z.number(),
})

const ApiJobDetailsSchema = z.object({
  stellenangebotsTitel: z.string().optional(),
  stellenangebotsBeschreibung: z.string().optional(),
  firma: z.string().optional(),
  stellenlokationen: z
    .array(
      z.object({
        adresse: z
          .object({
            strasse: z.string().optional(),
            plz: z.string().optional(),
            ort: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  eintrittszeitraum: z.object({ von: z.string().optional() }).optional(),
  veroeffentlichungszeitraum: z
    .object({ von: z.string().optional() })
    .optional(),
  referenznummer: z.string().optional(),
})
