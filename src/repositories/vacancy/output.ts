import { Vacancy } from "@/models/vacancy/index.js"
import type { VacancyListOutput } from "@/repositories/vacancy"

export const EMPTY_VACANCY_LIST_OUTPUT: VacancyListOutput = {
  generatedAt: "",
  latestCrawl: "",
  vacancies: [],
}

export function createVacancyListOutput(
  vacancies: Vacancy[],
  latestCrawl: string,
): VacancyListOutput {
  return {
    generatedAt: new Date().toISOString(),
    latestCrawl,
    vacancies,
  }
}
