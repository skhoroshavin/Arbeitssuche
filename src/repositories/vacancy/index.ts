import { Vacancy } from "@/models/vacancy/index.js"

import type { JobSearchID } from "@/models/job-search"

import type { Activity } from "@/models/vacancy"

export { createSqliteVacancyRepository } from "./sqlite"

export { createStubVacancyRepository } from "./stub"

export interface VacancyRepository {
  loadAll(jobSearchId: JobSearchID): VacancyListOutput
  save(
    jobSearchId: JobSearchID,
    vacancies: Vacancy[],
    latestCrawl: string,
  ): void
  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined
  addActivity(jobSearchId: JobSearchID, hash: string, activity: Activity): void
  loadCoverLetter(jobSearchId: JobSearchID, vacancyHash: string): string
  saveCoverLetter(
    jobSearchId: JobSearchID,
    vacancyHash: string,
    content: string,
  ): void
}

export interface VacancyListOutput {
  generatedAt: string
  latestCrawl: string
  vacancies: Vacancy[]
}
