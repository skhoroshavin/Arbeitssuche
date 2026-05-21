import type { JobSearchRepository } from "@/repositories/job-search"
import type { ApplicantRepository } from "@/repositories/applicant"
import type { VacancyRepository } from "@/repositories/vacancy"
import type { LlmClient } from "@/plugins/llm"
import { ensureLlmAvailable } from "@/services/llm/index.js"
import { makeJobSearchID } from "@/models/job-search"
import { makeApplicantID } from "@/models/applicant"
import { generateCoverLetter } from "./generate.js"
import { generatePersonalizedCoverLetter } from "./generate-personalized.js"

export class CoverLetterWriter {
  constructor(
    private readonly jobSearchRepo: JobSearchRepository,
    private readonly applicantRepo: ApplicantRepository,
    private readonly vacancyRepo: VacancyRepository,
    private readonly llm?: LlmClient,
  ) {}

  async generate(jobSearchId: string): Promise<{ content: string }> {
    const { jobSearch, applicantId } = this.jobSearchRepo.load(
      makeJobSearchID(jobSearchId),
    )
    const applicant = this.applicantRepo.load(applicantId)

    ensureLlmAvailable(this.llm)

    const content = await generateCoverLetter(applicant, jobSearch, this.llm)
    return { content }
  }

  async generateFromDraft(applicantId: string): Promise<{ content: string }> {
    const draft = this.jobSearchRepo.loadDraft(makeApplicantID(applicantId))
    if (!draft)
      throw new Error(`Draft for applicant "${applicantId}" not found`)
    const applicant = this.applicantRepo.load(makeApplicantID(applicantId))
    ensureLlmAvailable(this.llm)

    const content = await generateCoverLetter(applicant, draft, this.llm)
    return { content }
  }

  async generateForVacancy(
    jobSearchId: string,
    vacancyHash: string,
  ): Promise<{ content: string }> {
    ensureLlmAvailable(this.llm)

    const vacancy = this.vacancyRepo.findByHash(
      makeJobSearchID(jobSearchId),
      vacancyHash,
    )
    if (!vacancy) {
      throw new Error(`Vacancy "${vacancyHash}" not found`)
    }

    const { jobSearch, applicantId } = this.jobSearchRepo.load(
      makeJobSearchID(jobSearchId),
    )
    const applicant = this.applicantRepo.load(applicantId)
    const templateCoverLetter = jobSearch.coverLetter

    const content = await generatePersonalizedCoverLetter(
      applicant,
      vacancy,
      templateCoverLetter,
      jobSearch,
      this.llm,
    )

    const vacancies = this.vacancyRepo.allForJobSearch(makeJobSearchID(jobSearchId))
    const target = vacancies.find((v) => v.hash === vacancyHash)
    if (!target) throw new Error(`Vacancy "${vacancyHash}" not found`)
    target.coverLetter = content
    this.vacancyRepo.save(makeJobSearchID(jobSearchId), vacancies)

    return { content }
  }
}
