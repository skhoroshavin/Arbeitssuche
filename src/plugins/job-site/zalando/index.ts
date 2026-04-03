import * as cheerio from "cheerio/slim";
import type { Browser } from "@/plugins/browser/types.js";
import type {
  VacancyContact,
  VacancyDetails,
  JobSite,
  SearchCriteria,
} from "@/plugins/job-site/types.js";
import { extractAbsoluteLinks } from "@/plugins/page-utilities/index.js";
import { normalizeOptionalText } from "@/utils/index.js";

export function createZalandoSite(browser: Browser): JobSite {
  return new ZalandoSite(browser);
}

class ZalandoSite implements JobSite {
  constructor(private readonly browser: Browser) {}

  readonly name = "zalando";
  readonly supportedModes = [...SUPPORTED_MODES];

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

function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html);

  const title = $(SELECTORS.title).first().text().trim();

  const address = normalizeOptionalText(
    $("dt")
      .filter((_index, element) => $(element).text().trim() === "Location")
      .first()
      .next("dd")
      .text(),
  );

  let descriptionHtml: string | undefined;
  let maxLength = 0;
  $("section").each((_index, element) => {
    const text = $(element).text().trim();
    if (
      text.length > 500 &&
      !text.includes("Application Form") &&
      text.length > maxLength
    ) {
      descriptionHtml = $(element).html() || undefined;
      maxLength = text.length;
    }
  });

  const recSection = $("strong")
    .filter((_index, element) => $(element).text().trim() === "Recruiter")
    .closest("section");
  const recName = normalizeOptionalText(recSection.find("p").first().text());
  const recEmail = normalizeOptionalText(recSection.find("p").eq(1).text());

  return {
    url,
    title,
    company: "Zalando",
    address,
    descriptionHtml,
    contact: createContact({ name: recName, email: recEmail }),
  };
}

function extractLinks(html: string): string[] {
  return extractAbsoluteLinks(html, {
    selector: SELECTORS.jobLink,
    hrefPattern: /\/en\/jobs\/\d+/,
    baseUrl: BASE_URL,
  });
}

function buildSearchUrl(criteria: SearchCriteria, pageId?: string): string {
  const q = encodeURIComponent(criteria.query);
  const location = encodeURIComponent(criteria.location);
  const offset = Number(pageId ?? "0");
  return `${BASE_URL}/en/jobs?q=${q}&location=${location}&offset=${offset}`;
}

function createContact(contact: VacancyContact): VacancyContact | undefined {
  const normalizedContact = {
    name: normalizeOptionalText(contact.name),
    email: normalizeOptionalText(contact.email),
    phone: normalizeOptionalText(contact.phone),
  };
  if (Object.values(normalizedContact).every((v) => v === undefined)) {
    return undefined;
  }
  return normalizedContact;
}

export const SUPPORTED_MODES = ["employment"] as const;

const BASE_URL = "https://jobs.zalando.com";
const PAGE_SIZE = 15;
const BLOCK_PATTERNS = [/usercentrics\.eu/];

const SELECTORS = {
  jobLink: "a[href*='/en/jobs/']",
  title: "h1",
};

const SEARCH_READY_SELECTOR = "a[href*='/en/jobs/']";
