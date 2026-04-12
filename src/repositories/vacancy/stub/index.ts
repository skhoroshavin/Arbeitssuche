import { Vacancy } from "@/models/vacancy/index.js"
import type { Activity } from "@/models/vacancy"
import {
  EMPTY_VACANCY_LIST_OUTPUT,
  createVacancyListOutput,
} from "@/repositories/vacancy/output.js"
import type { VacancyListOutput, VacancyRepository } from "../types.js"

export function createStubVacancyRepository(
  initial?: Record<string, { vacancies: Vacancy[]; latestCrawl: string }>,
): VacancyRepository {
  return new StubVacancyRepository(initial)
}

class StubVacancyRepository implements VacancyRepository {
  constructor(
    initial?: Record<string, { vacancies: Vacancy[]; latestCrawl: string }>,
  ) {
    this.store = new Map(
      initial
        ? Object.entries(initial).map(([id, data]) => [
            id,
            {
              output: createVacancyListOutput(
                data.vacancies.map((v) => new Vacancy(structuredClone(v))),
                data.latestCrawl,
              ),
            },
          ])
        : [],
    )
  }

  loadAll(jobSearchId: string): VacancyListOutput {
    const data = this.store.get(jobSearchId)
    if (!data) return EMPTY_VACANCY_LIST_OUTPUT
    const cloned = structuredClone(data.output)
    return {
      ...cloned,
      vacancies: cloned.vacancies.map((v) => new Vacancy(v)),
    }
  }

  save(jobSearchId: string, vacancies: Vacancy[], latestCrawl: string): void {
    this.store.set(jobSearchId, {
      output: createVacancyListOutput(
        vacancies.map((v) => new Vacancy(structuredClone(v))),
        latestCrawl,
      ),
    })
  }

  findByHash(jobSearchId: string, hash: string): Vacancy | undefined {
    const data = this.store.get(jobSearchId)
    const found = data?.output.vacancies.find((v) => v.hash === hash)
    return found ? new Vacancy(structuredClone(found)) : undefined
  }

  addActivity(jobSearchId: string, hash: string, activity: Activity): void {
    const data = this.store.get(jobSearchId)
    if (!data) throw new Error(`No vacancies for job search "${jobSearchId}"`)

    const vacancy = data.output.vacancies.find((v) => v.hash === hash)
    if (!vacancy) throw new Error(`Vacancy "${hash}" not found`)

    const index = data.output.vacancies.indexOf(vacancy)
    data.output.vacancies[index] = new Vacancy({
      ...structuredClone(vacancy),
      activityHistory: [...vacancy.activityHistory, structuredClone(activity)],
    })
  }

  private readonly store: Map<string, StubData>
}

interface StubData {
  output: VacancyListOutput
}
