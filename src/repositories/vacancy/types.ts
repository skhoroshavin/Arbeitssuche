import type { Vacancy, Activity } from "@/models/vacancy/types.js";

export interface VacancyListOutput {
  generatedAt: string;
  latestCrawl: string;
  vacancies: Vacancy[];
}

export function createVacancyListOutput(
  vacancies: Vacancy[],
  latestCrawl: string,
): VacancyListOutput {
  return {
    generatedAt: new Date().toISOString(),
    latestCrawl,
    vacancies,
  };
}

export interface VacancyRepository {
  loadAll(jobSearchId: string): VacancyListOutput | undefined;
  save(jobSearchId: string, vacancies: Vacancy[], latestCrawl: string): void;
  findByHash(jobSearchId: string, hash: string): Vacancy | undefined;
  addActivity(
    jobSearchId: string,
    hash: string,
    activity: Activity,
  ): Promise<void>;
}
