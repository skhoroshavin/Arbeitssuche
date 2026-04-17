import { describe, expect, test, vi } from "vitest"
import { DEFAULT_APPLICANT } from "@/models/applicant"
import { createDefaultJobSearchEditorSnapshot } from "@/models/job-search"
import { createStubApplicantRepository } from "@/repositories/applicant/testing"
import { createStubJobSearchRepository } from "@/repositories/job-search/testing"
import { createStubVacancyRepository } from "@/repositories/vacancy/testing"
import { CoverLetterWriter } from "."

describe("CoverLetterWriter", () => {
  test("generates cover letter from applicant draft", async () => {
    const applicantRepo = createStubApplicantRepository({
      anna: {
        ...DEFAULT_APPLICANT,
        id: "anna",
        personal: {
          ...DEFAULT_APPLICANT.personal,
          name: "Anna Tester",
        },
      },
    })
    const jobSearchRepo = createStubJobSearchRepository()
    const draft = createDefaultJobSearchEditorSnapshot()
    draft.params.searchTerm = "React"
    jobSearchRepo.saveDraft("anna", draft)

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

    const result = await writer.generateFromDraft("anna")

    expect(result.content).toBe("generated letter")
    expect(llm.complete).toHaveBeenCalledOnce()
  })
})
