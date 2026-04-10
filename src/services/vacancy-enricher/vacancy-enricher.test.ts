import { describe, it, expect, vi } from "vitest"
import { VacancyEnricher } from "."
import { Vacancy } from "@/models/vacancy/index.js"
import type { Applicant } from "@/models/applicant/types.js"
import type { SearchPreferences } from "@/models/job-search/types.js"
import type { LlmClient } from "@/plugins/llm/types.js"
import type { CommuteClient } from "@/plugins/commute/types.js"

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

  it("computes commute and sets summary when both clients configured", async () => {
    const { commuteClient, getCommuteMock } = makeCommuteClient()
    const llmClient = makeLlmClient()
    const enricher = new VacancyEnricher({ commuteClient, llmClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      preferences: PREFERENCES,
    })

    expect(getCommuteMock).toHaveBeenCalledWith(
      "Teststr. 1, 10115 Berlin",
      "Berlin",
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
      preferences: PREFERENCES,
    })

    expect(Object.keys(result.commute)).toHaveLength(0)
  })

  it("skips LLM when no client configured", async () => {
    const commuteClient = makeCommuteClient()
    const enricher = new VacancyEnricher({ commuteClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      preferences: PREFERENCES,
    })

    expect(result.summary).toBe("")
    expect(result.enriched).toBe(true)
  })

  it("continues enrichment after commute failure", async () => {
    const commuteClient: CommuteClient = {
      getCommute: vi.fn().mockRejectedValue(new Error("API down")),
    } as unknown as CommuteClient
    const llmClient = makeLlmClient()
    const enricher = new VacancyEnricher({ commuteClient, llmClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      preferences: PREFERENCES,
    })

    expect(Object.keys(result.commute)).toHaveLength(0)
    expect(result.summary).toBe("- Good match")
    expect(result.enriched).toBe(true)
  })

  it("keeps enrichmentDirty=true after LLM failure so user can retry", async () => {
    const llmClient: LlmClient = {
      completeJSON: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
    } as unknown as LlmClient
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

  it("derives commute origin from applicant address", async () => {
    const { commuteClient, getCommuteMock } = makeCommuteClient()
    const enricher = new VacancyEnricher({ commuteClient })
    const applicant: Applicant = {
      ...APPLICANT,
      personal: {
        ...APPLICANT.personal,
        address: { street: "Hauptstr. 5", zip: "80331", city: "München" },
      },
    }

    await enricher.enrich(makeVacancy(), {
      applicant,
      preferences: PREFERENCES,
    })

    expect(getCommuteMock).toHaveBeenCalledWith(
      "Hauptstr. 5, 80331 München",
      "Berlin",
    )
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

function makeLlmClient(): LlmClient {
  return {
    completeJSON: vi.fn().mockResolvedValue({
      summary: "- Good match",
      matchScore: "good",
    }),
  } as unknown as LlmClient
}

function makeCommuteClient(): {
  commuteClient: CommuteClient
  getCommuteMock: ReturnType<typeof vi.fn>
} {
  const getCommuteMock = vi.fn().mockResolvedValue({
    distance: "10 km",
    durations: { morning: 20, day: 15, evening: 25 },
    fetchedAt: "2026-01-01",
  })

  const commuteClient = {
    getCommute: getCommuteMock,
  } satisfies CommuteClient

  return {
    commuteClient,
    getCommuteMock,
  }
}
