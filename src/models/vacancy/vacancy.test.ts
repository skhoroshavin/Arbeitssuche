import { describe, it, test, expect } from "vitest"
import { Vacancy } from "."
import type { VacancyDTO } from "./types"

describe("deriveStatus", () => {
  it("returns 'new' for active vacancy with no history", () => {
    expect(makeVacancy().deriveStatus()).toBe("new")
  })

  it("returns 'gone' for inactive vacancy with no user activities", () => {
    expect(makeVacancy({ active: false }).deriveStatus()).toBe("gone")
  })

  it("returns 'renewed' for active vacancy that was previously not-found", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "found", date: "2025-01-01", site: "s", url: "u" },
          { type: "not-found", date: "2025-01-02", site: "s" },
          { type: "found", date: "2025-01-03", site: "s", url: "u" },
        ],
      }).deriveStatus(),
    ).toBe("renewed")
  })

  it("returns 'applied' for active vacancy with applied activity", () => {
    expect(
      makeVacancy({
        activityHistory: [{ type: "applied", date: "2025-01-01" }],
      }).deriveStatus(),
    ).toBe("applied")
  })

  it("returns 'ignored' for inactive vacancy with applied activity", () => {
    expect(
      makeVacancy({
        active: false,
        activityHistory: [{ type: "applied", date: "2025-01-01" }],
      }).deriveStatus(),
    ).toBe("ignored")
  })

  it("returns 'invited' when invited activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "applied", date: "2025-01-01" },
          {
            type: "invited",
            date: "2025-01-02",
            interviewDate: "2025-01-10",
          },
        ],
      }).deriveStatus(),
    ).toBe("invited")
  })

  it("returns 'interviewed' when interviewed activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "applied", date: "2025-01-01" },
          { type: "interviewed", date: "2025-01-05", outcome: "completed" },
        ],
      }).deriveStatus(),
    ).toBe("interviewed")
  })

  it("returns 'offered' when offered activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [{ type: "offered", date: "2025-01-01" }],
      }).deriveStatus(),
    ).toBe("offered")
  })

  it("returns 'rejected' when rejected activity exists (highest priority)", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "applied", date: "2025-01-01" },
          { type: "offered", date: "2025-01-02" },
          { type: "rejected", date: "2025-01-03" },
        ],
      }).deriveStatus(),
    ).toBe("rejected")
  })

  it("returns 'not-interested' when not-interested activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [{ type: "not-interested", date: "2025-01-01" }],
      }).deriveStatus(),
    ).toBe("not-interested")
  })

  it("returns 'applied' over 'not-interested' when both exist", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "not-interested", date: "2025-01-01" },
          { type: "applied", date: "2025-01-02" },
        ],
      }).deriveStatus(),
    ).toBe("applied")
  })
})

describe("constructor", () => {
  it("fills missing runtime defaults", () => {
    expect(new Vacancy({ hash: "abc" })).toMatchObject({
      hash: "abc",
      title: "",
      company: "",
      urls: [],
      addresses: [],
      contact: {},
      startDate: "",
      description: "",
      enriched: false,
      enrichmentDirty: false,
      summary: "",
      matchScore: "ok",
      commute: {},
      activityHistory: [],
      active: true,
    })
  })
})

