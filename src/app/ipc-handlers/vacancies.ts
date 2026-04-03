import type { Activity } from "@/models/vacancy/types.js"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { AppServices } from "@/app/index.js"
import { EnrichQueue } from "@/services/vacancy-scanner/index.js"
import type { IpcHandle, SafeSend } from "."

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
    return {
      ...vacancy,
      status: vacancy.deriveStatus(),
      sources: vacancy.deriveSources(),
    }
  })
  handle(
    "job-searches:vacancies:add-activity",
    (id: string, hash: string, activity: Activity) => {
      services.vacancyRepo.addActivity(id, hash, activity)
      return { ok: true }
    },
  )

  // Vacancy cover letter
  handle(
    "job-searches:vacancies:cover-letter:load",
    (id: string, hash: string) => {
      return {
        content: services.jobSearchRepo.loadApplicationCoverLetter(id, hash),
      }
    },
  )
  handle(
    "job-searches:vacancies:cover-letter:save",
    (id: string, hash: string, content: string) => {
      services.jobSearchRepo.saveApplicationCoverLetter(id, hash, content)
      return { ok: true }
    },
  )
  handle(
    "job-searches:vacancies:cover-letter:generate",
    (id: string, hash: string) =>
      services.coverLetterWriter.generateForVacancy(id, hash),
  )

  // Re-enrichment handlers

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

    return { ok: true }
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
      const queue = new EnrichQueue({
        enricher: services.vacancyEnricher,
        context: { applicant, preferences: jobSearch.preferences },
        onEnriched: (enriched, hash) => {
          existingByHash.set(hash, enriched)
          services.vacancyRepo.save(
            jobSearchId,
            [...existingByHash.values()],
            output.latestCrawl,
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
            enrichProgress: event,
          })
        },
        signal: abortController.signal,
      })

      for (const vacancy of vacanciesNeedingEnrichment) {
        queue.submit(vacancy, vacancy.hash)
      }
      await queue.drain()

      safeSend("job:progress", {
        jobSearchId,
        message: "Analyse abgeschlossen",
        phase: "done",
      })

      return { count: vacanciesNeedingEnrichment.length }
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

const batchEnrichAbortControllers = new Map<string, AbortController>()
