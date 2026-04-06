import type { Database } from "@/utils/node/index.js"
import type { ApplicantRepository } from "@/repositories/applicant/types.js"
import { createSqliteApplicantRepository } from "@/repositories/applicant/index.js"
import type { JobSearchRepository } from "@/repositories/job-search/types.js"
import { createSqliteJobSearchRepository } from "@/repositories/job-search/index.js"
import type { SecretsRepository } from "./secrets/types.js"
import type { ConfigRepository } from "./config/types.js"
import type { VacancyRepository } from "@/repositories/vacancy/types.js"
import { createSqliteVacancyRepository } from "@/repositories/vacancy/index.js"
import type { CommuteClient } from "@/plugins/commute/types.js"
import { createGoogleMapsCommuteClient } from "@/plugins/commute/index.js"
import { getJobSiteNames } from "@/plugins/job-site/index.js"
import type { PdfRenderer } from "@/plugins/pdf-renderer/types.js"
import { createElectronPdfRenderer } from "@/plugins/pdf-renderer/index.js"
import type { LlmClient, LlmModelRegistry } from "@/plugins/llm/types.js"
import { createLlmClient, createModelRegistry } from "@/plugins/llm/index.js"
import { resolveConfig } from "@/models/config/index.js"
import { ResumeRenderer } from "@/services/resume-renderer/index.js"
import { JobConsultant } from "@/services/job-consultant/index.js"
import { VacancyScanner } from "@/services/vacancy-scanner/index.js"
import { SiteCrawler } from "@/services/site-crawler/index.js"
import { VacancyEnricher } from "@/services/vacancy-enricher/index.js"
import { CoverLetterWriter } from "@/services/cover-letter-writer/index.js"
import type { LlmClientFactory } from "./llm-factory.js"
import { resolveSecrets } from "@/models/secrets/index.js"

export function createAppServices(context: ServiceContext): AppServices {
  const pdfRenderer = context.pdfRenderer ?? createElectronPdfRenderer()

  function buildServices() {
    const { provider, assessmentModel, coverLetterModel, consultationModel } =
      resolveConfig(context.configRepo.load())
    const secrets = resolveSecrets(context.secretsRepo.load())
    const apiKey = getProviderApiKey(provider, secrets)

    const assessmentLlm = buildLlmClient(
      context.llmClientFactory,
      provider,
      apiKey,
      assessmentModel,
    )
    const coverLetterLlm = buildLlmClient(
      context.llmClientFactory,
      provider,
      apiKey,
      coverLetterModel,
    )
    const consultationLlm = buildLlmClient(
      context.llmClientFactory,
      provider,
      apiKey,
      consultationModel,
    )

    const googleMapsApiKey = secrets.googleMapsApiKey
    const commuteClient = googleMapsApiKey
      ? createGoogleMapsCommuteClient(googleMapsApiKey)
      : context.commuteClient

    const modelRegistry = context.modelRegistry ?? createModelRegistry(provider)

    const vacancyEnricher = new VacancyEnricher({
      llmClient: assessmentLlm,
      commuteClient,
    })

    return {
      modelRegistry,
      vacancyEnricher,
      resumeRenderer: new ResumeRenderer(context.applicantRepo, pdfRenderer),
      jobConsultant: new JobConsultant(context.applicantRepo, consultationLlm),
      vacancyScanner: new VacancyScanner(
        context.vacancyRepo,
        context.jobSearchRepo,
        context.applicantRepo,
        new SiteCrawler(),
        vacancyEnricher,
        getJobSiteNames,
      ),
      coverLetterWriter: new CoverLetterWriter(
        context.jobSearchRepo,
        context.applicantRepo,
        context.vacancyRepo,
        coverLetterLlm,
      ),
    }
  }

  let services = buildServices()

  return {
    applicantRepo: context.applicantRepo,
    jobSearchRepo: context.jobSearchRepo,
    vacancyRepo: context.vacancyRepo,
    secretsRepo: context.secretsRepo,
    configRepo: context.configRepo,
    get modelRegistry() {
      return services.modelRegistry
    },
    get resumeRenderer() {
      return services.resumeRenderer
    },
    get jobConsultant() {
      return services.jobConsultant
    },
    get vacancyEnricher() {
      return services.vacancyEnricher
    },
    get vacancyScanner() {
      return services.vacancyScanner
    },
    get coverLetterWriter() {
      return services.coverLetterWriter
    },
    rebuild() {
      services = buildServices()
    },
  }
}

export interface AppServices {
  applicantRepo: ApplicantRepository
  jobSearchRepo: JobSearchRepository
  vacancyRepo: VacancyRepository
  secretsRepo: SecretsRepository
  configRepo: ConfigRepository
  modelRegistry: LlmModelRegistry
  resumeRenderer: ResumeRenderer
  jobConsultant: JobConsultant
  vacancyEnricher: VacancyEnricher
  vacancyScanner: VacancyScanner
  coverLetterWriter: CoverLetterWriter
  rebuild: () => void
}

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

interface ServiceContext {
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

function buildLlmClient(
  factory: LlmClientFactory | undefined,
  provider: string,
  apiKey: string | undefined,
  model: string,
): LlmClient | undefined {
  if (factory) {
    try {
      return factory(model)
    } catch {
      return undefined
    }
  }
  if (!apiKey) return undefined
  return createLlmClient(provider, apiKey, model)
}

function getProviderApiKey(
  provider: string,
  secrets: ReturnType<typeof resolveSecrets>,
): string | undefined {
  switch (provider) {
    case "requesty": {
      return secrets.requestyApiKey
    }
    default: {
      return secrets.openrouterApiKey
    }
  }
}
