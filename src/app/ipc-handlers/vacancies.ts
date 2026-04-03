import type { Activity } from "@/models/vacancy/types.js"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { AppServices } from "@/app/index.js"
import type { IpcHandle } from "."

export function registerVacanciesHandlers(
  handle: IpcHandle,
  services: AppServices,
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
}
