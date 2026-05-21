import type { Activity } from "@/models/vacancy"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { Applicant } from "@/models/applicant"
import type { JobSearch } from "@/models/job-search"
import type { AppServices } from "."
import { EnrichQueue } from "@/services/vacancy-scanner/index.js"
import type { IpcHandle, SafeSend } from "./ipc-handlers.js"
import { makeJobSearchID } from "@/models/job-search"

export function registerVacanciesHandlers(
  handle: IpcHandle,
  services: AppServices,
  safeSend: SafeSend,
): void {
  handle("job-searches:vacancies:list", (id: string) => {
    const vacancies = services.vacancyRepo.allForJobSearch(makeJobSearchID(id))
    const serialized = vacancies.map((v) => ({
      ...v,
      status: v.status,
      sources: v.sources,
    }))
    return {
      vacancies: serialized,
      totalCount: serialized.length,
    }
  })

  handle(
    "job-searches:vacancies:seed",
    (id: string, vacancies: Vacancy[]) => {
      services.vacancyRepo.save(makeJobSearchID(id), vacancies)
      return { ok: true as const, count: vacancies.length }
    },
  )

  handle("job-searches:vacancies:load", (id: string, hash: string) => {
    const vacancy = services.vacancyRepo.findByHash(makeJobSearchID(id), hash)
    if (!vacancy) {
      throw new Error(`Vacancy "${hash}" not found`)
    }
    return {
      ...vacancy,
      status: vacancy.status,
      sources: vacancy.sources,
    }
  })

  handle(
    "job-searches:vacancies:add-activity",
    (id: string, hash: string, activity: Activity) => {
      const vacancies = services.vacancyRepo.allForJobSearch(makeJobSearchID(id))
      const vacancy = vacancies.find((v) => v.hash === hash)
      if (!vacancy) throw new Error(`Vacancy "${hash}" not found`)
      vacancy.addActivity(activity)
      services.vacancyRepo.save(makeJobSearchID(id), vacancies)
      return { ok: true }
    },
  )

  handle(
    "vacancies:cover-letter:load",
    (jobSearchId: string, vacancyHash: string) => {
      const vacancy = services.vacancyRepo.findByHash(
        makeJobSearchID(jobSearchId),
        vacancyHash,
      )
      return { content: vacancy?.coverLetter ?? "" }
    },
  )

  handle(
    "vacancies:cover-letter:save",
    (jobSearchId: string, vacancyHash: string, content: string) => {
      const vacancies = services.vacancyRepo.allForJobSearch(
        makeJobSearchID(jobSearchId),
      )
      const vacancy = vacancies.find((v) => v.hash === vacancyHash)
      if (!vacancy) throw new Error(`Vacancy "${vacancyHash}" not found`)
      vacancy.coverLetter = content
      services.vacancyRepo.save(makeJobSearchID(jobSearchId), vacancies)
      return { ok: true }
    },
  )

  handle(
    "vacancies:cover-letter:generate",
    (jobSearchId: string, vacancyHash: string) =>
      services.coverLetterWriter.generateForVacancy(jobSearchId, vacancyHash),
  )

  handle("vacancies:re-enrich", async (jobSearchId: string, hash: string) => {
    const vacancy = services.vacancyRepo.findByHash(
      makeJobSearchID(jobSearchId),
      hash,
    )
    if (!vacancy) throw new Error(`Vacancy "${hash}" not found`)

    const { jobSearch, applicantId } = services.jobSearchRepo.load(
      makeJobSearchID(jobSearchId),
    )
    const applicant = services.applicantRepo.load(applicantId)

    vacancy.enrichmentDirty = true
    const enriched = await services.vacancyEnricher.enrich(vacancy, {
      applicant,
      jobSearch,
    })

    const allVacancies = services.vacancyRepo.allForJobSearch(
      makeJobSearchID(jobSearchId),
    )
    const updated = allVacancies.map((v) => (v.hash === hash ? enriched : v))
    services.vacancyRepo.save(makeJobSearchID(jobSearchId), updated)

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

    const { jobSearch, applicantId } = services.jobSearchRepo.load(
      makeJobSearchID(jobSearchId),
    )
    const applicant = services.applicantRepo.load(applicantId)
    const vacancies = services.vacancyRepo.allForJobSearch(
      makeJobSearchID(jobSearchId),
    )
    const vacanciesNeedingEnrichment = vacancies.filter(
      (v) => !v.enriched || v.enrichmentDirty,
    )

    if (vacanciesNeedingEnrichment.length === 0) {
      batchEnrichAbortControllers.delete(jobSearchId)
      return { count: 0 }
    }

    const existingByHash = new Map(vacancies.map((v) => [v.hash, v]))

    try {
      const queue = createEnrichQueue(
        services,
        jobSearchId,
        applicant,
        jobSearch,
        existingByHash,
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

      const updatedVacancies = services.vacancyRepo.allForJobSearch(
        makeJobSearchID(jobSearchId),
      )
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
  jobSearch: JobSearch,
  existingByHash: Map<string, Vacancy>,
  safeSend: SafeSend,
  signal: AbortSignal,
): EnrichQueue {
  return new EnrichQueue({
    enricher: services.vacancyEnricher,
    context: { applicant, jobSearch },
    onEnriched: (enriched, hash) => {
      existingByHash.set(hash, enriched)
      services.vacancyRepo.save(
        makeJobSearchID(jobSearchId),
        [...existingByHash.values()],
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
