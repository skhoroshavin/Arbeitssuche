import type { Vacancy } from "@/models/vacancy/index.js"
import type { JobSearchID } from "@/models/job-search"

export { createSqliteVacancyRepository } from "./sqlite"
export { createStubVacancyRepository } from "./stub"

export interface VacancyRepository {
  allForJobSearch(jobSearchId: JobSearchID): Vacancy[]
  save(jobSearchId: JobSearchID, vacancies: Vacancy[]): void
  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined
}