describe("deriveSources", () => {
  test("empty history returns empty sources", () => {
    expect(makeVacancy().deriveSources()).toEqual([])
  })

  test("single found activity returns one source", () => {
    const result = makeVacancy({
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "xing",
          url: "https://xing.com/job/1",
        },
      ],
    }).deriveSources()
    expect(result).toEqual([{ site: "xing", url: "https://xing.com/job/1" }])
  })

  test("repeated same site+url is deduplicated", () => {
    const result = makeVacancy({
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "xing",
          url: "https://xing.com/job/1",
        },
        {
          type: "found",
          date: "2026-01-02",
          site: "xing",
          url: "https://xing.com/job/1",
        },
      ],
    }).deriveSources()
    expect(result.length).toBe(1)
    expect(result[0]).toEqual({
      site: "xing",
      url: "https://xing.com/job/1",
    })
  })

  test("same site with different URLs produces multiple sources", () => {
    const result = makeVacancy({
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "xing",
          url: "https://xing.com/job/1",
        },
        {
          type: "found",
          date: "2026-01-02",
          site: "xing",
          url: "https://xing.com/job/2",
        },
      ],
    }).deriveSources()
    expect(result.length).toBe(2)
  })

  test("multiple sites return one entry per unique pair", () => {
    const result = makeVacancy({
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "xing",
          url: "https://xing.com/job/1",
        },
        {
          type: "found",
          date: "2026-01-01",
          site: "arbeitsagentur",
          url: "https://aa.de/job/1",
        },
      ],
    }).deriveSources()
    expect(result.length).toBe(2)
    expect(result[0].site).toBe("xing")
    expect(result[1].site).toBe("arbeitsagentur")
  })

  test("non-found activities are ignored", () => {
    const result = makeVacancy({
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "xing",
          url: "https://xing.com/job/1",
        },
        { type: "applied", date: "2026-01-02" },
        { type: "not-found", date: "2026-01-03", site: "xing" },
      ],
    }).deriveSources()
    expect(result.length).toBe(1)
    expect(result[0].site).toBe("xing")
  })
})

describe("getMinCommuteMinutes", () => {
  test("returns undefined when no commute data", () => {
    expect(makeVacancy().getMinCommuteMinutes()).toBe(undefined)
  })

  test("returns undefined for empty commute record", () => {
    expect(makeVacancy({ commute: {} }).getMinCommuteMinutes()).toBe(undefined)
  })

  test("returns morning minutes for single address", () => {
    const v = makeVacancy({
      commute: {
        Berlin: {
          distance: "10 km",
          durations: { morning: 25, day: 20, evening: 30 },
          fetchedAt: "2026-01-01",
        },
      },
    })
    expect(v.getMinCommuteMinutes()).toBe(25)
  })

  test("returns minimum morning across multiple addresses", () => {
    const v = makeVacancy({
      commute: {
        Berlin: {
          distance: "10 km",
          durations: { morning: 25, day: 20, evening: 30 },
          fetchedAt: "2026-01-01",
        },
        Munich: {
          distance: "600 km",
          durations: { morning: 15, day: 12, evening: 18 },
          fetchedAt: "2026-01-01",
        },
      },
    })
    expect(v.getMinCommuteMinutes()).toBe(15)
  })
})

describe("getLatestActivityDate", () => {
  test("returns empty string for no activities", () => {
    expect(makeVacancy().getLatestActivityDate()).toBe("")
  })

  test("returns last activity date", () => {
    const v = makeVacancy({
      activityHistory: [
        { type: "found", date: "2026-01-01", site: "s", url: "u" },
        { type: "applied", date: "2026-01-15" },
      ],
    })
    expect(v.getLatestActivityDate()).toBe("2026-01-15")
  })
})

describe("with", () => {
  test("returns new instance with overridden fields", () => {
    const v = makeVacancy({ title: "Original" })
    const v2 = v.with({ title: "Updated" })
    expect(v2.title).toBe("Updated")
    expect(v.title).toBe("Original")
    expect(v2 instanceof Vacancy).toBeTruthy()
  })

  test("preserves non-overridden fields", () => {
    const v = makeVacancy({ company: "ACME", title: "Dev" })
    const v2 = v.with({ title: "Senior Dev" })
    expect(v2.company).toBe("ACME")
  })
})

function makeVacancy(overrides: Partial<VacancyDTO> = {}): Vacancy {
  return new Vacancy({
    hash: "abc123",
    title: "Test",
    company: "Test Co",
    urls: [],
    addresses: [],
    activityHistory: [],
    active: true,
    ...overrides,
  })
}
