import { describe, expect, test, vi } from "vitest"
import { Applicant } from "@/models/applicant"
import { JobSearch } from "@/models/job-search"
import { createStubApplicantRepository } from "@/repositories/applicant"
import { createStubJobSearchRepository } from "@/repositories/job-search"
import { createStubVacancyRepository } from "@/repositories/vacancy"
import { CoverLetterWriter } from "."
import { makeApplicantID } from "@/models/applicant"

describe("CoverLetterWriter", () => {
  test("generates cover letter from applicant draft", async () => {
    const applicant = new Applicant()
    applicant.personal.name = "Anna Tester"

    const applicantRepo = createStubApplicantRepository({
      "1": applicant,
    })
    const jobSearchRepo = createStubJobSearchRepository()
    const draft = new JobSearch()
    draft.searchTerm = "React"
    jobSearchRepo.saveDraft(makeApplicantID("1"), draft)

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
