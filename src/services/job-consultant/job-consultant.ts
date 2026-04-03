import type { ApplicantRepository } from "@/repositories/applicant/types.js"
import type { LlmClient } from "@/plugins/llm/types.js"
import type { ConsultationSuggestion } from "@/models/job-search/types.js"
import { ensureLlmAvailable } from "@/services/asserts.js"
import { consultSearches } from "./consult-searches.js"

export class JobConsultant {
  constructor(
    private readonly applicantRepo: ApplicantRepository,
    private readonly llm?: LlmClient,
  ) {}

  async consult(
    applicantId: string,
  ): Promise<{ suggestions: ConsultationSuggestion[] }> {
    const applicant = this.applicantRepo.load(applicantId)

    ensureLlmAvailable(this.llm)

    const suggestions = await consultSearches(applicant, this.llm)
    return { suggestions }
  }
}
