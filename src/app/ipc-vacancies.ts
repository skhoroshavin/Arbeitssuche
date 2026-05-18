import { VacancyWithStatusSchema } from "@/models/vacancy"
import type { Activity } from "@/models/vacancy"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { Applicant } from "@/models/applicant"
import type { SearchPreferences } from "@/models/job-search"
import type { AppServices } from "."
import { EnrichQueue } from "@/services/vacancy-scanner/index.js"
import type { IpcHandle, SafeSend } from "./ipc-handlers.js"

export function registerVacanciesHandlers(
  handle: IpcHandle,
  services: AppServices,
  safeSend: SafeSend,
): void {
  handle("job-searches:vacancies:list", (id: string) => {
    const output = services.vacancyRepo.loadAll(id)
    const vacancies = output.vacancies.map((v) => ({
      ...v,
      status: v.deriveStatus(),
      sources: v.deriveSources(),
    }))
    return {
      vacancies,
      totalCount: vacancies.length,
      generatedAt: output.generatedAt,
      latestCrawl: output.latestCrawl,
    }
  })
  handle(
    "job-searches:vacancies:seed",
    (id: string, vacancies: Vacancy[], latestCrawl: string) => {
      services.vacancyRepo.save(id, vacancies, latestCrawl)
      return { ok: true as const, count: vacancies.length }
    },
  )
  handle("job-searches:vacancies:load", (id: string, hash: string) => {
    const vacancy = services.vacancyRepo.findByHash(id, hash)
    if (!vacancy) {
      throw new Error(`Vacancy "${hash}" not found`)
    }
    return VacancyWithStatusSchema.parse({
      ...vacancy,
      status: vacancy.deriveStatus(),
      sources: vacancy.deriveSources(),
    })
  })
  handle(
    "job-searches:vacancies:add-activity",
    (id: string, hash: string, activity: Activity) => {
      services.vacancyRepo.addActivity(id, hash, activity)
      return { ok: true as const }
    },
  )

  handle(
    "job-searches:vacancies:cover-letter:load",
    (id: string, hash: string) => ({
      content: services.jobSearchRepo.loadApplicationCoverLetter(id, hash),
    }),
  )
  handle(
    "job-searches:vacancies:cover-letter:save",
    (id: string, hash: string, content: string) => {
      services.jobSearchRepo.saveApplicationCoverLetter(id, hash, content)
      return { ok: true as const }
    },
  )
  handle(
    "job-searches:vacancies:cover-letter:generate",
    async (id: string, hash: string) => ({
      content: await services.coverLetterWriter.generateForVacancy(id, hash),
    }),
  )

  handle("vacancies:re-enrich", async (jobSearchId: string, hash: string) => {
    const vacancy = services.vacancyRepo.findByHash(jobSearchId, hash)
    if (!vacancy) throw new Error(`Vacancy "${hash}" not found`)

    const jobSearch = services.jobSearchRepo.load(jobSearchId)
    const applicant = services.applicantRepo.load(jobSearch.applicantId)

    const dirtyVacancy = vacancy.with({ enrichmentDirty: true })
    const enriched = await services.vacancyEnricher.enrich(dirtyVacancy, {
      applicant,
      preferences: jobSearch.preferences,
    })

    const latestCrawl = services.vacancyRepo.loadAll(jobSearchId).latestCrawl
    const allVacancies = services.vacancyRepo.loadAll(jobSearchId).vacancies
    const updated = allVacancies.map((v) => (v.hash === hash ? enriched : v))
    services.vacancyRepo.save(jobSearchId, updated, latestCrawl)

    if (enriched.enrichmentDirty) {
      throw new Error(
        "Analyse fehlgeschlagen: Modell und API-Schlüssel in den Einstellungen überprüfen",
      )
    }

    return { ok: true as const }
  })

  handle("vacancies:enrich-unenriched", async (jobSearchId: string) => {
    if (batchEnrichAbortControllers.has(jobSearchId)) {
      throw new Error(`Batch enrichment already running for ${jobSearchId}`)
    }

    const abortController = new AbortController()
    batchEnrichAbortControllers.set(jobSearchId, abortController)

    const jobSearch = services.jobSearchRepo.load(jobSearchId)
    const applicant = services.applicantRepo.load(jobSearch.applicantId)
    const output = services.vacancyRepo.loadAll(jobSearchId)
    const vacanciesNeedingEnrichment = output.vacancies.filter(
      (v) => !v.enriched || v.enrichmentDirty,
    )

    if (vacanciesNeedingEnrichment.length === 0) {
      batchEnrichAbortControllers.delete(jobSearchId)
      return { count: 0 }
    }

    const existingByHash = new Map(output.vacancies.map((v) => [v.hash, v]))

    try {
      const queue = createEnrichQueue(
        services,
        jobSearchId,
        applicant,
        jobSearch.preferences,
        existingByHash,
        output.latestCrawl,
        safeSend,
        abortController.signal,
      )

      for (const vacancy of vacanciesNeedingEnrichment) {
        queue.submit(vacancy, vacancy.hash)
      }

      const aborted = await drainAndCheckAbort(queue)

      sendBatchEnrichDoneProgress(safeSend, jobSearchId, aborted)

      if (aborted) {
        return { count: 0, aborted: true }
      }

      const updatedVacancies =
        services.vacancyRepo.loadAll(jobSearchId).vacancies
      const anyStillDirty = updatedVacancies.some(
        (vacancy) => vacancy.enrichmentDirty,
      )
      if (anyStillDirty) {
        throw new Error(
          "Analyse fehlgeschlagen: Modell und API-Schlüssel in den Einstellungen überprüfen",
        )
      }

      return { count: vacanciesNeedingEnrichment.length }
    } catch (error) {
      sendBatchEnrichDoneProgress(safeSend, jobSearchId, true)
      throw error
    } finally {
      batchEnrichAbortControllers.delete(jobSearchId)
    }
  })

  handle("vacancies:enrich:abort", (jobSearchId: string) => {
    const controller = batchEnrichAbortControllers.get(jobSearchId)
    if (!controller) return { aborted: false }
    controller.abort()
    return { aborted: true }
  })
}

