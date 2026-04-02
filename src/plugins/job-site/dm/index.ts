import typia from "typia";
import * as cheerio from "cheerio/slim";
import type { Browser } from "@/plugins/browser/types.js";
import type {
  VacancyDetails,
  JobSite,
  JobPostingJsonLd,
  SearchCriteria,
} from "@/plugins/job-site/types.js";
import { extractAddressFromJsonLd, extractJsonLd } from "@/utils/json-ld.js";
import { normalizeOptionalText } from "@/utils/text.js";

export function createDmSite(browser: Browser): JobSite {
  return new DmSite(browser);
}

class DmSite implements JobSite {
  constructor(private readonly browser: Browser) {}

  readonly name = "dm";
  readonly supportedModes = [...SUPPORTED_MODES];

  async getVacancyList(criteria: SearchCriteria) {
    const page = await this.browser.openPage(buildSearchUrl(criteria), {
      waitFor: SEARCH_READY_SELECTOR,
      blockPatterns: BLOCK_PATTERNS,
    });
    try {
      const urls = extractLinks(page.html);
      return { urls, nextPageId: undefined };
    } finally {
      await page.close();
    }
  }

  async getVacancyDetails(url: string) {
    const page = await this.browser.openPage(url, {
      waitFor: SEARCH_READY_SELECTOR,
      blockPatterns: BLOCK_PATTERNS,
    });
    try {
      return extractVacancy(page.html, url);
    } finally {
      await page.close();
    }
  }
}

function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html);
  const ld = extractFromPosting(extractJsonLd($, "JobPosting"));

  return {
    url,
    title: ld.title ?? $("h1").first().text().trim(),
    company: ld.company ?? "dm",
    address: ld.address ?? extractAddressFallback($),
    descriptionHtml: ld.description ?? extractDescriptionFallback($),
    publishedAt: ld.publishedAt,
  };
}

function extractLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a[href*='/job/']").each((_index, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    if (!/\/job\/[^/]+\/\d+/.test(href)) return;
    const full = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    urls.add(full);
  });
  return [...urls];
}

function buildSearchUrl(criteria: SearchCriteria): string {
  const qs = new URLSearchParams();
  if (criteria.mode === "apprenticeship") {
    qs.set("jobType[0]", "Ausbildung");
  }
  qs.set("region", criteria.location);
  return `${BASE_URL}/job-listing/?${qs}`;
}

function extractFromPosting(jsonLd: object | undefined) {
  const posting = typia.is<JobPostingJsonLd>(jsonLd) ? jsonLd : undefined;
  return {
    title: posting?.title,
    company: posting?.hiringOrganization?.name,
    description: posting?.description,
    publishedAt: posting?.datePosted,
    address: extractAddressFromJsonLd(posting),
  };
}

function extractAddressFallback($: cheerio.CheerioAPI): string | undefined {
  return normalizeOptionalText(
    $("dt")
      .filter((_index, element) => $(element).text().trim() === "Adresse")
      .first()
      .next("dd")
      .text(),
  );
}

function extractDescriptionFallback($: cheerio.CheerioAPI): string | undefined {
  const parts: string[] = [];
  $("h2").each((_index, element) => {
    const heading = $(element).text().trim();
    const siblingHtml = $(element).next().html();
    if (heading && siblingHtml) {
      parts.push(`<h2>${heading}</h2>${siblingHtml}`);
    }
  });
  return parts.length > 0 ? parts.join("") : undefined;
}

export const SUPPORTED_MODES = ["employment", "apprenticeship"] as const;

const BASE_URL = "https://www.dm-jobs.de";
const BLOCK_PATTERNS = [/usercentrics\.eu/];
const SEARCH_READY_SELECTOR = "a[href*='/job/']";
