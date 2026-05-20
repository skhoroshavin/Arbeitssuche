import { describe, it, expect } from "vitest"
import { process, markUnseenAsGone, vacancyHash } from "."
import { Vacancy } from "@/models/vacancy/index.js"
import type { VacancyDetails } from "@/plugins/job-site"
import { Address } from "@/models/common"
import { makeDateString } from "@/plugins/job-site"

describe("process", () => {
  it("creates new vacancy with enriched=false and enrichmentDirty=true", () => {
    const result = process(makeDetails(), "test-site", new Map(), CRAWL_DATE)

    expect(result.isNew).toBe(true)
    expect(result.vacancy.enriched).toBe(false)
    expect(result.vacancy.enrichmentDirty).toBe(true)
  })

  it("adds found activity on new vacancy", () => {
    const result = process(makeDetails(), "test-site", new Map(), CRAWL_DATE)
    const [firstActivity] = result.vacancy.activityHistory

    expect(result.vacancy.activityHistory.length).toBe(1)
    expect(firstActivity.type).toBe("found")
    if (firstActivity.type !== "found") {
      throw new Error("Expected a found activity for new vacancies")
    }
    expect(firstActivity.site).toBe("test-site")
  })

  it("merges existing vacancy with unchanged description", () => {
    const description = "Some description"
    const existing = makeExisting({
      description,
      enriched: true,
      enrichmentDirty: false,
      summary: "- Old summary",
    })
    const map = new Map([[existing.hash, existing]])

    const result = process(
      makeDetails({ descriptionHtml: "" }),
      "test-site",
      map,
      CRAWL_DATE,
    )

    expect(result.isNew).toBe(false)
    expect(result.vacancy.enriched).toBe(true)
    expect(result.vacancy.enrichmentDirty).toBe(false)
    expect(result.vacancy.summary).toBe("- Old summary")
  })

  it("sets enrichmentDirty=true when description changes, preserves enriched", () => {
    const existing = makeExisting({
      description: "Old description",
      enriched: true,
      enrichmentDirty: false,
      summary: "- Old summary",
    })
    const map = new Map([[existing.hash, existing]])

    const result = process(
      makeDetails({ descriptionHtml: "<p>New description</p>" }),
      "test-site",
      map,
      CRAWL_DATE,
    )

    expect(result.isNew).toBe(false)
    expect(result.vacancy.enriched).toBe(true)
    expect(result.vacancy.enrichmentDirty).toBe(true)
    expect(result.vacancy.summary).toBe("- Old summary")
  })

  it("preserves enrichmentDirty=true even when description unchanged", () => {
    const existing = makeExisting({
      enriched: false,
      enrichmentDirty: true,
    })
    const map = new Map([[existing.hash, existing]])

    const result = process(makeDetails(), "test-site", map, CRAWL_DATE)

    expect(result.vacancy.enrichmentDirty).toBe(true)
  })
})

function makeDetails(overrides: Partial<VacancyDetails> = {}): VacancyDetails {
  return {
    url: "https://example.com/job/1",
    title: "Developer",
    company: "ACME",
    address: new Address(),
    descriptionHtml: "",
    startDate: makeDateString(""),
    publishedAt: makeDateString(""),
    contact: { name: "", email: "", phone: "" },
    ...overrides,
  }
}

describe("markUnseenAsGone", () => {
  it("marks active unseen vacancy as gone with not-found activity", () => {
    const vacancy = makeExisting({ hash: "h1", active: true })
    const { vacancies, goneCount } = markUnseenAsGone(
      [vacancy],
      new Set(),
      CRAWL_DATE,
    )

    expect(goneCount).toBe(1)
    expect(vacancies[0].active).toBe(false)
    const lastActivity = vacancies[0].activityHistory.at(-1)
    expect(lastActivity?.type).toBe("not-found")
  })

  it("does not change already inactive vacancy", () => {
    const vacancy = makeExisting({ hash: "h1", active: false })
    const { vacancies, goneCount } = markUnseenAsGone(
      [vacancy],
      new Set(),
      CRAWL_DATE,
    )

    expect(goneCount).toBe(0)
    expect(vacancies[0]).toBe(vacancy)
  })

  it("does not mark seen vacancy as gone", () => {
    const vacancy = makeExisting({ hash: "h1", active: true })
    const { vacancies, goneCount } = markUnseenAsGone(
      [vacancy],
      new Set(["h1"]),
      CRAWL_DATE,
    )

    expect(goneCount).toBe(0)
    expect(vacancies[0].active).toBe(true)
  })
})

const CRAWL_DATE = "2026-01-01"

function makeExisting(
  overrides: Partial<ConstructorParameters<typeof Vacancy>[0]> = {},
): Vacancy {
  return new Vacancy({
    hash: vacancyHash("Developer", "ACME"),
    title: "Developer",
    company: "ACME",
    urls: ["https://example.com/job/1"],
    activityHistory: [],
    active: true,
    enriched: true,
    enrichmentDirty: false,
    summary: "- Good match",
    ...overrides,
  })
}
