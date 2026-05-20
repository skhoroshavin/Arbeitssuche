import type { ConfigRepository } from "@/repositories/config"
import type { SetupRepository } from "@/app/setup"
import type { ApplicantRepository } from "@/repositories/applicant"
import type { JobSearchRepository } from "@/repositories/job-search"
import type { VacancyRepository } from "@/repositories/vacancy"
import { GoogleMapsCommuteProvider } from "@/plugins/commute"
import type { LlmClient, LlmModelRegistry } from "@/plugins/llm"
import { getLlmProvider } from "@/plugins/llm"
import { getJobSiteNames } from "@/plugins/job-site"
import { createElectronPdfRenderer } from "@/plugins/pdf-renderer"
import { CoverLetterWriter } from "@/services/cover-letter-writer/index.js"
import { JobConsultant } from "@/services/job-consultant/index.js"
import { ResumeRenderer } from "@/services/resume-renderer/index.js"
import { SiteCrawler } from "@/services/site-crawler/index.js"
import { VacancyEnricher } from "@/services/vacancy-enricher/index.js"
import { VacancyScanner } from "@/services/vacancy-scanner/index.js"
import type { ServiceContext } from "./create-service-context.js"
import type { LlmClientFactory } from "./llm-factory.js"

export function createAppServices(context: ServiceContext): AppServices {
  const pdfRenderer = context.pdfRenderer ?? createElectronPdfRenderer()

  function buildServices() {
    const config = context.configRepo.loadConfig()
    const secrets = context.configRepo.loadSecrets()
    const { provider, assessmentModel, coverLetterModel, consultationModel } =
      config
    const apiKey = getProviderApiKey(provider, secrets)
    const buildConfiguredLlmClient = (model: string) =>
      buildLlmClient(context.llmClientFactory, provider, apiKey, model)

    const assessmentLlm = buildConfiguredLlmClient(assessmentModel)
    const coverLetterLlm = buildConfiguredLlmClient(coverLetterModel)
    const consultationLlm = buildConfiguredLlmClient(consultationModel)

    const googleMapsApiKey = secrets.googleMapsApiKey
    const commuteClient = googleMapsApiKey
      ? GoogleMapsCommuteProvider.createClient(googleMapsApiKey)
      : context.commuteClient

    const modelRegistry = context.modelRegistry ?? getLlmProvider(provider).createModelRegistry()

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
    configRepo: context.configRepo,
    setupRepo: context.setupRepo,
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
  configRepo: ConfigRepository
  setupRepo: SetupRepository
  modelRegistry: LlmModelRegistry
  resumeRenderer: ResumeRenderer
  jobConsultant: JobConsultant
  vacancyEnricher: VacancyEnricher
  vacancyScanner: VacancyScanner
  coverLetterWriter: CoverLetterWriter
  rebuild: () => void
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
  return getLlmProvider(provider).createClient(apiKey, model)
}

function getProviderApiKey(
  provider: string,
  secrets: { openrouterApiKey?: string; requestyApiKey?: string },
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
