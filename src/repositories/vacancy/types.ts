import { Vacancy } from "@/models/vacancy/index.js";
import type { Activity } from "@/models/vacancy/types.js";

export interface VacancyListOutput {
  generatedAt: string;
  latestCrawl: string;
  vacancies: Vacancy[];
}

export interface VacancyRepository {
  loadAll(jobSearchId: string): VacancyListOutput;
  save(jobSearchId: string, vacancies: Vacancy[], latestCrawl: string): void;
  findByHash(jobSearchId: string, hash: string): Vacancy | undefined;
  addActivity(jobSearchId: string, hash: string, activity: Activity): void;
}
