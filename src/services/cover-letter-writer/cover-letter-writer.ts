import type { JobSearchRepository } from "@/repositories/job-search/types.js";
import type { ApplicantRepository } from "@/repositories/applicant/types.js";
import type { VacancyRepository } from "@/repositories/vacancy/types.js";
import type { LlmClient } from "@/plugins/llm/types.js";
import { ensureLlmAvailable } from "@/services/asserts.js";
import { generateCoverLetter } from "./generate.js";
import { generatePersonalizedCoverLetter } from "./generate-personalized.js";

export class CoverLetterWriter {
  constructor(
    private readonly jobSearchRepo: JobSearchRepository,
    private readonly applicantRepo: ApplicantRepository,
    private readonly vacancyRepo: VacancyRepository,
    private readonly llm?: LlmClient,
  ) {}

  async generate(jobSearchId: string): Promise<{ content: string }> {
    const jobSearch = this.jobSearchRepo.load(jobSearchId);
    const applicant = this.applicantRepo.load(jobSearch.applicantId);

    ensureLlmAvailable(this.llm);

    const content = await generateCoverLetter(applicant, jobSearch, this.llm);
    return { content };
  }

  async generateForVacancy(
    jobSearchId: string,
    vacancyHash: string,
  ): Promise<{ content: string }> {
    ensureLlmAvailable(this.llm);

    const vacancy = this.vacancyRepo.findByHash(jobSearchId, vacancyHash);
    if (!vacancy) {
      throw new Error(`Vacancy "${vacancyHash}" not found`);
    }

    const jobSearch = this.jobSearchRepo.load(jobSearchId);
    const applicant = this.applicantRepo.load(jobSearch.applicantId);
    const templateCoverLetter = this.jobSearchRepo.loadApplicationCoverLetter(
      jobSearchId,
      "",
    );

    const content = await generatePersonalizedCoverLetter(
      applicant,
      vacancy,
      templateCoverLetter,
      jobSearch,
      this.llm,
    );
    this.jobSearchRepo.saveApplicationCoverLetter(
      jobSearchId,
      vacancyHash,
      content,
    );
    return { content };
  }
}
