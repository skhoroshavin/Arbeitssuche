import type { VacancyRepository } from "@/repositories/vacancy"
import type { JobSearchRepository } from "@/repositories/job-search"
import type { ApplicantRepository } from "@/repositories/applicant"
import type { JobSiteProvider } from "@/plugins/job-site"
import type { Browser } from "@/plugins/browser"
import type { Vacancy } from "@/models/vacancy/index.js"
import { makeJobSearchID } from "@/models/job-search"
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
    private readonly listProviderIds: () => string[] = () => [],
    private readonly getProvider: (id: string) => JobSiteProvider,
  ) {}

  async scan(
    id: string,
    abortController: AbortController,
    enrichAbortController: AbortController,
    onProgress: OnProgress,
    browser: Browser,
  ): Promise<void> {
    const searchId = makeJobSearchID(id)
    const loaded = this.jobSearchRepo.load(searchId)
    const providerIdsToRun =
      loaded.jobSearch.sources.length > 0
        ? loaded.jobSearch.sources.map((s: { value: string }) => s.value)
        : this.listProviderIds()

    const applicant = this.applicantRepo.load(loaded.applicantId)
    const criteria = resolveSearchParameters(loaded.jobSearch, applicant)
    const crawlDate = new Date().toISOString().slice(0, 10)

    const existing = this.vacancyRepo.allForJobSearch(searchId)
    const existingByHash = new Map<string, Vacancy>()
    for (const v of existing) {
      existingByHash.set(v.hash, v)
    }

    const providers = providerIdsToRun.map((id) => this.getProvider(id))

    let lastSaveTime = 0
    const seenHashes = new Set<string>()
    const newCount = { value: 0 }
    const updatedCount = { value: 0 }

    const queue = new EnrichQueue({
      enricher: this.enricher,
      context: { applicant, jobSearch: loaded.jobSearch },
      onEnriched: (enriched, hash) => {
        existingByHash.set(hash, enriched)
        this.vacancyRepo.save(searchId, [...existingByHash.values()])
        onProgress({ message: "", phase: "enrich", vacanciesUpdated: true })
      },
      onError: (hash, error) => {
        console.error(`Enrichment failed for vacancy "${hash}":`, error)
      },
      onProgress: (event) => {
        onProgress({
          message: `Enriching ${event.completed}/${event.total}`,
          phase: "enrich",
          owner: "crawl",
          enrichProgress: event,
        })
      },
      signal: enrichAbortController.signal,
    })

    await this.siteCrawler.crawl({
      providers,
      browser,
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
          this.vacancyRepo.save(searchId, [...existingByHash.values()])
          lastSaveTime = now
          onProgress({ message: "", phase: "scan", vacanciesUpdated: true })
        }

        if (vacancy.enrichmentDirty && !enrichAbortController.signal.aborted) {
          queue.submit(vacancy, hash)
        }
      },
    })

    await drainQueue(queue)

    if (queue.total > 0) {
      onProgress({
        message: enrichAbortController.signal.aborted
          ? "Analyse abgebrochen"
          : "Analyse abgeschlossen",
        phase: "done",
        source: "enrich",
        owner: "crawl",
      })
    }

    if (abortController.signal.aborted) return

    const allVacancies = [...existingByHash.values()]
    const { vacancies: finalVacancies, goneCount } = markUnseenAsGone(
      allVacancies,
      seenHashes,
      crawlDate,
    )

    this.vacancyRepo.save(searchId, finalVacancies)
    onProgress({ message: "", phase: "scan", vacanciesUpdated: true })

    onProgress({
      message: `Scan complete: ${newCount.value} new, ${updatedCount.value} updated, ${goneCount} gone`,
      phase: "complete",
    })
  }
}

export type OnProgress = (event: ProgressEvent) => void

async function drainQueue(queue: EnrichQueue): Promise<void> {
  try {
    await queue.drain()
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return
    throw error
  }
}
