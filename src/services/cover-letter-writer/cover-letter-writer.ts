import type { JobSearchRepository } from "@/repositories/job-search/types.js";
import type { ApplicantRepository } from "@/repositories/applicant/types.js";
import type { VacancyRepository } from "@/repositories/vacancy/types.js";
import type { LlmClient } from "@/plugins/llm/types.js";
import { generateCoverLetter } from "./generate.js";
import { generatePersonalizedCoverLetter } from "./generate-personalized.js";

export class CoverLetterWriter {
  constructor(
    private readonly jobSearchRepo: JobSearchRepository,
    private readonly applicantRepo: ApplicantRepository,
    private readonly vacancyRepo: VacancyRepository,
    private readonly llm: LlmClient | null,
  ) {}

  async generate(jobSearchId: string): Promise<{ content: string }> {
    const jobSearch = this.jobSearchRepo.load(jobSearchId);
    const applicant = this.applicantRepo.load(jobSearch.applicantId);

    if (!this.llm) {
      throw new Error("No LLM API key configured");
    }

    const content = await generateCoverLetter(applicant, jobSearch, this.llm);
    return { content };
  }

  async generateForVacancy(
    jobSearchId: string,
    vacancyHash: string,
  ): Promise<{ content: string }> {
    if (!this.llm) {
      throw new Error("No LLM API key configured");
    }

    const vacancy = this.vacancyRepo.findByHash(jobSearchId, vacancyHash);
    if (!vacancy) {
      throw new Error(`Vacancy "${vacancyHash}" not found`);
    }

    const jobSearch = this.jobSearchRepo.load(jobSearchId);
    const applicant = this.applicantRepo.load(jobSearch.applicantId);
    const templateCoverLetter = this.jobSearchRepo.loadCoverLetter(jobSearchId);

    const content = await generatePersonalizedCoverLetter(
      applicant,
      vacancy,
      templateCoverLetter,
      jobSearch,
      this.llm,
    );
    await this.jobSearchRepo.saveApplicationCoverLetter(
      jobSearchId,
      vacancyHash,
      content,
    );
    return { content };
  }
}
