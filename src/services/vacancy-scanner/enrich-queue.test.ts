import { describe, it, expect, vi } from "vitest"
import { EnrichQueue } from "."
import { Vacancy } from "@/models/vacancy/index.js"
import type {
  VacancyEnricher,
  EnrichContext,
} from "@/services/vacancy-enricher/index.js"
import type { Applicant } from "@/models/applicant"
import type { SearchPreferences } from "@/models/job-search"

describe("EnrichQueue", () => {
  it("calls onEnriched after enrichment completes", async () => {
    const enricher = makeEnricher()
    const onEnriched = vi.fn()
    const queue = new EnrichQueue({
      enricher,
      context: CONTEXT,
      onEnriched,
      onError: vi.fn(),
    })

    const vacancy = makeVacancy("h1")
    queue.submit(vacancy, "h1")
    await queue.drain()

    expect(onEnriched).toHaveBeenCalledOnce()
    expect(onEnriched.mock.calls[0][1]).toBe("h1")
  })

  it("respects concurrency limit", async () => {
    let running = 0
    let maxRunning = 0
    const enricher: VacancyEnricher = {
      enrich: vi.fn().mockImplementation((vacancy: Vacancy) => {
        running++
        maxRunning = Math.max(maxRunning, running)
        return new Promise<Vacancy>((resolve) => {
          setTimeout(() => {
            running--
            resolve(vacancy)
          }, 10)
        })
      }),
    } as unknown as VacancyEnricher

    const queue = new EnrichQueue({
      enricher,
      context: CONTEXT,
      concurrency: 2,
      onEnriched: vi.fn(),
      onError: vi.fn(),
    })

    for (let index = 0; index < 5; index++) {
      queue.submit(makeVacancy(`h${index}`), `h${index}`)
    }
    await queue.drain()

    expect(maxRunning).toBeLessThanOrEqual(2)
    expect(queue.completed).toBe(5)
  })

  it("drain resolves when all work is done", async () => {
    const enricher = makeEnricher(5)
    const queue = new EnrichQueue({
      enricher,
      context: CONTEXT,
      onEnriched: vi.fn(),
      onError: vi.fn(),
    })

    queue.submit(makeVacancy("h1"), "h1")
    queue.submit(makeVacancy("h2"), "h2")
    await queue.drain()

    expect(queue.completed).toBe(2)
    expect(queue.pending).toBe(0)
  })

  it("abort clears pending queue", async () => {
    const enricher = makeEnricher(20)
    const onEnriched = vi.fn()
    const queue = new EnrichQueue({
      enricher,
      context: CONTEXT,
      concurrency: 1,
      onEnriched,
      onError: vi.fn(),
    })

    queue.submit(makeVacancy("h1"), "h1")
    queue.submit(makeVacancy("h2"), "h2")
    queue.submit(makeVacancy("h3"), "h3")
    queue.abort()
    await queue.drain()

    // Only the first (already in-flight) completes; rest are discarded
    expect(onEnriched.mock.calls.length).toBeLessThan(3)
  })

  it("calls onError on enrichment failure", async () => {
    const enricher = makeEnricher(0, true)
    const onError = vi.fn()
    const queue = new EnrichQueue({
      enricher,
      context: CONTEXT,
      onEnriched: vi.fn(),
      onError,
    })

    queue.submit(makeVacancy("h1"), "h1")
    await queue.drain()

    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0][0]).toBe("h1")
  })

  it("continues processing after error", async () => {
    let callCount = 0
    const enricher: VacancyEnricher = {
      enrich: vi.fn().mockImplementation((vacancy: Vacancy) => {
        callCount++
        if (callCount === 1) return Promise.reject(new Error("fail"))
        return Promise.resolve(vacancy)
      }),
    } as unknown as VacancyEnricher

    const onEnriched = vi.fn()
    const queue = new EnrichQueue({
      enricher,
      context: CONTEXT,
      concurrency: 1,
      onEnriched,
      onError: vi.fn(),
    })

    queue.submit(makeVacancy("h1"), "h1")
    queue.submit(makeVacancy("h2"), "h2")
    await queue.drain()

    expect(queue.completed).toBe(2)
    expect(onEnriched).toHaveBeenCalledOnce()
  })

  it("reports progress via onProgress", async () => {
    const onProgress = vi.fn()
    const enricher = makeEnricher()
    const queue = new EnrichQueue({
      enricher,
      context: CONTEXT,
      onEnriched: vi.fn(),
      onError: vi.fn(),
      onProgress,
    })

    queue.submit(makeVacancy("h1"), "h1")
    queue.submit(makeVacancy("h2"), "h2")
    await queue.drain()

    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress.mock.calls[1][0]).toEqual({ completed: 2, total: 2 })
  })

  it("tracks total count correctly", () => {
    const enricher = makeEnricher(100)
    const queue = new EnrichQueue({
      enricher,
      context: CONTEXT,
      onEnriched: vi.fn(),
      onError: vi.fn(),
    })

    queue.submit(makeVacancy("h1"), "h1")
    queue.submit(makeVacancy("h2"), "h2")
    queue.submit(makeVacancy("h3"), "h3")

    expect(queue.total).toBe(3)
    expect(queue.pending).toBe(1)
  })
})

const CONTEXT: EnrichContext = {
  applicant: {
    id: "a1",
    personal: { name: "Test", hobbies: [] },
    disclose: {
      birthdate: false,
      gender: false,
      address: false,
      hobbies: false,
    },
    experience: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
  } as Applicant,
  preferences: { freeText: [] } as SearchPreferences,
}

function makeVacancy(hash: string): Vacancy {
  return new Vacancy({
    hash,
    title: "Dev",
    company: "ACME",
    activityHistory: [],
    active: true,
  })
}

function makeEnricher(delayMs = 0, shouldFail = false): VacancyEnricher {
  return {
    enrich: vi.fn().mockImplementation((vacancy: Vacancy) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (shouldFail) {
            reject(new Error("enrichment failed"))
          } else {
            resolve(vacancy.with({ enriched: true, enrichmentDirty: false }))
          }
        }, delayMs)
      })
    }),
  } as unknown as VacancyEnricher
}
