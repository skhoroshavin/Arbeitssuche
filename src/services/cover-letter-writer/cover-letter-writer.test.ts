import { describe, expect, test, vi } from "vitest"
import { DEFAULT_APPLICANT } from "@/models/applicant"
import { createDefaultJobSearchEditorSnapshot } from "@/models/job-search"
import { createStubApplicantRepository } from "@/repositories/applicant"
import { createStubJobSearchRepository } from "@/repositories/job-search"
import { createStubVacancyRepository } from "@/repositories/vacancy"
import { CoverLetterWriter } from "."
import { ApplicantID } from "@/models/applicant"

describe("CoverLetterWriter", () => {
  test("generates cover letter from applicant draft", async () => {
    const applicantRepo = createStubApplicantRepository({
      "1": {
        ...DEFAULT_APPLICANT,
        personal: {
          ...DEFAULT_APPLICANT.personal,
          name: "Anna Tester",
        },
      },
    })
    const jobSearchRepo = createStubJobSearchRepository()
    const draft = createDefaultJobSearchEditorSnapshot()
    draft.searchTerm = "React"
    jobSearchRepo.saveDraft(ApplicantID("1"), draft)

    const llm = {
      complete: vi.fn().mockResolvedValue("generated letter"),
      completeJSON: vi.fn(),
      ping: vi.fn(),
    }

    const writer = new CoverLetterWriter(
      jobSearchRepo,
      applicantRepo,
      createStubVacancyRepository(),
      llm,
    )

    const result = await writer.generateFromDraft("1")

    expect(result.content).toBe("generated letter")
    expect(llm.complete).toHaveBeenCalledOnce()
  })
})
