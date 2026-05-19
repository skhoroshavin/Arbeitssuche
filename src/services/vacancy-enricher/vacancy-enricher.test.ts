import { describe, it, expect, vi } from "vitest"
import { VacancyEnricher } from "."
import { Vacancy } from "@/models/vacancy/index.js"
import { Applicant } from "@/models/applicant"
import { JobSearch } from "@/models/job-search"
import type { LlmClient, TypedSchema } from "@/plugins/llm"
import type { CommuteClient } from "@/plugins/commute"

describe("VacancyEnricher", () => {
  it("sets enriched=true and enrichmentDirty=false after successful enrichment", async () => {
    const enricher = new VacancyEnricher({ llmClient: makeLlmClient() })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(result.enriched).toBe(true)
    expect(result.enrichmentDirty).toBe(false)
  })

  it("computes commute and sets summary when both clients configured", async () => {
    const { commuteClient, getCommuteMock } = makeCommuteClient()
    const llmClient = makeLlmClient()
    const enricher = new VacancyEnricher({ commuteClient, llmClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(getCommuteMock).toHaveBeenCalledWith(
      "Teststr. 1, 10115 Berlin",
      "Berlin",
      undefined,
    )
    expect(result.summary).toBe("- Good match")
    expect(result.matchScore).toBe("good")
    expect(result.enriched).toBe(true)
  })

  it("skips commute when no client configured", async () => {
    const enricher = new VacancyEnricher({ llmClient: makeLlmClient() })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(Object.keys(result.commute)).toHaveLength(0)
  })

  it("keeps vacancies retryable when no LLM client is configured", async () => {
    const { commuteClient } = makeCommuteClient()
    const enricher = new VacancyEnricher({ commuteClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(result.summary).toBe("")
    expect(result.enriched).toBe(false)
    expect(result.enrichmentDirty).toBe(true)
  })

  it("continues enrichment after commute failure", async () => {
    const { commuteClient } = makeCommuteClient({ shouldFail: true })
    const llmClient = makeLlmClient()
    const enricher = new VacancyEnricher({ commuteClient, llmClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(Object.keys(result.commute)).toHaveLength(0)
    expect(result.summary).toBe("- Good match")
    expect(result.enriched).toBe(true)
  })

  it("keeps enrichmentDirty=true after LLM failure so user can retry", async () => {
    const llmClient = makeLlmClient({ shouldFail: true })
    const enricher = new VacancyEnricher({ llmClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(result.summary).toBe("")
    expect(result.enriched).toBe(false)
    expect(result.enrichmentDirty).toBe(true)
  })

  it("derives commute origin from applicant address", async () => {
    const { commuteClient, getCommuteMock } = makeCommuteClient()
    const enricher = new VacancyEnricher({ commuteClient })
    const applicant = (() => {
      const a = new Applicant()
      a.personal.name = "Test User"
      a.personal.address = {
        street: "Hauptstr. 5",
        zip: "80331",
        city: "München",
      }
      return a
    })()

    await enricher.enrich(makeVacancy(), {
      applicant,
      jobSearch: JOB_SEARCH,
    })

    expect(getCommuteMock).toHaveBeenCalledWith(
      "Hauptstr. 5, 80331 München",
      "Berlin",
      undefined,
    )
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
        { applicant: APPLICANT, jobSearch: JOB_SEARCH },
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
      { applicant: APPLICANT, jobSearch: JOB_SEARCH },
      controller.signal,
    )

    setTimeout(() => controller.abort(), 10)

    await expect(promise).rejects.toThrow()
  })

  it("passes signal through to commute client", async () => {
    const controller = new AbortController()
    const signalCalls: (AbortSignal | undefined)[] = []

    const commuteClient: CommuteClient = {
      getCommute: (origin, destination, signal) => {
        signalCalls.push(signal)
        return Promise.resolve({
          distance: "10 km",
          durations: { morning: 20, day: 15, evening: 25 },
          fetchedAt: "2026-01-01",
        })
      },
      ping: () => Promise.resolve(true),
    }

    const enricher = new VacancyEnricher({ commuteClient })
    const vacancy = makeVacancy()

    await enricher.enrich(
      vacancy,
      { applicant: APPLICANT, jobSearch: JOB_SEARCH },
      controller.signal,
    )

    expect(signalCalls.length).toBeGreaterThanOrEqual(1)
    expect(signalCalls[0]).toBe(controller.signal)
  })
})

const APPLICANT: Applicant = (() => {
  const a = new Applicant()
  a.personal.name = "Test User"
  a.personal.address = { street: "Teststr. 1", zip: "10115", city: "Berlin" }
  return a
})()

const JOB_SEARCH: JobSearch = (() => {
  const index = new JobSearch()
  index.searchTerm = ""
  index.radiusKm = 30
  index.mode = "employment"
  index.sources = []
  index.maxResultsPerSource = 0
  index.maxCommuteMinutes = 0
  index.notes = ""
  index.coverLetter = ""
  return index
})()

const _CONTEXT = {
  applicant: APPLICANT,
  jobSearch: JOB_SEARCH,
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
    contact: { name: "", email: "", phone: "" },
    startDate: "",
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

function makeCommuteClient(options: { shouldFail?: boolean } = {}) {
  const getCommuteMock = options.shouldFail
    ? vi
        .fn<CommuteClient["getCommute"]>()
        .mockRejectedValue(new Error("API down"))
    : vi
        .fn<CommuteClient["getCommute"]>()
        .mockImplementation(
          (_origin: string, _destination: string, _signal?: AbortSignal) =>
            Promise.resolve({
              distance: "10 km",
              durations: { morning: 20, day: 15, evening: 25 },
              fetchedAt: "2026-01-01",
            }),
        )

  const commuteClient: CommuteClient = {
    getCommute: getCommuteMock,
    ping: vi.fn<CommuteClient["ping"]>().mockResolvedValue(true),
  }

  return {
    commuteClient,
    getCommuteMock,
  }
}
