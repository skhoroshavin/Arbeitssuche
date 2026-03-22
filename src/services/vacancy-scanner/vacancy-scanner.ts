import type { VacancyRepository } from "@/repositories/vacancy/types.js";
import type { JobSearchRepository } from "@/repositories/job-search/types.js";
import type { ApplicantRepository } from "@/repositories/applicant/types.js";
import type { LlmClient } from "@/plugins/llm/types.js";
import type { CommuteClient } from "@/plugins/commute/types.js";
import type { JobSite } from "@/plugins/job-site/types.js";
import type { Vacancy } from "@/models/vacancy/vacancy.js";
import type { ProgressEvent } from "@/models/events.js";
import { getJobSiteNames } from "@/plugins/job-site/index.js";
import { resolveSearchParams } from "./resolve-search-params.js";
import { scanVacancies } from "./scan.js";
import { markUnseenAsGone } from "./unify.js";

type JobSiteFactory = (name: string) => JobSite;
type OnProgress = (event: ProgressEvent) => void;

export class VacancyScanner {
  constructor(
    private readonly vacancyRepo: VacancyRepository,
    private readonly jobSearchRepo: JobSearchRepository,
    private readonly applicantRepo: ApplicantRepository,
    private readonly assessmentLlm: LlmClient | null,
    private readonly commuteClient: CommuteClient | null,
  ) {}

  async scan(
    id: string,
    abortController: AbortController,
    onProgress: OnProgress,
    siteFactory: JobSiteFactory,
  ): Promise<void> {
    const jobSearch = this.jobSearchRepo.load(id);
    const sitesToRun =
      jobSearch.params.sources.length > 0
        ? jobSearch.params.sources
        : getJobSiteNames();

    const applicant = this.applicantRepo.load(jobSearch.applicantId);
    const searchParams = resolveSearchParams(jobSearch, applicant);
    const crawlDate = new Date().toISOString().slice(0, 10);

    const existing = this.vacancyRepo.loadAll(id);
    const existingByHash = new Map<string, Vacancy>();
    for (const v of existing?.vacancies ?? []) {
      existingByHash.set(v.hash, v);
    }

    let commuteOrigin: string | null = null;
    if (this.commuteClient) {
      const address = applicant.personal.address;
      if (address) {
        commuteOrigin = `${address.street}, ${address.zip} ${address.city}`;
      }
    }

    const sites = sitesToRun.map((name) => siteFactory(name));

    let lastSaveTime = 0;

    const result = await scanVacancies({
      sites,
      searchParams,
      mode: jobSearch.params.searchMode,
      limit: jobSearch.params.maxResults,
      crawlDate,
      existingByHash,
      signal: abortController.signal,
      onProgress,
      llmClient: this.assessmentLlm,
      commuteClient: this.commuteClient,
      commuteOrigin,
      applicant,
      preferences: jobSearch.preferences,
      onVacancyProcessed: () => {
        const now = Date.now();
        if (now - lastSaveTime >= 1000) {
          this.vacancyRepo.save(id, [...existingByHash.values()], crawlDate);
          lastSaveTime = now;
          onProgress({
            message: "",
            phase: "scan",
            vacanciesUpdated: true,
          });
        }
      },
    });

    if (abortController.signal.aborted) return;

    const allVacancies = [...existingByHash.values()];
    const { vacancies: finalVacancies, goneCount } = markUnseenAsGone(
      allVacancies,
      result.seenHashes,
      crawlDate,
    );

    this.vacancyRepo.save(id, finalVacancies, crawlDate);
    onProgress({ message: "", phase: "scan", vacanciesUpdated: true });

    onProgress({
      message: `Scan complete: ${result.newCount} new, ${result.updatedCount} updated, ${goneCount} gone, ${result.enrichedCount} enriched`,
      phase: "complete",
    });
  }
}
