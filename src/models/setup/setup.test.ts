import { describe, expect, it } from "vitest"
import {
  completeSetupState,
  createIncompleteSetupState,
  mergeSetupState,
  resolveSetupState,
} from "@/models/setup"

describe("setup model", () => {
  it("creates an incomplete state by default", () => {
    expect(createIncompleteSetupState()).toEqual({ completed: false })
  })

  it("resolves completed state by clearing progress fields", () => {
    expect(
      resolveSetupState({
        completed: true,
        lastPhase: "job-search",
        lastStep: "cover-letter",
        applicantId: "ada",
      }),
    ).toEqual(completeSetupState())
  })

  it("merges updates into the current incomplete state", () => {
    expect(
      mergeSetupState(
        {
          completed: false,
          lastPhase: "applicant",
          lastStep: "education",
        },
        {
          lastPhase: "job-search",
          applicantId: "ada",
        },
      ),
    ).toEqual({
      completed: false,
      lastPhase: "job-search",
      lastStep: "education",
      applicantId: "ada",
    })
  })

  it("resets progress when the merged state becomes completed", () => {
    expect(
      mergeSetupState(
        {
          completed: false,
          lastPhase: "applicant",
          lastStep: "other",
          applicantId: "ada",
        },
        { completed: true },
      ),
    ).toEqual({ completed: true })
  })
})
