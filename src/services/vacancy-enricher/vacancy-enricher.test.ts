import { describe, it, expect, vi } from "vitest"
import { VacancyEnricher } from "."
import { Vacancy } from "@/models/vacancy/index.js"
import type { Applicant } from "@/models/applicant"
import type { SearchPreferences } from "@/models/job-search"
import type { LlmClient, TypedSchema } from "@/plugins/llm"

describe("VacancyEnricher", () => {
  it("sets enriched=true and enrichmentDirty=false after successful enrichment", async () => {
    const enricher = new VacancyEnricher({ llmClient: makeLlmClient() })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      preferences: PREFERENCES,
    })

    expect(result.enriched).toBe(true)
    expect(result.enrichmentDirty).toBe(false)
  })

  it("keeps vacancies retryable when no LLM client is configured", async () => {
    const enricher = new VacancyEnricher({})
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      preferences: PREFERENCES,
    })

    expect(result.summary).toBe("")
    expect(result.enriched).toBe(false)
    expect(result.enrichmentDirty).toBe(true)
  })

  it("keeps enrichmentDirty=true after LLM failure so user can retry", async () => {
    const llmClient = makeLlmClient({ shouldFail: true })
    const enricher = new VacancyEnricher({ llmClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      preferences: PREFERENCES,
    })

    expect(result.summary).toBe("")
    expect(result.enriched).toBe(false)
    expect(result.enrichmentDirty).toBe(true)
  })

  it("rejects with AbortError when signal is already aborted", async () => {
    const controller = new AbortController()
    controller.abort()

    const llmClient = makeLlmClient()
    const enricher = new VacancyEnricher({ llmClient })
    const vacancy = makeVacancy()

    await expect(
      enricher.enrich(
        vacancy,
        { applicant: APPLICANT, preferences: PREFERENCES },
        controller.signal,
      ),
    ).rejects.toThrow()
  })

  it("rejects with AbortError when signal is aborted during LLM call", async () => {
    const controller = new AbortController()

    const llmClient = makeLlmClient({ delayMs: 500 })
    const enricher = new VacancyEnricher({ llmClient })
    const vacancy = makeVacancy()

    const promise = enricher.enrich(
      vacancy,
      { applicant: APPLICANT, preferences: PREFERENCES },
      controller.signal,
    )

    setTimeout(() => controller.abort(), 10)

    await expect(promise).rejects.toThrow()
  })
})

const APPLICANT: Applicant = {
  id: "a1",
  personal: {
    name: "Test User",
    hobbies: [],
    address: { street: "Teststr. 1", zip: "10115", city: "Berlin" },
  },
  disclose: { birthdate: false, gender: false, address: false, hobbies: false },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
}

const PREFERENCES: SearchPreferences = {
  freeText: [],
}

function makeVacancy(
  overrides: Partial<ConstructorParameters<typeof Vacancy>[0]> = {},
): Vacancy {
  return new Vacancy({
    hash: "abc123",
    title: "Developer",
    company: "ACME",
    description: "Some job description",
    addresses: ["Berlin"],
    activityHistory: [],
    active: true,
    enriched: false,
    enrichmentDirty: true,
    ...overrides,
  })
}

function makeLlmClient(
  options: { shouldFail?: boolean; delayMs?: number } = {},
): LlmClient {
  const delay = options.delayMs ?? 0

  const resolveWithSchema = <T>(
    schema: TypedSchema<T>,
    signal?: AbortSignal,
  ): Promise<T> => {
    if (delay > 0 && signal) {
      return new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"))
          return
        }
        const timer = setTimeout(() => {
          resolve(
            schema.parse(
              JSON.stringify({ summary: "- Good match", matchScore: "good" }),
            ),
          )
        }, delay)
        const onAbort = () => {
          clearTimeout(timer)
          reject(new DOMException("Aborted", "AbortError"))
        }
        signal.addEventListener("abort", onAbort, { once: true })
      })
    }
    return Promise.resolve(
      schema.parse(
        JSON.stringify({ summary: "- Good match", matchScore: "good" }),
      ),
    )
  }

  const completeJSON: LlmClient["completeJSON"] = options.shouldFail
    ? <T>(
        _prompt: string,
        _maxTokens: number,
        _schema: TypedSchema<T>,
        _signal?: AbortSignal,
      ): Promise<T> => Promise.reject(new Error("LLM unavailable"))
    : <T>(
        _prompt: string,
        _maxTokens: number,
        schema: TypedSchema<T>,
        signal?: AbortSignal,
      ): Promise<T> => resolveWithSchema(schema, signal)

  return {
    complete: vi.fn<LlmClient["complete"]>().mockResolvedValue(""),
    completeJSON,
    ping: vi.fn<LlmClient["ping"]>().mockResolvedValue(true),
  }
}
