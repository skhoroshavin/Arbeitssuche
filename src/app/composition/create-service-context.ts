import type { ConfigRepository } from "@/app/config"
import type { SecretsRepository } from "@/app/secrets"
import type { ApplicantRepository } from "@/repositories/applicant"
import { createSqliteApplicantRepository } from "@/repositories/applicant/create"
import type { JobSearchRepository } from "@/repositories/job-search"
import { createSqliteJobSearchRepository } from "@/repositories/job-search/create"
import type { VacancyRepository } from "@/repositories/vacancy"
import { createSqliteVacancyRepository } from "@/repositories/vacancy/create"
import type { CommuteClient } from "@/plugins/commute"
import type { LlmModelRegistry } from "@/plugins/llm"
import type { PdfRenderer } from "@/plugins/pdf-renderer"
import type { Database } from "@/utils/node/index.js"
import type { LlmClientFactory } from "./llm-factory.js"

export function createSqliteServiceContext(
  database: Database,
  secretsRepo: SecretsRepository,
  configRepo: ConfigRepository,
): ServiceContext {
  return {
    applicantRepo: createSqliteApplicantRepository(database),
    jobSearchRepo: createSqliteJobSearchRepository(database),
    secretsRepo,
    configRepo,
    vacancyRepo: createSqliteVacancyRepository(database),
  }
}

export interface ServiceContext {
  applicantRepo: ApplicantRepository
  jobSearchRepo: JobSearchRepository
  secretsRepo: SecretsRepository
  configRepo: ConfigRepository
  vacancyRepo: VacancyRepository
  pdfRenderer?: PdfRenderer
  modelRegistry?: LlmModelRegistry
  llmClientFactory?: LlmClientFactory
  commuteClient?: CommuteClient
}
