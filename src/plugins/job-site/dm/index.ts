import * as cheerio from "cheerio/slim";
import type { Browser } from "@/plugins/browser/types.js";
import type {
  VacancyDetails,
  JobSite,
  SearchCriteria,
} from "@/plugins/job-site/types.js";
import { extractJsonLd } from "@/utils/json-ld.js";

const BASE_URL = "https://www.dm-jobs.de";
const BLOCK_PATTERNS = [/usercentrics\.eu/];

export const SUPPORTED_MODES = ["employment", "apprenticeship"] as const;

const SEARCH_READY_SELECTOR = "a[href*='/job/']";

function buildSearchUrl(criteria: SearchCriteria): string {
  const qs = new URLSearchParams();
  if (criteria.mode === "apprenticeship") {
    qs.set("jobType[0]", "Ausbildung");
  }
  qs.set("region", criteria.location);
  return `${BASE_URL}/job-listing/?${qs}`;
}

function extractLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a[href*='/job/']").each((_i, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (!/\/job\/[^/]+\/\d+/.test(href)) return;
    const full = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    urls.add(full);
  });
  return [...urls];
}

function str(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined;
}

function extractJobPostingAddress(
  data: Record<string, unknown>,
): string | undefined {
  const loc = Array.isArray(data.jobLocation)
    ? data.jobLocation[0]
    : data.jobLocation;
  if (!loc || typeof loc !== "object" || !("address" in loc)) return undefined;
  const addr = loc.address;
  if (!addr || typeof addr !== "object") return undefined;
  const a: Record<string, unknown> = Object.assign({}, addr);
  return (
    [str(a.streetAddress), str(a.postalCode), str(a.addressLocality)]
      .filter(Boolean)
      .join(", ") || undefined
  );
}

function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html);

  const jsonLd = extractJsonLd($, "JobPosting");
  const org = jsonLd?.hiringOrganization;
  let title = str(jsonLd?.title);
  let company =
    org && typeof org === "object" && "name" in org ? str(org.name) : undefined;
  let address = jsonLd ? extractJobPostingAddress(jsonLd) : undefined;
  let descriptionHtml = str(jsonLd?.description);
  const publishedAt = str(jsonLd?.datePosted);

  if (!title) title = $("h1").first().text().trim() || undefined;
  if (!company) company = "dm";
  if (!address) {
    address =
      $("dt")
        .filter((_i, el) => $(el).text().trim() === "Adresse")
        .first()
        .next("dd")
        .text()
        .trim() || undefined;
  }

  if (!descriptionHtml) {
    const parts: string[] = [];
    $("h2").each((_i, el) => {
      const heading = $(el).text().trim();
      const siblingHtml = $(el).next().html();
      if (heading && siblingHtml) {
        parts.push(`<h2>${heading}</h2>${siblingHtml}`);
      }
    });
    if (parts.length > 0) descriptionHtml = parts.join("");
  }

  return {
    url,
    title,
    company,
    address,
    descriptionHtml,
    publishedAt,
  };
}

class DmSite implements JobSite {
  readonly name = "dm";
  readonly supportedModes = [...SUPPORTED_MODES];

  constructor(private readonly browser: Browser) {}

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

export function createDmSite(browser: Browser): JobSite {
  return new DmSite(browser);
}
