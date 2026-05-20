import { z } from "zod"

import * as cheerio from "cheerio/slim"

import type { Browser } from "@/plugins/browser"

import type {
  VacancyDetails,
  JobSite,
  SearchCriteria,
} from "@/plugins/job-site"

import {
  extractAbsoluteLinks,
  withOpenedPage,
} from "@/plugins/job-site/utils/index.js"

import {
  extractJsonLd,
  normalizeAndJoinText,
  normalizeOptionalText,
  isRecord,
  stringField,
} from "@/utils/index.js"

export const SUPPORTED_MODES = [
  "employment",
  "entry-level",
  "apprenticeship",
] as const

export function createXingSite(browser: Browser): JobSite {
  return new XingSite(browser)
}

class XingSite implements JobSite {
  constructor(private readonly browser: Browser) {}

  readonly name = "xing"
  readonly supportedModes = [...SUPPORTED_MODES]

  async getVacancyList(criteria: SearchCriteria, pageId?: string) {
    const page = await this.browser.openPage(buildSearchUrl(criteria, pageId))
    try {
      const urls = extractLinks(page.html)
      return {
        urls,
        nextPageId:
          urls.length > 0 ? String(Number(pageId ?? "1") + 1) : undefined,
      }
    } finally {
      await page.close()
    }
  }

  async getVacancyDetails(url: string) {
    return withOpenedPage(this.browser, url, (html) =>
      extractVacancy(html, url),
    )
  }
}

function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html)
  const ld = extractFromPosting(extractJsonLd($, "JobPosting"))

  const text = (selector: string) =>
    normalizeOptionalText($(selector).first().text())

  return {
    url,
    title: ld.title ?? text("h1") ?? "",
    company: ld.company ?? text(SELECTORS.company) ?? "",
    address: ld.address ?? text(SELECTORS.address),
    descriptionHtml: ld.descriptionHtml,
    publishedAt: ld.publishedAt,
    contact: extractContact($),
  }
}

function extractLinks(html: string): string[] {
  return extractAbsoluteLinks(html, {
    selector: "a[href*='/jobs/']",
    hrefPattern: /\/jobs\/[a-z].*-\d+$/,
    baseUrl: BASE_URL,
  })
}

const BASE_URL = "https://www.xing.com"

function buildSearchUrl(criteria: SearchCriteria, pageId?: string): string {
  const qs = new URLSearchParams()
  if (criteria.query) qs.set("keywords", criteria.query)
  qs.set("location", criteria.location)
  qs.set("radius", String(criteria.radiusKm))
  const pageNumber = Number(pageId ?? "1")
  if (pageNumber > 1) qs.set("page", String(pageNumber))
  const cl = modeToCareerLevel(criteria.mode)
  if (cl) qs.set("career_level", cl)
  return `${BASE_URL}/jobs/search?${qs.toString()}`
}

function extractFromPosting(jsonLd: object | undefined) {
  const posting = asJobPosting(jsonLd)
  return {
    title: posting?.title,
    company: posting?.hiringOrganization?.name,
    descriptionHtml: posting?.description,
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

function extractContact($: cheerio.CheerioAPI): { email: string } | undefined {
  const emailHref = $(SELECTORS.contactEmail).first().attr("href")
  const contactEmail = normalizeOptionalText(emailHref?.replace(/^mailto:/, ""))
  return contactEmail ? { email: contactEmail } : undefined
}

const SELECTORS = {
  company:
    "[data-testid='company-name'], [class*='company-name'], [class*='Company']",
  address:
    "[data-testid='job-location'], [class*='location'], [class*='Location']",
  contactEmail: "a[href^='mailto:']",
}

function modeToCareerLevel(mode: string): string {
  if (mode === "apprenticeship") return "APPRENTICESHIP"
  if (mode === "entry-level") return "ENTRY_LEVEL"
  return ""
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
