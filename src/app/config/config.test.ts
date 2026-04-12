import { test, describe, expect } from "vitest"
import type { AppConfig } from "@/models/config"
import { createStubConfigRepository } from "."

function configRepositoryTests(name: string) {
  describe(name, () => {
    test("returns empty config initially", () => {
      const repo = createStubConfigRepository()
      expect(repo.load()).toEqual({})
    })

    test("save + load round-trips", async () => {
      const repo = createStubConfigRepository()
      await repo.save(SAMPLE_CONFIG)
      expect(repo.load()).toEqual(SAMPLE_CONFIG)
    })

    test("save with partial data", async () => {
      const repo = createStubConfigRepository()
      const partial: AppConfig = { assessmentModel: "test/model" }
      await repo.save(partial)
      expect(repo.load()).toEqual(partial)
    })

    test("load returns a deep copy", async () => {
      const repo = createStubConfigRepository()
      await repo.save(SAMPLE_CONFIG)
      const a = repo.load()
      const b = repo.load()
      expect(a).not.toBe(b)
      a.assessmentModel = "mutated"
      expect(repo.load().assessmentModel).toBe("google/gemini-2.5-flash")
    })

    test("save overwrites previous data", async () => {
      const repo = createStubConfigRepository()
      await repo.save(SAMPLE_CONFIG)
      const updated: AppConfig = { coverLetterModel: "new-model" }
      await repo.save(updated)
      expect(repo.load()).toEqual(updated)
    })
  })
}

configRepositoryTests("StubConfigRepository")

// --- Stub-specific ---

test("StubConfigRepository initializes from provided data", () => {
  const repo = createStubConfigRepository(SAMPLE_CONFIG)
  expect(repo.load()).toEqual(SAMPLE_CONFIG)
})

const SAMPLE_CONFIG: AppConfig = {
  assessmentModel: "google/gemini-2.5-flash",
  coverLetterModel: "anthropic/claude-opus-4",
}
