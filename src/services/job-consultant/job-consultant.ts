import type { ApplicantRepository } from "@/repositories/applicant"
import type { LlmClient } from "@/plugins/llm"
import type { ConsultationSuggestion } from "@/models/job-search"
import { ensureLlmAvailable } from "@/services/llm/index.js"
import { consultSearches } from "./consult-searches.js"

export class JobConsultant {
  constructor(
    private readonly applicantRepo: ApplicantRepository,
    private readonly llm?: LlmClient,
  ) {}

  async consult(
    applicantId: string,
  ): Promise<{ suggestions: ConsultationSuggestion[] }> {
    const applicant = this.applicantRepo.load({ value: applicantId })

    ensureLlmAvailable(this.llm)

    const suggestions = await consultSearches(applicant, this.llm)
    return { suggestions }
  }
}
