import type {
  JobSite,
  SearchCriteria,
  SearchMode,
} from "@/plugins/job-site/types.js";
import type { LlmClient } from "@/plugins/llm/types.js";
import type { CommuteClient } from "@/plugins/commute/types.js";
import type { Applicant } from "@/models/applicant/types.js";
import type { SearchPreferences } from "@/models/job-search/types.js";
import type { Vacancy } from "@/models/vacancy/index.js";
import type { ProgressEvent } from "@/models/events.js";
import { processOneCrawlResult, type ProcessOneResult } from "./unify.js";
import { computeCommutes } from "./commute.js";
import { assessVacancy, needsAssessment } from "./assess.js";
import {
  needsContactExtraction,
  extractContactInfo,
  mergeContactInfo,
} from "./extract-contact.js";
import { formatError } from "./format-error.js";

export type SearchParameters = {
  location: string;
  query: string;
  radiusKm: number;
};

export async function scanVacancies(
  options: ScanVacanciesOptions,
): Promise<ScanVacanciesResult> {
  const enricher = createVacancyEnricher(buildEnrichDeps(options));
  const context: ScanContext = {
    searchParams: options.searchParams,
    mode: options.mode,
    limit: options.limit,
    crawlDate: options.crawlDate,
    existingByHash: options.existingByHash,
    signal: options.signal,
    onProgress: options.onProgress,
    onVacancyProcessed: options.onVacancyProcessed,
    enrichDeps: buildEnrichDeps(options),
    allUrls: new Set<string>(),
    seenHashes: new Set<string>(),
    newCount: 0,
    updatedCount: 0,
    enrichedCount: 0,
  };

  for (const site of options.sites) {
    if (context.signal?.aborted) break;
    await scanSitePages(site, context, enricher);
  }

  return {
    seenHashes: context.seenHashes,
    newCount: context.newCount,
    updatedCount: context.updatedCount,
    enrichedCount: context.enrichedCount,
  };
}

function buildEnrichDeps(options: ScanVacanciesOptions): EnrichDeps {
  return {
    commuteClient: options.commuteClient,
    commuteOrigin: options.commuteOrigin,
    llmClient: options.llmClient,
    applicant: options.applicant,
    preferences: options.preferences,
    signal: options.signal,
  };
}

function createVacancyEnricher(deps: EnrichDeps): VacancyEnricher {
  return {
    shouldEnrich(result) {
      return (
        result.isNew ||
        result.descriptionChanged ||
        needsContactExtraction(result.vacancy)
      );
    },
    enrich(vacancy) {
      return enrichVacancy(vacancy, deps);
    },
  };
}

async function scanSitePages(
  site: JobSite,
  context: ScanContext,
  enricher: VacancyEnricher,
): Promise<void> {
  const effectiveMode = resolveEffectiveMode(site, context.mode);
  if (!effectiveMode) return;

  emitProgress(context, {
    message: `Scanning ${site.name}...`,
    phase: "search",
  });

  const siteUrls = new Set<string>();
  const criteria = { ...context.searchParams, mode: effectiveMode };
  let pageId: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    if (isAborted(context)) break;

    const listResult = await fetchSearchPage(site, criteria, pageId, page + 1);
    if (!listResult) break;

    const newUrls = collectNewUrls(listResult.urls, siteUrls, context.allUrls);
    if (newUrls.length === 0) break;

    emitProgress(context, {
      message: `[${site.name}] Search (${effectiveMode}) page ${page + 1}: ${siteUrls.size} URLs found`,
      phase: "search",
    });

    await processPageUrls(
      site,
      sliceToLimit(newUrls, siteUrls.size, context.limit),
      context,
      enricher,
    );

    if (
      !shouldContinuePaging(listResult.nextPageId, siteUrls.size, context.limit)
    )
      break;
    pageId = listResult.nextPageId;
  }
}

async function enrichVacancy(
  vacancy: Vacancy,
  deps: EnrichDeps,
): Promise<Vacancy> {
  const commuted = await tryComputeCommute(vacancy, deps);
  return tryLlmEnrich(commuted, deps);
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
  context: ScanContext,
  enricher: VacancyEnricher,
): Promise<void> {
  for (const url of urls) {
    if (context.signal?.aborted) break;
    await processOneUrl(site, url, context, enricher);
  }
}

async function processOneUrl(
  site: JobSite,
  url: string,
  context: ScanContext,
  enricher: VacancyEnricher,
): Promise<void> {
  let details;
  try {
    details = await site.getVacancyDetails(url);
  } catch (error) {
    console.error(
      `[${site.name}] Failed to extract ${url}:`,
      formatError(error),
    );
    return;
  }

  const result = processOneCrawlResult(
    details,
    site.name,
    context.existingByHash,
    context.crawlDate,
  );

  const vacancy = await tryEnrich(result, context, enricher);

  context.existingByHash.set(result.hash, vacancy);
  context.seenHashes.add(result.hash);

  if (result.isNew) {
    context.newCount++;
  } else {
    context.updatedCount++;
  }

  context.onProgress?.({
    message: `[${site.name}] ${result.isNew ? "New" : "Updated"}: ${details.title || url}`,
    phase: "scan",
  });

  context.onVacancyProcessed?.(vacancy, result.hash, result.isNew);
}

