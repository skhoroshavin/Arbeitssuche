import type { JobSite, SearchMode } from "@/plugins/job-site/types.js";
import type { LlmClient } from "@/plugins/llm/types.js";
import type { CommuteClient } from "@/plugins/commute/types.js";
import type { Applicant } from "@/models/applicant/types.js";
import type { SearchPreferences } from "@/models/job-search/types.js";
import type { Vacancy } from "@/models/vacancy/vacancy.js";
import type { ProgressEvent } from "@/models/events.js";
import { processOneCrawlResult } from "./unify.js";
import { computeCommutes } from "./commute.js";
import { assessVacancy, needsAssessment } from "./assess.js";
import {
  needsContactExtraction,
  extractContactInfo,
  mergeContactInfo,
} from "./extract-contact.js";
import { formatError } from "./format-error.js";

export type SearchParams = {
  location: string;
  query: string;
  radiusKm: number;
};

const MAX_PAGES = 20;

export interface ScanVacanciesOptions {
  sites: JobSite[];
  searchParams: SearchParams;
  mode: SearchMode;
  limit?: number;
  crawlDate: string;
  existingByHash: Map<string, Vacancy>;
  signal?: AbortSignal;
  onProgress?: (event: ProgressEvent) => void;
  llmClient?: LlmClient | null;
  commuteClient?: CommuteClient | null;
  commuteOrigin?: string | null;
  applicant?: Applicant | null;
  preferences?: SearchPreferences | null;
  onVacancyProcessed?: (vacancy: Vacancy, hash: string, isNew: boolean) => void;
}

export interface ScanVacanciesResult {
  seenHashes: Set<string>;
  newCount: number;
  updatedCount: number;
  enrichedCount: number;
}

interface EnrichDeps {
  commuteClient: CommuteClient | null;
  commuteOrigin: string | null;
  llmClient: LlmClient | null;
  applicant: Applicant | null;
  preferences: SearchPreferences | null;
  signal?: AbortSignal;
}

interface ScanContext {
  searchParams: SearchParams;
  mode: SearchMode;
  limit?: number;
  crawlDate: string;
  existingByHash: Map<string, Vacancy>;
  signal?: AbortSignal;
  onProgress?: (event: ProgressEvent) => void;
  onVacancyProcessed?: (vacancy: Vacancy, hash: string, isNew: boolean) => void;
  enrichDeps: EnrichDeps;
  allUrls: Set<string>;
  seenHashes: Set<string>;
  newCount: number;
  updatedCount: number;
  enrichedCount: number;
}

async function enrichVacancy(
  vacancy: Vacancy,
  deps: EnrichDeps,
): Promise<Vacancy> {
  let updated = vacancy;

  if (
    deps.commuteClient &&
    deps.commuteOrigin &&
    updated.addresses.length > 0
  ) {
    try {
      const result = await computeCommutes({
        vacancies: [updated],
        origin: deps.commuteOrigin,
        commuteClient: deps.commuteClient,
        signal: deps.signal,
      });
      updated = result.vacancies[0];
    } catch (err) {
      console.error(
        `Failed to compute commute for "${vacancy.title}":`,
        formatError(err),
      );
    }
  }

  if (deps.llmClient && deps.applicant && deps.preferences) {
    const [assessmentResult, contactResult] = await Promise.all([
      needsAssessment(updated)
        ? assessVacancy(
            updated,
            deps.applicant,
            deps.preferences,
            deps.llmClient,
          ).catch((err) => {
            console.error(
              `Failed to assess "${updated.title}":`,
              formatError(err),
            );
            return null;
          })
        : null,
      needsContactExtraction(updated)
        ? extractContactInfo(updated, deps.llmClient).catch((err) => {
            console.error(
              `Failed to extract contact for "${updated.title}":`,
              formatError(err),
            );
            return null;
          })
        : null,
    ]);

    if (assessmentResult) {
      updated = updated.with({
        summary: assessmentResult.summary,
        matchScore: assessmentResult.matchScore,
        descriptionChanged: false,
      });
    }
    if (contactResult) {
      updated = mergeContactInfo(updated, contactResult);
    }
  }

  return updated;
}

function resolveEffectiveMode(
  site: JobSite,
  mode: SearchMode,
): SearchMode | undefined {
  if (site.supportedModes.includes(mode)) {
    return mode;
  }
  if (mode === "entry-level" && site.supportedModes.includes("employment")) {
    return "employment";
  }
  return undefined;
}

