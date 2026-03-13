import type { ApplicantRepository } from "@/repositories/applicant/types.js";
import type { LlmClient } from "@/plugins/llm/types.js";
import type { ConsultationSuggestion } from "@/models/job-search/types.js";
import { consultSearches } from "@/services/job-consultant/consult-searches.js";

export class JobConsultant {
  constructor(
    private readonly applicantRepo: ApplicantRepository,
    private readonly llm: LlmClient | null,
  ) {}

  async consult(
    applicantId: string,
  ): Promise<{ suggestions: ConsultationSuggestion[] }> {
    const applicant = this.applicantRepo.load(applicantId);

    if (!this.llm) {
      throw new Error("No LLM API key configured");
    }

    const suggestions = await consultSearches(applicant, this.llm);
    return { suggestions };
  }
}