function createEnrichQueue(
  services: AppServices,
  jobSearchId: string,
  applicant: Applicant,
  preferences: SearchPreferences,
  existingByHash: Map<string, Vacancy>,
  latestCrawl: string,
  safeSend: SafeSend,
  signal: AbortSignal,
): EnrichQueue {
  return new EnrichQueue({
    enricher: services.vacancyEnricher,
    context: { applicant, preferences },
    onEnriched: (enriched, hash) => {
      existingByHash.set(hash, enriched)
      services.vacancyRepo.save(
        jobSearchId,
        [...existingByHash.values()],
        latestCrawl,
      )
      safeSend("job:progress", {
        jobSearchId,
        message: "",
        phase: "enrich",
        vacanciesUpdated: true,
      })
    },
    onError: (hash, error) => {
      console.error(`Batch enrichment failed for "${hash}":`, error)
    },
    onProgress: (event) => {
      safeSend("job:progress", {
        jobSearchId,
        message: `Analysiere ${event.completed}/${event.total}`,
        phase: "enrich",
        owner: "batch",
        enrichProgress: event,
      })
    },
    signal,
  })
}

async function drainAndCheckAbort(queue: EnrichQueue): Promise<boolean> {
  try {
    await queue.drain()
    return false
  } catch (error) {
    if (isAbortError(error)) {
      return true
    }
    throw error
  }
}

function sendBatchEnrichDoneProgress(
  safeSend: SafeSend,
  jobSearchId: string,
  aborted: boolean,
): void {
  safeSend("job:progress", {
    jobSearchId,
    message: aborted ? "Analyse abgebrochen" : "Analyse abgeschlossen",
    phase: "done",
    source: "enrich",
    owner: "batch",
  })
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

const batchEnrichAbortControllers = new Map<string, AbortController>()
