import * as cheerio from "cheerio/slim";
import type { Browser } from "@/plugins/browser/types.js";
import type {
  VacancyDetails,
  JobSite,
  SearchCriteria,
} from "@/plugins/job-site/types.js";
import { extractJobPostingFromJsonLd } from "@/plugins/job-site/json-ld/index.js";

const BASE_URL = "https://www.xing.com";

export const SUPPORTED_MODES = [
  "employment",
  "entry-level",
  "apprenticeship",
] as const;

const SELECTORS = {
  company:
    "[data-testid='company-name'], [class*='company-name'], [class*='Company']",
  address:
    "[data-testid='job-location'], [class*='location'], [class*='Location']",
  contactEmail: "a[href^='mailto:']",
};

function modeToCareerLevel(mode: string): string {
  if (mode === "apprenticeship") return "APPRENTICESHIP";
  if (mode === "entry-level") return "ENTRY_LEVEL";
  return "";
}

function buildSearchUrl(criteria: SearchCriteria, pageId?: string): string {
  const qs = new URLSearchParams();
  if (criteria.query) qs.set("keywords", criteria.query);
  qs.set("location", criteria.location);
  qs.set("radius", String(criteria.radiusKm ?? 30));
  const pageNum = Number(pageId ?? "1");
  if (pageNum > 1) qs.set("page", String(pageNum));
  const cl = modeToCareerLevel(criteria.mode);
  if (cl) qs.set("career_level", cl);
  return `${BASE_URL}/jobs/search?${qs.toString()}`;
}

function extractLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a[href*='/jobs/']").each((_i, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (!/\/jobs\/[a-z].*-\d+$/.test(href)) return;
    const full = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    urls.add(full);
  });
  return [...urls];
}

function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html);

  const jsonLd = extractJobPostingFromJsonLd($);
  let { title, company, address } = jsonLd ?? {};
  const descriptionHtml = jsonLd?.descriptionHtml;
  const publishedAt = jsonLd?.publishedAt;

  const text = (sel: string) => $(sel).first().text().trim() || undefined;
  if (!title) title = text("h1");
  if (!company) company = text(SELECTORS.company);
  if (!address) address = text(SELECTORS.address);

  const emailHref = $(SELECTORS.contactEmail).first().attr("href");
  const contactEmail = emailHref?.replace("mailto:", "") || undefined;

  return {
    url,
    title,
    company,
    address,
    descriptionHtml,
    publishedAt,
    contact: contactEmail ? { email: contactEmail } : undefined,
  };
}

class XingSite implements JobSite {
  readonly name = "xing";
  readonly supportedModes = [...SUPPORTED_MODES];

  constructor(private readonly browser: Browser) {}

  async getVacancyList(criteria: SearchCriteria, pageId?: string) {
    const page = await this.browser.openPage(buildSearchUrl(criteria, pageId));
    try {
      const urls = extractLinks(page.html);
      return {
        urls,
        nextPageId:
          urls.length > 0 ? String(Number(pageId ?? "1") + 1) : undefined,
      };
    } finally {
      await page.close();
    }
  }

  async getVacancyDetails(url: string) {
    const page = await this.browser.openPage(url);
    try {
      return extractVacancy(page.html, url);
    } finally {
      await page.close();
    }
  }
}

export function createXingSite(browser: Browser): JobSite {
  return new XingSite(browser);
}
