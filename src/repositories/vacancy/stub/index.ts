import type { Vacancy, Activity } from "@/models/vacancy/types.js";
import {
  createVacancyListOutput,
  type VacancyListOutput,
  type VacancyRepository,
} from "@/repositories/vacancy/types.js";

interface StubData {
  output: VacancyListOutput;
}

class StubVacancyRepository implements VacancyRepository {
  private readonly store: Map<string, StubData>;

  constructor(
    initial?: Record<string, { vacancies: Vacancy[]; latestCrawl: string }>,
  ) {
    this.store = new Map(
      initial
        ? Object.entries(initial).map(([id, data]) => [
            id,
            {
              output: createVacancyListOutput(
                structuredClone(data.vacancies),
                data.latestCrawl,
              ),
            },
          ])
        : [],
    );
  }

  loadAll(jobSearchId: string): VacancyListOutput | undefined {
    const data = this.store.get(jobSearchId);
    return data ? structuredClone(data.output) : undefined;
  }

  save(jobSearchId: string, vacancies: Vacancy[], latestCrawl: string): void {
    this.store.set(jobSearchId, {
      output: createVacancyListOutput(structuredClone(vacancies), latestCrawl),
    });
  }

  findByHash(jobSearchId: string, hash: string): Vacancy | undefined {
    const data = this.store.get(jobSearchId);
    const found = data?.output.vacancies.find((v) => v.hash === hash);
    return found ? structuredClone(found) : undefined;
  }

  async addActivity(
    jobSearchId: string,
    hash: string,
    activity: Activity,
  ): Promise<void> {
    const data = this.store.get(jobSearchId);
    if (!data) throw new Error(`No vacancies for job search "${jobSearchId}"`);

    const vacancy = data.output.vacancies.find((v) => v.hash === hash);
    if (!vacancy) throw new Error(`Vacancy "${hash}" not found`);

    vacancy.activityHistory.push(structuredClone(activity));
  }
}

export function createStubVacancyRepository(
  initial?: Record<string, { vacancies: Vacancy[]; latestCrawl: string }>,
): VacancyRepository {
  return new StubVacancyRepository(initial);
}
