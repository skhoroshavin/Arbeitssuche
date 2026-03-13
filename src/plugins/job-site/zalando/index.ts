import * as cheerio from "cheerio/slim";
import type { Browser } from "@/plugins/browser/types.js";
import type {
  VacancyDetails,
  JobSite,
  SearchCriteria,
} from "@/plugins/job-site/types.js";

const BASE_URL = "https://jobs.zalando.com";
const PAGE_SIZE = 15;
const BLOCK_PATTERNS = [/usercentrics\.eu/];

export const SUPPORTED_MODES = ["employment"] as const;

const SELECTORS = {
  jobLink: "a[href*='/en/jobs/']",
  title: "h1",
};

const SEARCH_READY_SELECTOR = "a[href*='/en/jobs/']";

export function buildSearchUrl(
  criteria: SearchCriteria,
  pageId?: string,
): string {
  const q = encodeURIComponent(criteria.query);
  const location = encodeURIComponent(criteria.location);
  const offset = Number(pageId ?? "0");
  return `${BASE_URL}/en/jobs?q=${q}&location=${location}&offset=${offset}`;
}

export function extractLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $(SELECTORS.jobLink).each((_i, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (!/\/en\/jobs\/\d+/.test(href)) return;
    const full = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    urls.add(full);
  });
  return [...urls];
}

export function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html);

  const title = $(SELECTORS.title).first().text().trim() || undefined;

  const address =
    $("dt")
      .filter((_i, el) => $(el).text().trim() === "Location")
      .first()
      .next("dd")
      .text()
      .trim() || undefined;

  let descriptionHtml: string | undefined;
  let maxLen = 0;
  $("section").each((_i, el) => {
    const text = $(el).text().trim();
    if (
      text.length > 500 &&
      !text.includes("Application Form") &&
      text.length > maxLen
    ) {
      descriptionHtml = $(el).html() || undefined;
      maxLen = text.length;
    }
  });

  const recSection = $("strong")
    .filter((_i, el) => $(el).text().trim() === "Recruiter")
    .closest("section");
  const recName = recSection.find("p").first().text().trim() || undefined;
  const recEmail = recSection.find("p").eq(1).text().trim() || undefined;

  return {
    url,
    title,
    company: "Zalando",
    address,
    descriptionHtml,
    contact:
      recName || recEmail ? { name: recName, email: recEmail } : undefined,
  };
}

class ZalandoSite implements JobSite {
  readonly name = "zalando";
  readonly supportedModes = [...SUPPORTED_MODES];

  constructor(private readonly browser: Browser) {}

  async getVacancyList(criteria: SearchCriteria, pageId?: string) {
    const page = await this.browser.openPage(buildSearchUrl(criteria, pageId), {
      waitFor: SEARCH_READY_SELECTOR,
      blockPatterns: BLOCK_PATTERNS,
    });
    try {
      const urls = extractLinks(page.html);
      return {
        urls,
        nextPageId:
          urls.length > 0
            ? String(Number(pageId ?? "0") + PAGE_SIZE)
            : undefined,
      };
    } finally {
      await page.close();
    }
  }

  async getVacancyDetails(url: string) {
    const page = await this.browser.openPage(url, {
      blockPatterns: BLOCK_PATTERNS,
    });
    try {
      return extractVacancy(page.html, url);
    } finally {
      await page.close();
    }
  }
}

export function createZalandoSite(browser: Browser): JobSite {
  return new ZalandoSite(browser);
}
