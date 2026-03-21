import type { Browser } from "@/plugins/browser/types.js";
import type {
  VacancyDetails,
  JobSite,
  SearchCriteria,
} from "@/plugins/job-site/types.js";

const API_BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";
const API_KEY = "jobboerse-jobsuche";
const SITE_BASE = "https://www.arbeitsagentur.de";
const API_HEADERS = { "X-API-Key": API_KEY };

export const SUPPORTED_MODES = [
  "employment",
  "entry-level",
  "apprenticeship",
] as const;

interface ApiSearchResult {
  refnr: string;
}

interface ApiSearchResponse {
  stellenangebote?: ApiSearchResult[];
  maxErgebnisse: number;
  page: number;
  size: number;
}

interface ApiJobDetails {
  stellenangebotsTitel?: string;
  stellenangebotsBeschreibung?: string;
  firma?: string;
  stellenlokationen?: Array<{
    adresse?: {
      strasse?: string;
      plz?: string;
      ort?: string;
    };
  }>;
  eintrittszeitraum?: { von?: string };
  veroeffentlichungszeitraum?: { von?: string };
  referenznummer?: string;
}

function modeToAngebotsart(mode: string): string {
  if (mode === "apprenticeship") return "4";
  return "1";
}

export function buildSearchApiUrl(
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
  qs.set("page", String(pageNum));
  qs.set("size", "25");
  return `${API_BASE}/pc/v4/jobs?${qs.toString()}`;
}

function nonNull(value?: string): string | undefined {
  return value && value !== "null" ? value : undefined;
}

function buildAddressFromLocations(
  locations?: ApiJobDetails["stellenlokationen"],
): string | undefined {
  if (!locations?.length) return undefined;
  const addr = locations[0].adresse;
  if (!addr) return undefined;
  const parts = [
    nonNull(addr.strasse),
    [nonNull(addr.plz), nonNull(addr.ort)].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return parts || undefined;
}

function refnrToUrl(refnr: string): string {
  const encoded = btoa(refnr);
  return `${SITE_BASE}/jobsuche/jobdetail/${encoded}`;
}

export function mapSearchResponse(data: ApiSearchResponse): {
  urls: string[];
  nextPageId: string | undefined;
} {
  const items = data.stellenangebote ?? [];
  const urls = items.map((item) => refnrToUrl(item.refnr));
  const totalPages = Math.ceil(data.maxErgebnisse / data.size);
  const nextPageId =
    items.length > 0 && data.page < totalPages
      ? String(data.page + 1)
      : undefined;
  return { urls, nextPageId };
}

export function mapDetailsResponse(
  data: ApiJobDetails,
  url: string,
): VacancyDetails {
  return {
    url,
    title: data.stellenangebotsTitel,
    company: data.firma,
    address: buildAddressFromLocations(data.stellenlokationen),
    descriptionHtml: data.stellenangebotsBeschreibung,
    startDate: data.eintrittszeitraum?.von,
    publishedAt: data.veroeffentlichungszeitraum?.von,
    contact: undefined,
  };
}

function assertOk(res: Response, url: string): void {
  if (!res.ok) {
    throw new Error(
      `Arbeitsagentur API error: ${res.status} ${res.statusText} for ${url}`,
    );
  }
}

class ArbeitsagenturSite implements JobSite {
  readonly name = "arbeitsagentur";
  readonly supportedModes = [...SUPPORTED_MODES];

  constructor(_browser: Browser) {}

  async getVacancyList(criteria: SearchCriteria, pageId?: string) {
    const url = buildSearchApiUrl(criteria, pageId);
    const res = await fetch(url, { headers: API_HEADERS });
    assertOk(res, url);
    const data: ApiSearchResponse = await res.json();
    return mapSearchResponse(data);
  }

  async getVacancyDetails(url: string) {
    const encodedRefnr = url.split("/").pop();
    if (!encodedRefnr) throw new Error(`Cannot extract refnr from URL: ${url}`);
    const apiUrl = `${API_BASE}/pc/v3/jobdetails/${encodedRefnr}`;
    const res = await fetch(apiUrl, { headers: API_HEADERS });
    assertOk(res, apiUrl);
    const data: ApiJobDetails = await res.json();
    return mapDetailsResponse(data, url);
  }
}

export function createArbeitsagenturSite(browser: Browser): JobSite {
  return new ArbeitsagenturSite(browser);
}