async function processPageUrls(
  site: JobSite,
  urls: string[],
  ctx: ScanContext,
): Promise<void> {
  for (const url of urls) {
    if (ctx.signal?.aborted) break;

    let details;
    try {
      details = await site.getVacancyDetails(url);
    } catch (err) {
      console.error(
        `[${site.name}] Failed to extract ${url}:`,
        formatError(err),
      );
      continue;
    }

    const result = processOneCrawlResult(
      details,
      site.name,
      ctx.existingByHash,
      ctx.crawlDate,
    );

    let vacancy = result.vacancy;
    const shouldEnrich =
      result.isNew ||
      result.descriptionChanged ||
      needsContactExtraction(vacancy);

    if (shouldEnrich) {
      const enriched = await enrichVacancy(vacancy, ctx.enrichDeps);
      if (enriched !== vacancy) {
        vacancy = enriched;
        ctx.enrichedCount++;
      }
    }

    ctx.existingByHash.set(result.hash, vacancy);
    ctx.seenHashes.add(result.hash);

    if (result.isNew) {
      ctx.newCount++;
    } else {
      ctx.updatedCount++;
    }

    ctx.onProgress?.({
      message: `[${site.name}] ${result.isNew ? "New" : "Updated"}: ${details.title ?? url}`,
      phase: "scan",
    });

    ctx.onVacancyProcessed?.(vacancy, result.hash, result.isNew);
  }
}

async function scanSitePages(site: JobSite, ctx: ScanContext): Promise<void> {
  const effectiveMode = resolveEffectiveMode(site, ctx.mode);
  if (!effectiveMode) return;

  ctx.onProgress?.({
    message: `Scanning ${site.name}...`,
    phase: "search",
  });

  const siteUrls = new Set<string>();
  const criteria = { ...ctx.searchParams, mode: effectiveMode };
  let pageId: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    if (ctx.signal?.aborted) break;

    let listResult;
    try {
      listResult = await site.getVacancyList(criteria, pageId);
    } catch (err) {
      console.error(
        `[${site.name}] Failed to fetch search page ${page + 1}:`,
        formatError(err),
      );
      break;
    }

    const newUrls = listResult.urls.filter(
      (u) => !siteUrls.has(u) && !ctx.allUrls.has(u),
    );
    if (newUrls.length === 0) break;

    for (const u of newUrls) {
      siteUrls.add(u);
      ctx.allUrls.add(u);
    }

    ctx.onProgress?.({
      message: `[${site.name}] Search (${effectiveMode}) page ${page + 1}: ${siteUrls.size} URLs found`,
      phase: "search",
      current: page + 1,
    });

    const urlsFromPage = ctx.limit
      ? newUrls.slice(0, ctx.limit - (siteUrls.size - newUrls.length))
      : newUrls;

    await processPageUrls(site, urlsFromPage, ctx);

    if (!listResult.nextPageId) break;
    if (ctx.limit && siteUrls.size >= ctx.limit) break;
    pageId = listResult.nextPageId;
  }
}

export async function scanVacancies(
  options: ScanVacanciesOptions,
): Promise<ScanVacanciesResult> {
  const ctx: ScanContext = {
    searchParams: options.searchParams,
    mode: options.mode,
    limit: options.limit,
    crawlDate: options.crawlDate,
    existingByHash: options.existingByHash,
    signal: options.signal,
    onProgress: options.onProgress,
    onVacancyProcessed: options.onVacancyProcessed,
    enrichDeps: {
      commuteClient: options.commuteClient ?? null,
      commuteOrigin: options.commuteOrigin ?? null,
      llmClient: options.llmClient ?? null,
      applicant: options.applicant ?? null,
      preferences: options.preferences ?? null,
      signal: options.signal,
    },
    allUrls: new Set<string>(),
    seenHashes: new Set<string>(),
    newCount: 0,
    updatedCount: 0,
    enrichedCount: 0,
  };

  for (const site of options.sites) {
    if (ctx.signal?.aborted) break;
    await scanSitePages(site, ctx);
  }

  return {
    seenHashes: ctx.seenHashes,
    newCount: ctx.newCount,
    updatedCount: ctx.updatedCount,
    enrichedCount: ctx.enrichedCount,
  };
}
