import { describe, expect, it } from "vitest"
import { createStubSetupRepository } from "@/app/setup"

describe("StubSetupRepository", () => {
  it("loads undefined initially", () => {
    const repository = createStubSetupRepository()
    expect(repository.load()).toBeUndefined()
  })

  it("saves by merging partial updates", async () => {
    const repository = createStubSetupRepository()

    await repository.save({ lastPhase: "settings", lastStep: "ai" })
    await repository.save({ lastPhase: "job-search", applicantId: "ada" })

    expect(repository.load()).toEqual({
      completed: false,
      lastPhase: "job-search",
      lastStep: "ai",
      applicantId: "ada",
    })
  })

  it("completes by clearing phase progress", async () => {
    const repository = createStubSetupRepository({
      completed: false,
      lastPhase: "applicant",
      lastStep: "education",
      applicantId: "ada",
    })

    await repository.complete()

    expect(repository.load()).toEqual({ completed: true })
  })

  it("resets to an incomplete setup state", async () => {
    const repository = createStubSetupRepository({ completed: true })

    await repository.reset()

    expect(repository.load()).toEqual({ completed: false })
  })
})
