import type { VacancyRepository } from "@/repositories/vacancy"
import type { JobSearchRepository } from "@/repositories/job-search"
import type { ApplicantRepository } from "@/repositories/applicant"
import type { JobSite } from "@/plugins/job-site"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { ProgressEvent } from "@/models/progress/index.js"
import { isAbortError } from "@/utils"
import { SiteCrawler } from "@/services/site-crawler/index.js"
import { resolveSearchParameters } from "@/services/site-crawler/index.js"
import { VacancyEnricher } from "@/services/vacancy-enricher/index.js"
import { CommuteComputer } from "@/services/commute-computer/index.js"
import { EnrichQueue } from "./enrich-queue.js"
import { markUnseenAsGone } from "./mark-unseen.js"

export class ScanPipeline {
  constructor(
    private readonly vacancyRepo: VacancyRepository,
    private readonly jobSearchRepo: JobSearchRepository,
    private readonly applicantRepo: ApplicantRepository,
    private readonly siteCrawler: SiteCrawler,
    private readonly commuteComputer: CommuteComputer,
    private readonly enricher: VacancyEnricher,
    private readonly listJobSiteNames: () => string[] = () => [],
  ) {}

  async scan(
    id: string,
    abortController: AbortController,
    enrichAbortController: AbortController,
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
          owner: "crawl",
          enrichProgress: event,
        })
      },
      signal: enrichAbortController.signal,
    })

    await this.siteCrawler.crawl({
      sites,
      criteria,
      signal: abortController.signal,
      onProgress,
      existingByHash,
      crawlDate,
      onResult: (result) => {
        const { vacancy, hash, isNew, siteName } = result

        existingByHash.set(hash, vacancy)
        seenHashes.add(hash)

        if (isNew) {
          newCount.value++
        } else {
          updatedCount.value++
        }

        onProgress({
          message: `[${siteName}] ${isNew ? "New" : "Updated"}: ${vacancy.title}`,
          phase: "scan",
        })

        const now = Date.now()
        if (now - lastSaveTime >= 1000) {
          this.vacancyRepo.save(id, [...existingByHash.values()], crawlDate)
          lastSaveTime = now
          onProgress({ message: "", phase: "scan", vacanciesUpdated: true })
        }
      },
    })

    const allVacancies = [...existingByHash.values()]
    const dirtyForCommute = allVacancies.filter(
      (v) => v.enrichmentDirty && v.addresses.length > 0,
    )

    if (dirtyForCommute.length > 0 && !enrichAbortController.signal.aborted) {
      const commuted = await this.commuteComputer.compute(
        dirtyForCommute,
        applicant,
        enrichAbortController.signal,
      )
      for (const v of commuted) {
        existingByHash.set(v.hash, v)
      }
    }

    for (const [, v] of existingByHash) {
      if (v.enrichmentDirty && !enrichAbortController.signal.aborted) {
        queue.submit(v, v.hash)
      }
    }

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

    const finalAll = [...existingByHash.values()]
    const { vacancies: finalVacancies, goneCount } = markUnseenAsGone(
      finalAll,
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

async function drainQueue(queue: EnrichQueue): Promise<void> {
  try {
    await queue.drain()
  } catch (error) {
    if (isAbortError(error)) return
    throw error
  }
}
