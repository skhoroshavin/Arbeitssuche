import type { Database } from "@/utils/database.js";
import type { ApplicantRepository } from "@/repositories/applicant/types.js";
import { createSqliteApplicantRepository } from "@/repositories/applicant/index.js";
import type { JobSearchRepository } from "@/repositories/job-search/types.js";
import { createSqliteJobSearchRepository } from "@/repositories/job-search/index.js";
import type { SecretsRepository } from "./secrets/types.js";
import type { ConfigRepository } from "./config/types.js";
import type { VacancyRepository } from "@/repositories/vacancy/types.js";
import { createSqliteVacancyRepository } from "@/repositories/vacancy/index.js";
import type { CommuteClient } from "@/plugins/commute/types.js";
import { createGoogleMapsCommuteClient } from "@/plugins/commute/google-maps/index.js";
import type { PdfRenderer } from "@/plugins/pdf-renderer/types.js";
import { createElectronPdfRenderer } from "@/plugins/pdf-renderer/index.js";
import type { LlmClient, LlmModelRegistry } from "@/plugins/llm/types.js";
import { createLlmClient, createModelRegistry } from "@/plugins/llm/index.js";
import { resolveConfig } from "@/models/config/resolve.js";
import { ResumeRenderer } from "@/services/resume-renderer/index.js";
import { JobConsultant } from "@/services/job-consultant/index.js";
import { VacancyScanner } from "@/services/vacancy-scanner/index.js";
import { CoverLetterWriter } from "@/services/cover-letter-writer/index.js";
import type { LlmClientFactory } from "./llm-factory.js";

interface ServiceContext {
  applicantRepo: ApplicantRepository;
  jobSearchRepo: JobSearchRepository;
  secretsRepo: SecretsRepository;
  configRepo: ConfigRepository;
  vacancyRepo: VacancyRepository;
  pdfRenderer?: PdfRenderer;
  modelRegistry?: LlmModelRegistry;
  llmClientFactory?: LlmClientFactory;
  commuteClient?: CommuteClient | null;
}

function buildLlmClient(
  factory: LlmClientFactory | undefined,
  provider: string,
  apiKey: string | undefined,
  model: string,
): LlmClient | null {
  if (factory) {
    try {
      return factory(model);
    } catch {
      return null;
    }
  }
  if (!apiKey) return null;
  return createLlmClient(provider, apiKey, model);
}

export interface AppServices {
  applicantRepo: ApplicantRepository;
  jobSearchRepo: JobSearchRepository;
  vacancyRepo: VacancyRepository;
  secretsRepo: SecretsRepository;
  configRepo: ConfigRepository;
  modelRegistry: LlmModelRegistry;
  resumeRenderer: ResumeRenderer;
  jobConsultant: JobConsultant;
  vacancyScanner: VacancyScanner;
  coverLetterWriter: CoverLetterWriter;
  rebuild: () => void;
}

export function createAppServices(ctx: ServiceContext): AppServices {
  const pdfRenderer = ctx.pdfRenderer ?? createElectronPdfRenderer();

  function buildServices() {
    const { provider, assessmentModel, coverLetterModel, consultationModel } =
      resolveConfig(ctx.configRepo.load());
    const secrets = ctx.secretsRepo.load();

    const apiKeyMap: Record<string, string | undefined> = {
      openrouter: secrets.openrouterApiKey,
      requesty: secrets.requestyApiKey,
    };
    const apiKey = apiKeyMap[provider];

    const assessmentLlm = buildLlmClient(
      ctx.llmClientFactory,
      provider,
      apiKey,
      assessmentModel,
    );
    const coverLetterLlm = buildLlmClient(
      ctx.llmClientFactory,
      provider,
      apiKey,
      coverLetterModel,
    );
    const consultationLlm = buildLlmClient(
      ctx.llmClientFactory,
      provider,
      apiKey,
      consultationModel,
    );

    const googleMapsApiKey = secrets.googleMapsApiKey;
    const commuteClient = googleMapsApiKey
      ? createGoogleMapsCommuteClient(googleMapsApiKey)
      : (ctx.commuteClient ?? null);

    const modelRegistry = ctx.modelRegistry ?? createModelRegistry(provider);

    return {
      modelRegistry,
      resumeRenderer: new ResumeRenderer(ctx.applicantRepo, pdfRenderer),
      jobConsultant: new JobConsultant(ctx.applicantRepo, consultationLlm),
      vacancyScanner: new VacancyScanner(
        ctx.vacancyRepo,
        ctx.jobSearchRepo,
        ctx.applicantRepo,
        assessmentLlm,
        commuteClient,
      ),
      coverLetterWriter: new CoverLetterWriter(
        ctx.jobSearchRepo,
        ctx.applicantRepo,
        ctx.vacancyRepo,
        coverLetterLlm,
      ),
    };
  }

  let services = buildServices();

  return {
    applicantRepo: ctx.applicantRepo,
    jobSearchRepo: ctx.jobSearchRepo,
    vacancyRepo: ctx.vacancyRepo,
    secretsRepo: ctx.secretsRepo,
    configRepo: ctx.configRepo,
    get modelRegistry() {
      return services.modelRegistry;
    },
    get resumeRenderer() {
      return services.resumeRenderer;
    },
    get jobConsultant() {
      return services.jobConsultant;
    },
    get vacancyScanner() {
      return services.vacancyScanner;
    },
    get coverLetterWriter() {
      return services.coverLetterWriter;
    },
    rebuild() {
      services = buildServices();
    },
  };
}

export function createSqliteServiceContext(
  db: Database,
  secretsRepo: SecretsRepository,
  configRepo: ConfigRepository,
): ServiceContext {
  return {
    applicantRepo: createSqliteApplicantRepository(db),
    jobSearchRepo: createSqliteJobSearchRepository(db),
    secretsRepo,
    configRepo,
    vacancyRepo: createSqliteVacancyRepository(db),
  };
}
