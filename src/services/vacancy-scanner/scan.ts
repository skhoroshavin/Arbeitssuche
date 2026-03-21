import type { JobSite, SearchMode } from "@/plugins/job-site/types.js";
import type { LlmClient } from "@/plugins/llm/types.js";
import type { CommuteClient } from "@/plugins/commute/types.js";
import type { Applicant } from "@/models/applicant/types.js";
import type { SearchPreferences } from "@/models/job-search/types.js";
import type { Vacancy } from "@/models/vacancy/types.js";
import type { ProgressEvent } from "@/models/events.js";
import { processOneCrawlResult } from "@/services/vacancy-scanner/unify.js";
import { computeCommutes } from "@/services/vacancy-scanner/commute.js";
import {
  assessVacancy,
  needsAssessment,
} from "@/services/vacancy-scanner/assess.js";
import {
  needsContactExtraction,
  extractContactInfo,
  mergeContactInfo,
} from "@/services/vacancy-scanner/extract-contact.js";

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
        err instanceof Error ? err.message : String(err),
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
              err instanceof Error ? err.message : String(err),
            );
            return null;
          })
        : null,
      needsContactExtraction(updated)
        ? extractContactInfo(updated, deps.llmClient).catch((err) => {
            console.error(
              `Failed to extract contact for "${updated.title}":`,
              err instanceof Error ? err.message : String(err),
            );
            return null;
          })
        : null,
    ]);

    if (assessmentResult) {
      updated = {
        ...updated,
        summary: assessmentResult.summary,
        matchScore: assessmentResult.matchScore,
        descriptionChanged: false,
      };
    }
    if (contactResult) {
      updated = mergeContactInfo(updated, contactResult);
    }
  }

  return updated;
}

export async function scanVacancies(
  options: ScanVacanciesOptions,
): Promise<ScanVacanciesResult> {
  const {
    sites,
    searchParams,
    mode,
    limit,
    crawlDate,
    existingByHash,
    signal,
    onProgress,
    onVacancyProcessed,
  } = options;

  const enrichDeps: EnrichDeps = {
    commuteClient: options.commuteClient ?? null,
    commuteOrigin: options.commuteOrigin ?? null,
    llmClient: options.llmClient ?? null,
    applicant: options.applicant ?? null,
    preferences: options.preferences ?? null,
    signal,
  };

  const allUrls = new Set<string>();
  const seenHashes = new Set<string>();
  let newCount = 0;
  let updatedCount = 0;
  let enrichedCount = 0;

  for (const site of sites) {
    if (signal?.aborted) break;

    let effectiveMode: SearchMode | undefined;
    if (site.supportedModes.includes(mode)) {
      effectiveMode = mode;
    } else if (
      mode === "entry-level" &&
      site.supportedModes.includes("employment")
    ) {
      effectiveMode = "employment";
    }
    if (!effectiveMode) continue;

    onProgress?.({
      message: `Scanning ${site.name}...`,
      phase: "search",
    });

    const siteUrls = new Set<string>();
    const criteria = { ...searchParams, mode: effectiveMode };
    let pageId: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      if (signal?.aborted) break;

      let listResult;
      try {
        listResult = await site.getVacancyList(criteria, pageId);
      } catch (err) {
        console.error(
          `[${site.name}] Failed to fetch search page ${page + 1}:`,
          err instanceof Error ? err.message : String(err),
        );
        break;
      }

      const newUrls = listResult.urls.filter(
        (u) => !siteUrls.has(u) && !allUrls.has(u),
      );
      if (newUrls.length === 0) break;

      for (const u of newUrls) {
        siteUrls.add(u);
        allUrls.add(u);
      }

      onProgress?.({
        message: `[${site.name}] Search (${effectiveMode}) page ${page + 1}: ${siteUrls.size} URLs found`,
        phase: "search",
        current: page + 1,
      });

      const urlsFromPage = limit
        ? newUrls.slice(0, limit - (siteUrls.size - newUrls.length))
        : newUrls;

      for (const url of urlsFromPage) {
        if (signal?.aborted) break;

        let details;
        try {
          details = await site.getVacancyDetails(url);
        } catch (err) {
          console.error(
            `[${site.name}] Failed to extract ${url}:`,
            err instanceof Error ? err.message : String(err),
          );
          continue;
        }

        const result = processOneCrawlResult(
          details,
          site.name,
          existingByHash,
          crawlDate,
        );

        let vacancy = result.vacancy;
        const shouldEnrich =
          result.isNew ||
          result.descriptionChanged ||
          needsContactExtraction(vacancy);

        if (shouldEnrich) {
          const enriched = await enrichVacancy(vacancy, enrichDeps);
          if (enriched !== vacancy) {
            vacancy = enriched;
            enrichedCount++;
          }
        }

        existingByHash.set(result.hash, vacancy);
        seenHashes.add(result.hash);

        if (result.isNew) {
          newCount++;
        } else {
          updatedCount++;
        }

        onProgress?.({
          message: `[${site.name}] ${result.isNew ? "New" : "Updated"}: ${details.title ?? url}`,
          phase: "scan",
        });

        onVacancyProcessed?.(vacancy, result.hash, result.isNew);
      }

      if (!listResult.nextPageId) break;
      if (limit && siteUrls.size >= limit) break;
      pageId = listResult.nextPageId;
    }
  }

  return { seenHashes, newCount, updatedCount, enrichedCount };
}
