import { migrateSqliteDatabase } from "@/repositories/sqlite-migrate.js"
import type { ConfigRepository } from "@/app/config"
import type { SetupRepository } from "@/app/setup"
import type { SecretsRepository } from "@/app/secrets"
import {
  createSqliteApplicantRepository,
  type ApplicantRepository,
} from "@/repositories/applicant"
import {
  createSqliteJobSearchRepository,
  type JobSearchRepository,
} from "@/repositories/job-search"
import {
  createSqliteVacancyRepository,
  type VacancyRepository,
} from "@/repositories/vacancy"
import type { CommuteClient } from "@/plugins/commute"
import type { LlmModelRegistry } from "@/plugins/llm"
import type { PdfRenderer } from "@/plugins/pdf-renderer"
import type { Database } from "@/utils/index.js"
import type { LlmClientFactory } from "./llm-factory.js"

export function createSqliteServiceContext(
  database: Database,
  secretsRepo: SecretsRepository,
  configRepo: ConfigRepository,
  setupRepo: SetupRepository,
): ServiceContext {
  migrateSqliteDatabase(database)
  return {
    applicantRepo: createSqliteApplicantRepository(database),
    jobSearchRepo: createSqliteJobSearchRepository(database),
    secretsRepo,
    configRepo,
    setupRepo,
    vacancyRepo: createSqliteVacancyRepository(database),
  }
}

export interface ServiceContext {
  applicantRepo: ApplicantRepository
  jobSearchRepo: JobSearchRepository
  secretsRepo: SecretsRepository
  configRepo: ConfigRepository
  setupRepo: SetupRepository
  vacancyRepo: VacancyRepository
  pdfRenderer?: PdfRenderer
  modelRegistry?: LlmModelRegistry
  llmClientFactory?: LlmClientFactory
  commuteClient?: CommuteClient
}