async function tryEnrich(
  result: ProcessOneResult,
  context: ScanContext,
  enricher: VacancyEnricher,
): Promise<Vacancy> {
  if (!enricher.shouldEnrich(result)) {
    return result.vacancy;
  }
  const enriched = await enricher.enrich(result.vacancy, result);
  if (enriched !== result.vacancy) context.enrichedCount++;
  return enriched;
}

function collectNewUrls(
  listUrls: string[],
  siteUrls: Set<string>,
  allUrls: Set<string>,
): string[] {
  const newUrls = listUrls.filter((u) => !siteUrls.has(u) && !allUrls.has(u));
  for (const u of newUrls) {
    siteUrls.add(u);
    allUrls.add(u);
  }
  return newUrls;
}

function sliceToLimit(
  newUrls: string[],
  siteUrlCount: number,
  limit?: number,
): string[] {
  if (!limit) return newUrls;
  const alreadyProcessed = siteUrlCount - newUrls.length;
  const remaining = limit - alreadyProcessed;
  return remaining >= newUrls.length ? newUrls : newUrls.slice(0, remaining);
}

function shouldContinuePaging(
  nextPageId: string | undefined,
  siteUrlCount: number,
  limit?: number,
): boolean {
  return !!nextPageId && (!limit || siteUrlCount < limit);
}

function fetchSearchPage(
  site: JobSite,
  criteria: SearchCriteria,
  pageId: string | undefined,
  pageNumber: number,
) {
  try {
    return site.getVacancyList(criteria, pageId);
  } catch (error) {
    console.error(
      `[${site.name}] Failed to fetch search page ${pageNumber}:`,
      formatError(error),
    );
    return;
  }
}

function emitProgress(context: ScanContext, event: ProgressEvent): void {
  context.onProgress?.(event);
}

function isAborted(context: ScanContext): boolean {
  return context.signal?.aborted ?? false;
}

async function tryComputeCommute(
  vacancy: Vacancy,
  deps: EnrichDeps,
): Promise<Vacancy> {
  if (
    !deps.commuteClient ||
    !deps.commuteOrigin ||
    vacancy.addresses.length === 0
  ) {
    return vacancy;
  }
  try {
    const result = await computeCommutes({
      vacancies: [vacancy],
      origin: deps.commuteOrigin,
      commuteClient: deps.commuteClient,
      signal: deps.signal,
    });
    return result.vacancies[0];
  } catch (error) {
    console.error(
      `Failed to compute commute for "${vacancy.title}":`,
      formatError(error),
    );
    return vacancy;
  }
}

async function tryLlmEnrich(
  vacancy: Vacancy,
  deps: EnrichDeps,
): Promise<Vacancy> {
  if (!deps.llmClient || !deps.applicant || !deps.preferences) return vacancy;

  const [assessmentResult, contactResult] = await runLlmEnrichment(
    vacancy,
    deps.applicant,
    deps.preferences,
    deps.llmClient,
  );

  let updated = vacancy;
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
  return updated;
}

function runLlmEnrichment(
  vacancy: Vacancy,
  applicant: Applicant,
  preferences: SearchPreferences,
  llmClient: LlmClient,
) {
  return Promise.all([
    needsAssessment(vacancy)
      ? assessVacancy(vacancy, applicant, preferences, llmClient).catch(
          (error) => {
            console.error(
              `Failed to assess "${vacancy.title}":`,
              formatError(error),
            );
            return;
          },
        )
      : undefined,
    needsContactExtraction(vacancy)
      ? extractContactInfo(vacancy, llmClient).catch((error) => {
          console.error(
            `Failed to extract contact for "${vacancy.title}":`,
            formatError(error),
          );
          return;
        })
      : undefined,
  ]);
}

interface ScanVacanciesOptions {
  sites: JobSite[];
  searchParams: SearchParameters;
  mode: SearchMode;
  limit?: number;
  crawlDate: string;
  existingByHash: Map<string, Vacancy>;
  signal?: AbortSignal;
  onProgress?: (event: ProgressEvent) => void;
  llmClient?: LlmClient;
  commuteClient?: CommuteClient;
  commuteOrigin?: string;
  applicant?: Applicant;
  preferences?: SearchPreferences;
  onVacancyProcessed?: (vacancy: Vacancy, hash: string, isNew: boolean) => void;
}

interface ScanVacanciesResult {
  seenHashes: Set<string>;
  newCount: number;
  updatedCount: number;
  enrichedCount: number;
}

interface VacancyEnricher {
  shouldEnrich: (result: ProcessOneResult) => boolean;
  enrich: (vacancy: Vacancy, result: ProcessOneResult) => Promise<Vacancy>;
}

interface ScanContext {
  searchParams: SearchParameters;
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

interface EnrichDeps {
  commuteClient?: CommuteClient;
  commuteOrigin?: string;
  llmClient?: LlmClient;
  applicant?: Applicant;
  preferences?: SearchPreferences;
  signal?: AbortSignal;
}

const MAX_PAGES = 20;
