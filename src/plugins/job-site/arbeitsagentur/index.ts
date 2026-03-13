import * as cheerio from "cheerio/slim";
import type { Browser } from "@/plugins/browser/types.js";
import type {
  VacancyDetails,
  JobSite,
  SearchCriteria,
} from "@/plugins/job-site/types.js";

const BASE_URL = "https://www.arbeitsagentur.de";

export const SUPPORTED_MODES = [
  "employment",
  "entry-level",
  "apprenticeship",
] as const;

const SELECTORS = {
  jobLink: "a[href*='/jobsuche/jobdetail/']",
  title: "[class*='titel'], h2",
  company: ".firma-lane",
  address: "[class*='arbeitsort'] li",
  contactEmail: "a[href^='mailto:']",
  contactPhone: "a[href^='tel:']",
  description: "jb-detailansicht",
  startDate: "#detail-kopfbereich-eintrittsdatum",
  publishedAt: "#detail-kopfbereich-veroeffentlichungsdatum",
};

const SEARCH_READY_SELECTOR = "a[href*='/jobsuche/jobdetail/']";
const VACANCY_READY_SELECTOR = "jb-detailansicht";

function modeToAngebotsart(mode: string): string {
  if (mode === "apprenticeship") return "4";
  return "1";
}

export function buildSearchUrl(
  criteria: SearchCriteria,
  pageId?: string,
): string {
  const qs = new URLSearchParams();
  if (criteria.query) qs.set("was", criteria.query);
  qs.set("wo", criteria.location);
  qs.set("angebotsart", modeToAngebotsart(criteria.mode));
  if (criteria.mode === "entry-level") qs.set("berufserfahrung", "BEL");
  qs.set("umkreis", String(criteria.radiusKm ?? 25));
  const pageNum = Number(pageId ?? "1");
  if (pageNum > 1) qs.set("page", String(pageNum));
  return `${BASE_URL}/jobsuche/suche?${qs.toString()}`;
}

export function extractLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $(SELECTORS.jobLink).each((_i, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const full = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    urls.add(full);
  });
  return [...urls];
}

export function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html);

  const text = (sel: string) => $(sel).first().text().trim() || undefined;

  const title = text(SELECTORS.title);
  const rawCompany = text(SELECTORS.company);
  const company =
    rawCompany?.replace(/^Arbeitgeber:\s*/i, "").trim() || rawCompany;
  const addresses = $(SELECTORS.address)
    .map((_i, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const address = addresses.join("; ") || undefined;

  const descriptionHtml = $(SELECTORS.description).html() || undefined;
  const startDate = text(SELECTORS.startDate);
  const publishedAtTitle = $(SELECTORS.publishedAt).attr("title");
  const publishedAt =
    publishedAtTitle?.replace(/^Veröffentlichungsdatum:\s*/i, "").trim() ||
    undefined;

  const emailHref = $(SELECTORS.contactEmail).first().attr("href");
  const contactEmail = emailHref?.replace("mailto:", "") || undefined;

  const phoneHref = $(SELECTORS.contactPhone).first().attr("href");
  const contactPhone = phoneHref?.replace("tel:", "") || undefined;

  return {
    url,
    title,
    company,
    address,
    descriptionHtml,
    startDate,
    publishedAt,
    contact:
      contactEmail || contactPhone
        ? { email: contactEmail, phone: contactPhone }
        : undefined,
  };
}

class ArbeitsagenturSite implements JobSite {
  readonly name = "arbeitsagentur";
  readonly supportedModes = [...SUPPORTED_MODES];

  constructor(private readonly browser: Browser) {}

  async getVacancyList(criteria: SearchCriteria, pageId?: string) {
    const page = await this.browser.openPage(buildSearchUrl(criteria, pageId), {
      waitFor: SEARCH_READY_SELECTOR,
    });
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
    const page = await this.browser.openPage(url, {
      waitFor: VACANCY_READY_SELECTOR,
    });
    try {
      return extractVacancy(page.html, url);
    } finally {
      await page.close();
    }
  }
}

export function createArbeitsagenturSite(browser: Browser): JobSite {
  return new ArbeitsagenturSite(browser);
}
