import type { VacancyRepository } from "@/repositories/vacancy/types.js"
import type { JobSearchRepository } from "@/repositories/job-search/types.js"
import type { ApplicantRepository } from "@/repositories/applicant/types.js"
import type { JobSite } from "@/plugins/job-site/types.js"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { ProgressEvent } from "@/models/progress/index.js"
import { SiteCrawler } from "@/services/site-crawler/index.js"
import { resolveSearchParameters } from "@/services/site-crawler/index.js"
import {
  process as processVacancy,
  markUnseenAsGone,
} from "@/services/vacancy-processor/index.js"
import { VacancyEnricher } from "@/services/vacancy-enricher/index.js"
import { EnrichQueue } from "./enrich-queue.js"

export class VacancyScanner {
  constructor(
    private readonly vacancyRepo: VacancyRepository,
    private readonly jobSearchRepo: JobSearchRepository,
    private readonly applicantRepo: ApplicantRepository,
    private readonly siteCrawler: SiteCrawler,
    private readonly enricher: VacancyEnricher,
    private readonly listJobSiteNames: () => string[] = () => [],
  ) {}

  async scan(
    id: string,
    abortController: AbortController,
    onProgress: OnProgress,
    siteFactory: JobSiteFactory,
  ): Promise<void> {
    const jobSearch = this.jobSearchRepo.load(id)
    const sitesToRun =
      jobSearch.params.sources.length > 0
        ? jobSearch.params.sources
        : this.listJobSiteNames()

    const applicant = this.applicantRepo.load(jobSearch.applicantId)
    const criteria = resolveSearchParameters(jobSearch, applicant)
    const crawlDate = new Date().toISOString().slice(0, 10)

    const existing = this.vacancyRepo.loadAll(id)
    const existingByHash = new Map<string, Vacancy>()
    for (const v of existing.vacancies) {
      existingByHash.set(v.hash, v)
    }

    const sites = sitesToRun.map((name) => siteFactory(name))

    let lastSaveTime = 0
    const seenHashes = new Set<string>()
    const newCount = { value: 0 }
    const updatedCount = { value: 0 }

    const queue = new EnrichQueue({
      enricher: this.enricher,
      context: { applicant, preferences: jobSearch.preferences },
      onEnriched: (enriched, hash) => {
        existingByHash.set(hash, enriched)
        this.vacancyRepo.save(id, [...existingByHash.values()], crawlDate)
        onProgress({ message: "", phase: "enrich", vacanciesUpdated: true })
      },
      onError: (hash, error) => {
        console.error(`Enrichment failed for vacancy "${hash}":`, error)
      },
      onProgress: (event) => {
        onProgress({
          message: `Enriching ${event.completed}/${event.total}`,
          phase: "enrich",
          enrichProgress: event,
        })
      },
      signal: abortController.signal,
    })

    await this.siteCrawler.crawl({
      sites,
      criteria,
      signal: abortController.signal,
      onProgress,
      onResult: (details, siteName) => {
        const result = processVacancy(
          details,
          siteName,
          existingByHash,
          crawlDate,
        )
        const { vacancy, hash, isNew } = result

        existingByHash.set(hash, vacancy)
        seenHashes.add(hash)

        if (isNew) {
          newCount.value++
        } else {
          updatedCount.value++
        }

        onProgress({
          message: `[${siteName}] ${isNew ? "New" : "Updated"}: ${details.title || details.url}`,
          phase: "scan",
        })

        const now = Date.now()
        if (now - lastSaveTime >= 1000) {
          this.vacancyRepo.save(id, [...existingByHash.values()], crawlDate)
          lastSaveTime = now
          onProgress({ message: "", phase: "scan", vacanciesUpdated: true })
        }

        if (vacancy.enrichmentDirty) {
          queue.submit(vacancy, hash)
        }
      },
    })

    if (!abortController.signal.aborted) {
      await queue.drain()
    }

    if (abortController.signal.aborted) return

    const allVacancies = [...existingByHash.values()]
    const { vacancies: finalVacancies, goneCount } = markUnseenAsGone(
      allVacancies,
      seenHashes,
      crawlDate,
    )

    this.vacancyRepo.save(id, finalVacancies, crawlDate)
    onProgress({ message: "", phase: "scan", vacanciesUpdated: true })

    onProgress({
      message: `Scan complete: ${newCount.value} new, ${updatedCount.value} updated, ${goneCount} gone`,
      phase: "complete",
    })
  }
}

export type OnProgress = (event: ProgressEvent) => void

type JobSiteFactory = (name: string) => JobSite
