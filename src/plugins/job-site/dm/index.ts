import { z } from "zod"

import * as cheerio from "cheerio/slim"

import type { Browser } from "@/plugins/browser"
import type {
  JobSite,
  JobSiteProvider,
  SearchCriteria,
  VacancyDetails,
} from "@/plugins/job-site"
import { Address, makeDateString } from "@/utils/index.js"
import { withOpenedPage } from "@/plugins/job-site/utils/index.js"
import {
  extractJsonLd,
  normalizeAndJoinText,
  normalizeOptionalText,
  isRecord,
  stringField,
} from "@/utils/index.js"

export const DmProvider: JobSiteProvider = {
  id: "dm",
  name: "dm",
  supportedModes: ["employment", "apprenticeship"],
  createScraper: (browser: Browser) => new DmSite(browser),
}

const BASE_URL = "https://www.dm-jobs.de"

class DmSite implements JobSite {
  constructor(private readonly browser: Browser) {}

  async getVacancyList(criteria: SearchCriteria) {
    const page = await this.browser.openPage(buildSearchUrl(criteria), {
      waitFor: SEARCH_READY_SELECTOR,
      blockPatterns: BLOCK_PATTERNS,
    })
    try {
      const urls = extractLinks(page.html)
      return { urls, nextPageId: undefined }
    } finally {
      await page.close()
    }
  }

  async getVacancyDetails(url: string) {
    return withOpenedPage(
      this.browser,
      url,
      (html) => extractVacancy(html, url),
      {
        waitFor: SEARCH_READY_SELECTOR,
        blockPatterns: BLOCK_PATTERNS,
      },
    )
  }
}

const BLOCK_PATTERNS = [/usercentrics\.eu/]

const SEARCH_READY_SELECTOR = "a[href*='/job/']"

function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html)
  const ld = extractFromPosting(extractJsonLd($, "JobPosting"))

  return {
    url,
    title: ld.title ?? $("h1").first().text().trim(),
    company: ld.company ?? "dm",
    address: ld.address ?? extractAddressFallback($),
    descriptionHtml: ld.description ?? extractDescriptionFallback($),
    startDate: makeDateString(""),
    publishedAt: makeDateString(ld.publishedAt ?? ""),
    contact: { name: "", email: "", phone: "" },
  }
}

function extractLinks(html: string): string[] {
  const $ = cheerio.load(html)
  const urls = new Set<string>()
  $("a[href*='/job/']").each((_index, element) => {
    const href = $(element).attr("href")
    if (!href) return
    if (!/\/job\/[^/]+\/\d+/.test(href)) return
    const full = href.startsWith("http") ? href : `${BASE_URL}${href}`
    urls.add(full)
  })
  return [...urls]
}

function buildSearchUrl(criteria: SearchCriteria): string {
  const qs = new URLSearchParams()
  if (criteria.mode === "apprenticeship") {
    qs.set("jobType[0]", "Ausbildung")
  }
  qs.set("region", criteria.location)
  return `${BASE_URL}/job-listing/?${qs}`
}

function extractFromPosting(jsonLd: object | undefined) {
  const posting = asJobPosting(jsonLd)
  return {
    title: posting?.title,
    company: posting?.hiringOrganization?.name,
    description: posting?.description,
    publishedAt: posting?.datePosted,
    address: formatJobPostingAddress(posting),
  }
}

function asJobPosting(value: unknown): JobPostingJsonLd | undefined {
  const result = JobPostingJsonLdSchema.safeParse(value)
  return result.success ? result.data : undefined
}

interface JobPostingJsonLd {
  title?: string
  description?: string
  datePosted?: string
  hiringOrganization?: { name?: string }
  jobLocation?:
    | { address?: JobPostingAddress }
    | { address?: JobPostingAddress }[]
}

interface JobPostingAddress {
  streetAddress?: string
  postalCode?: string
  addressLocality?: string
}

function formatJobPostingAddress(
  posting: { jobLocation?: unknown } | undefined,
): Address {
  const address = new Address()
  if (!posting) return address
  const location = posting.jobLocation
  const loc: unknown = Array.isArray(location) ? location[0] : location
  if (!isRecord(loc) || !isRecord(loc.address)) return address
  address.street = stringField(loc.address, "streetAddress") ?? ""
  address.zip = stringField(loc.address, "postalCode") ?? ""
  address.city = stringField(loc.address, "addressLocality") ?? ""
  return address
}

function extractAddressFallback($: cheerio.CheerioAPI): Address {
  const address = new Address()
  const raw = normalizeOptionalText(
    $("dt")
      .filter((_index, element) => $(element).text().trim() === "Adresse")
      .first()
      .next("dd")
      .text(),
  )
  if (raw) {
    const parts = raw.split(",").map((p) => p.trim())
    if (parts.length >= 2) {
      address.street = parts[0]
      const cityParts = parts[parts.length - 1].split(" ")
      if (cityParts.length >= 2) {
        address.zip = cityParts[0]
        address.city = cityParts.slice(1).join(" ")
      } else {
        address.city = parts[parts.length - 1]
      }
    } else {
      address.city = raw
    }
  }
  return address
}

function extractDescriptionFallback($: cheerio.CheerioAPI): string {
  const parts: string[] = []
  $("h2").each((_index, element) => {
    const heading = $(element).text().trim()
    const siblingHtml = $(element).next().html()
    if (heading && siblingHtml) {
      parts.push(`<h2>${heading}</h2>${siblingHtml}`)
    }
  })
  return parts.length > 0 ? parts.join("") : ""
}

const JobPostingJsonLdSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  datePosted: z.string().optional(),
  hiringOrganization: z.object({ name: z.string().optional() }).optional(),
  jobLocation: z
    .union([
      z.object({
        address: z
          .object({
            streetAddress: z.string().optional(),
            postalCode: z.string().optional(),
            addressLocality: z.string().optional(),
          })
          .optional(),
      }),
      z.array(
        z.object({
          address: z
            .object({
              streetAddress: z.string().optional(),
              postalCode: z.string().optional(),
              addressLocality: z.string().optional(),
            })
            .optional(),
        }),
      ),
    ])
    .optional(),
})
