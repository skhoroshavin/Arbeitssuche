import { Vacancy } from "@/models/vacancy/index.js"
import type { JobSearchID } from "@/models/job-search"
import type { VacancyRepository } from "@/repositories/vacancy"

export function createStubVacancyRepository(
  initial?: Record<string, Vacancy[]>,
): VacancyRepository {
  return new StubVacancyRepository(initial)
}

class StubVacancyRepository implements VacancyRepository {
  constructor(initial?: Record<string, Vacancy[]>) {
    this.store = new Map(
      initial
        ? Object.entries(initial).map(([id, vacancies]) => [
            id,
            vacancies.map((v) => Vacancy.parse(structuredClone(v))),
          ])
        : [],
    )
  }

  allForJobSearch(jobSearchId: JobSearchID): Vacancy[] {
    const data = this.store.get(jobSearchId.value)
    if (!data) return []
    return data.map((v) => Vacancy.parse(structuredClone(v)))
  }

  save(jobSearchId: JobSearchID, vacancies: Vacancy[]): void {
    this.store.set(
      jobSearchId.value,
      vacancies.map((v) => Vacancy.parse(structuredClone(v))),
    )
  }

  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined {
    const data = this.store.get(jobSearchId.value)
    const found = data?.find((v) => v.hash === hash)
    return found ? Vacancy.parse(structuredClone(found)) : undefined
  }

  private readonly store: Map<string, Vacancy[]>
}
