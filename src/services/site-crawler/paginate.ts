import type {
  JobSite,
  SearchCriteria,
  SearchMode,
  VacancyListPage,
} from "@/plugins/job-site"
import type { JobSearchCriteria } from "@/models/job-search"
import { formatError } from "@/services/vacancy-scanner/index.js"

export function resolveEffectiveMode(
  supportedModes: readonly SearchMode[],
  mode: SearchMode,
): SearchMode | undefined {
  if (supportedModes.includes(mode)) {
    return mode
  }
  if (mode === "entry-level" && supportedModes.includes("employment")) {
    return "employment"
  }
  return undefined
}

export function derivePluginCriteria(
  criteria: JobSearchCriteria,
  effectiveMode: SearchMode,
): SearchCriteria {
  return {
    location: criteria.location,
    query: criteria.query,
    radiusKm: criteria.radiusKm,
    mode: effectiveMode,
  }
}

export async function fetchSearchPage(
  scraper: JobSite,
  siteName: string,
  criteria: SearchCriteria,
  pageId: string | undefined,
  pageNumber: number,
): Promise<VacancyListPage | undefined> {
  try {
    return await scraper.getVacancyList(criteria, pageId)
  } catch (error) {
    console.error(
      `[${siteName}] Failed to fetch search page ${pageNumber}:`,
      formatError(error),
    )
    return undefined
  }
}

export function collectNewUrls(
  listUrls: string[],
  siteUrls: Set<string>,
  allUrls: Set<string>,
): string[] {
  const newUrls = listUrls.filter((u) => !siteUrls.has(u) && !allUrls.has(u))
  for (const u of newUrls) {
    siteUrls.add(u)
    allUrls.add(u)
  }
  return newUrls
}

export function sliceToLimit(
  newUrls: string[],
  siteUrlCount: number,
  limit?: number,
): string[] {
  if (!limit) return newUrls
  const alreadyProcessed = siteUrlCount - newUrls.length
  const remaining = limit - alreadyProcessed
  return remaining >= newUrls.length ? newUrls : newUrls.slice(0, remaining)
}

export function shouldContinuePaging(
  nextPageId: string | undefined,
  siteUrlCount: number,
  limit?: number,
): boolean {
  return !!nextPageId && (!limit || siteUrlCount < limit)
}
