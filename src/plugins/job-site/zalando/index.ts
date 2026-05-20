import * as cheerio from "cheerio/slim"
import type { Browser } from "@/plugins/browser"
import type {
  JobSite,
  JobSiteProvider,
  SearchCriteria,
  VacancyDetails,
} from "@/plugins/job-site"
import { Address } from "@/models/common"
import { makeDateString } from "../date-string.js"
import { extractAbsoluteLinks } from "@/plugins/job-site/utils/index.js"
import { normalizeOptionalText } from "@/utils/index.js"

export const ZalandoProvider: JobSiteProvider = {
  id: "zalando",
  name: "zalando",
  supportedModes: ["employment"],
  createScraper: (browser: Browser) => new ZalandoSite(browser),
}

class ZalandoSite implements JobSite {
  constructor(private readonly browser: Browser) {}

  async getVacancyList(criteria: SearchCriteria, pageId?: string) {
    const page = await this.browser.openPage(buildSearchUrl(criteria, pageId), {
      waitFor: "a[href*='/en/jobs/']",
      blockPatterns: BLOCK_PATTERNS,
    })
    try {
      const urls = extractLinks(page.html)
      return {
        urls,
        nextPageId:
          urls.length > 0 ? String(Number(pageId ?? "0") + 15) : undefined,
      }
    } finally {
      await page.close()
    }
  }

  async getVacancyDetails(url: string) {
    const page = await this.browser.openPage(url, {
      blockPatterns: BLOCK_PATTERNS,
    })
    try {
      return extractVacancy(page.html, url)
    } finally {
      await page.close()
    }
  }
}

function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html)

  const title = $(SELECTORS.title).first().text().trim()

  const rawAddress = normalizeOptionalText(
    $("dt")
      .filter((_index, element) => $(element).text().trim() === "Location")
      .first()
      .next("dd")
      .text(),
  )

  let descriptionHtml = ""
  let maxLength = 0
  $("section").each((_index, element) => {
    const text = $(element).text().trim()
    if (
      text.length > 500 &&
      !text.includes("Application Form") &&
      text.length > maxLength
    ) {
      descriptionHtml = $(element).html() || ""
      maxLength = text.length
    }
  })

  const recSection = $("strong")
    .filter((_index, element) => $(element).text().trim() === "Recruiter")
    .closest("section")
  const recName = normalizeOptionalText(recSection.find("p").first().text())
  const recEmail = normalizeOptionalText(recSection.find("p").eq(1).text())

  return {
    url,
    title,
    company: "Zalando",
    address: parseFlatAddress(rawAddress ?? ""),
    descriptionHtml,
    startDate: makeDateString(""),
    publishedAt: makeDateString(""),
    contact: { name: recName ?? "", email: recEmail ?? "", phone: "" },
  }
}

function parseFlatAddress(raw: string): Address {
  const address = new Address()
  if (!raw) return address
  const parts = raw.split(", ").map((p) => p.trim())
  if (parts.length >= 2) {
    address.street = parts[0]
    const lastPart = parts.at(-1)
    const cityParts = lastPart.split(" ")
    if (cityParts.length >= 2) {
      address.zip = cityParts[0]
      address.city = cityParts.slice(1).join(" ")
    } else {
      address.city = lastPart
    }
  } else {
    address.city = parts[0] ?? ""
  }
  return address
}

function extractLinks(html: string): string[] {
  return extractAbsoluteLinks(html, {
    selector: SELECTORS.jobLink,
    hrefPattern: /\/en\/jobs\/\d+/,
    baseUrl: BASE_URL,
  })
}

function buildSearchUrl(criteria: SearchCriteria, pageId?: string): string {
  const q = encodeURIComponent(criteria.query)
  const location = encodeURIComponent(criteria.location)
  const offset = Number(pageId ?? "0")
  return `${BASE_URL}/en/jobs?q=${q}&location=${location}&offset=${offset}`
}

const BASE_URL = "https://jobs.zalando.com"
const BLOCK_PATTERNS = [/usercentrics\.eu/]

const SELECTORS = {
  jobLink: "a[href*='/en/jobs/']",
  title: "h1",
}
