import { describe, it, expect } from "vitest"
import { toVacancyDiscovery, markUnseenAsGone } from "."
import { Vacancy } from "@/models/vacancy/index.js"
import type { VacancyDetails } from "@/plugins/job-site"
import { Address } from "@/models/common"
import { makeDateString } from "@/plugins/job-site"

describe("toVacancyDiscovery", () => {
  it("maps VacancyDetails to VacancyDiscovery", () => {
    const details = makeDetails({
      title: "Developer",
      company: "ACME",
      descriptionHtml: "<p>Job description</p>",
    })
    const result = toVacancyDiscovery(details, "test-site", "2026-01-01")

    expect(result.site).toBe("test-site")
    expect(result.url).toBe("https://example.com/job/1")
    expect(result.crawlDate).toBe("2026-01-01")
    expect(result.title).toBe("Developer")
    expect(result.company).toBe("ACME")
    expect(result.description).toBe("Job description")
    expect(result.startDate).toBe("")
  })

  it("converts empty HTML description to empty string", () => {
    const details = makeDetails({ descriptionHtml: "" })
    const result = toVacancyDiscovery(details, "test-site", "2026-01-01")

    expect(result.description).toBe("")
  })

  it("formats address", () => {
    const address = new Address()
    address.street = "Main St 1"
    address.zip = "12345"
    address.city = "Berlin"
    const details = makeDetails({ address })
    const result = toVacancyDiscovery(details, "test-site", "2026-01-01")

    expect(result.address).toBe("Main St 1, 12345 Berlin")
  })
})

describe("markUnseenAsGone", () => {
  it("marks active unseen vacancy as gone via markNotFound", () => {
    const vacancy = makeExisting({ hash: "h1", active: true })
    const { vacancies, goneCount } = markUnseenAsGone(
      [vacancy],
      new Set(),
      "2026-01-01",
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
      "2026-01-01",
    )

    expect(goneCount).toBe(0)
    expect(vacancies[0]).toBe(vacancy)
  })

  it("does not mark seen vacancy as gone", () => {
    const vacancy = makeExisting({ hash: "h1", active: true })
    const { vacancies, goneCount } = markUnseenAsGone(
      [vacancy],
      new Set(["h1"]),
      "2026-01-01",
    )

    expect(goneCount).toBe(0)
    expect(vacancies[0].active).toBe(true)
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

function makeExisting(overrides: Record<string, unknown> = {}): Vacancy {
  return Vacancy.parse({
    hash: "abc123",
    title: "Developer",
    company: "ACME",
    addresses: [],
    contact: { name: "", email: "", phone: "" },
    activityHistory: [],
    active: true,
    enriched: true,
    enrichmentDirty: false,
    summary: "- Good match",
    ...overrides,
  })
}
