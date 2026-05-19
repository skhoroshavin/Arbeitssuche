import { z } from "zod"

import * as cheerio from "cheerio/slim"

import type { Browser } from "@/plugins/browser"

import type {
  VacancyDetails,
  JobSite,
  JobPostingJsonLd,
  SearchCriteria,
} from "@/plugins/job-site"

import { withOpenedPage } from "@/plugins/job-site/utils/index.js"

import {
  extractJsonLd,
  normalizeAndJoinText,
  normalizeOptionalText,
  isRecord,
  stringField,
} from "@/utils/index.js"

export const SUPPORTED_MODES = ["employment", "apprenticeship"] as const

export function createDmSite(browser: Browser): JobSite {
  return new DmSite(browser)
}

const BASE_URL = "https://www.dm-jobs.de"

class DmSite implements JobSite {
  constructor(private readonly browser: Browser) {}

  readonly name = "dm"
  readonly supportedModes = [...SUPPORTED_MODES]

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
    publishedAt: ld.publishedAt,
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

function formatJobPostingAddress(
  posting: { jobLocation?: unknown } | undefined,
): string | undefined {
  if (!posting) return undefined
  const location = posting.jobLocation
  const loc: unknown = Array.isArray(location) ? location[0] : location
  if (!isRecord(loc) || !isRecord(loc.address)) return undefined
  return normalizeAndJoinText(
    [
      stringField(loc.address, "streetAddress"),
      stringField(loc.address, "postalCode"),
      stringField(loc.address, "addressLocality"),
    ],
    ", ",
  )
}

function extractAddressFallback($: cheerio.CheerioAPI): string | undefined {
  return normalizeOptionalText(
    $("dt")
      .filter((_index, element) => $(element).text().trim() === "Adresse")
      .first()
      .next("dd")
      .text(),
  )
}

function extractDescriptionFallback($: cheerio.CheerioAPI): string | undefined {
  const parts: string[] = []
  $("h2").each((_index, element) => {
    const heading = $(element).text().trim()
    const siblingHtml = $(element).next().html()
    if (heading && siblingHtml) {
      parts.push(`<h2>${heading}</h2>${siblingHtml}`)
    }
  })
  return parts.length > 0 ? parts.join("") : undefined
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
