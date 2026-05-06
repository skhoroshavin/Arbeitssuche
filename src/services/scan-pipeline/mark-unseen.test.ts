import { describe, it, expect } from "vitest"
import { markUnseenAsGone } from "./mark-unseen.js"
import { Vacancy } from "@/models/vacancy/index.js"

describe("markUnseenAsGone", () => {
  it("marks active unseen vacancy as gone with not-found activity", () => {
    const vacancy = makeVacancy({ hash: "h1", active: true })
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
    const vacancy = makeVacancy({ hash: "h1", active: false })
    const { vacancies, goneCount } = markUnseenAsGone(
      [vacancy],
      new Set(),
      CRAWL_DATE,
    )

    expect(goneCount).toBe(0)
    expect(vacancies[0]).toBe(vacancy)
  })

  it("does not mark seen vacancy as gone", () => {
    const vacancy = makeVacancy({ hash: "h1", active: true })
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

function makeVacancy(
  overrides: Partial<ConstructorParameters<typeof Vacancy>[0]> = {},
): Vacancy {
  return new Vacancy({
    hash: "h1",
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
