import { describe, it, test, expect } from "vitest"
import { Vacancy } from "."

describe("status getter", () => {
  it("returns 'new' for active vacancy with no history", () => {
    expect(makeVacancy().status).toBe("new")
  })

  it("returns 'gone' for inactive vacancy with no user activities", () => {
    expect(makeVacancy({ active: false }).status).toBe("gone")
  })

  it("returns 'renewed' for active vacancy that was previously not-found", () => {
    expect(
      makeVacancy({
        activityHistory: [
          {
            type: "found",
            date: "2025-01-01",
            site: "s",
            url: "u",
            notes: "",
            description: "",
            contact: { name: "", email: "", phone: "" },
          },
          { type: "not-found", date: "2025-01-02", site: "s", notes: "" },
          {
            type: "found",
            date: "2025-01-03",
            site: "s",
            url: "u",
            notes: "",
            description: "",
            contact: { name: "", email: "", phone: "" },
          },
        ],
      }).status,
    ).toBe("renewed")
  })

  it("returns 'applied' for active vacancy with applied activity", () => {
    expect(
      makeVacancy({
        activityHistory: [{ type: "applied", date: "2025-01-01", notes: "" }],
      }).status,
    ).toBe("applied")
  })

  it("returns 'ignored' for inactive vacancy with applied activity", () => {
    expect(
      makeVacancy({
        active: false,
        activityHistory: [{ type: "applied", date: "2025-01-01", notes: "" }],
      }).status,
    ).toBe("ignored")
  })

  it("returns 'invited' when invited activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "applied", date: "2025-01-01", notes: "" },
          {
            type: "invited",
            date: "2025-01-02",
            interviewDate: "2025-01-10",
            notes: "",
          },
        ],
      }).status,
    ).toBe("invited")
  })

  it("returns 'interviewed' when interviewed activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "applied", date: "2025-01-01", notes: "" },
          {
            type: "interviewed",
            date: "2025-01-05",
            outcome: "completed",
            notes: "",
          },
        ],
      }).status,
    ).toBe("interviewed")
  })

  it("returns 'offered' when offered activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [
          {
            type: "offered",
            date: "2025-01-01",
            notes: "",
            startDate: "",
            salary: "",
          },
        ],
      }).status,
    ).toBe("offered")
  })

  it("returns 'rejected' when rejected activity exists (highest priority)", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "applied", date: "2025-01-01", notes: "" },
          {
            type: "offered",
            date: "2025-01-02",
            notes: "",
            startDate: "",
            salary: "",
          },
          { type: "rejected", date: "2025-01-03", notes: "" },
        ],
      }).status,
    ).toBe("rejected")
  })

  it("returns 'not-interested' when not-interested activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "not-interested", date: "2025-01-01", notes: "" },
        ],
      }).status,
    ).toBe("not-interested")
  })

  it("returns 'applied' over 'not-interested' when both exist", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "not-interested", date: "2025-01-01", notes: "" },
          { type: "applied", date: "2025-01-02", notes: "" },
        ],
      }).status,
    ).toBe("applied")
  })
})

describe("parse defaults", () => {
  it("fills missing runtime defaults", () => {
    expect(Vacancy.parse({ hash: "abc" })).toMatchObject({
      hash: "abc",
      title: "",
      company: "",
      addresses: [],
      contact: { name: "", email: "", phone: "" },
      startDate: "",
      description: "",
      enriched: false,
      enrichmentDirty: false,
      summary: "",
      matchScore: "unknown",
      activityHistory: [],
      active: true,
      coverLetter: "",
    })
  })
})

describe("sources getter", () => {
  test("empty history returns empty sources", () => {
    expect(makeVacancy().sources).toEqual([])
  })

  test("single found activity returns one source", () => {
    const result = makeVacancy({
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "xing",
          url: "https://xing.com/job/1",
          notes: "",
          description: "",
          contact: { name: "", email: "", phone: "" },
        },
      ],
    }).sources
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
          notes: "",
          description: "",
          contact: { name: "", email: "", phone: "" },
        },
        {
          type: "found",
          date: "2026-01-02",
          site: "xing",
          url: "https://xing.com/job/1",
          notes: "",
          description: "",
          contact: { name: "", email: "", phone: "" },
        },
      ],
    }).sources
    expect(result.length).toBe(1)
    expect(result[0]).toEqual({
      site: "xing",
      url: "https://xing.com/job/1",
    })
  })

  test("non-found activities are ignored", () => {
    const result = makeVacancy({
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "xing",
          url: "https://xing.com/job/1",
          notes: "",
          description: "",
          contact: { name: "", email: "", phone: "" },
        },
        { type: "applied", date: "2026-01-02", notes: "" },
      ],
    }).sources
    expect(result.length).toBe(1)
  })
})

describe("getMinCommuteMinutes", () => {
  test("returns undefined when no commute data", () => {
    expect(makeVacancy().getMinCommuteMinutes()).toBe(undefined)
  })

  test("returns morning minutes for single address with commute", () => {
    const v = makeVacancy({
      addresses: [
        {
          street: "",
          zip: "",
          city: "Berlin",
          commute: {
            distance: "10 km",
            durations: { morning: 25, day: 20, evening: 30 },
            fetchedAt: "2026-01-01",
          },
        },
      ],
    })
    expect(v.getMinCommuteMinutes()).toBe(25)
  })

  test("returns minimum morning across multiple addresses", () => {
    const v = makeVacancy({
      addresses: [
        {
          street: "",
          zip: "",
          city: "Berlin",
          commute: {
            distance: "10 km",
            durations: { morning: 25, day: 20, evening: 30 },
            fetchedAt: "2026-01-01",
          },
        },
        {
          street: "",
          zip: "",
          city: "Munich",
          commute: {
            distance: "600 km",
            durations: { morning: 15, day: 12, evening: 18 },
            fetchedAt: "2026-01-01",
          },
        },
      ],
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
        {
          type: "found",
          date: "2026-01-01",
          site: "s",
          url: "u",
          notes: "",
          description: "",
          contact: { name: "", email: "", phone: "" },
        },
        { type: "applied", date: "2026-01-15", notes: "" },
      ],
    })
    expect(v.getLatestActivityDate()).toBe("2026-01-15")
  })
})

describe("recordActivity", () => {
  test("appends user activity to history", () => {
    const v = makeVacancy()
    v.recordActivity({ type: "applied", date: "2026-01-01", notes: "" })
    expect(v.activityHistory.length).toBe(1)
    expect(v.activityHistory[0].type).toBe("applied")
  })

  test("rejects found and not-found types", () => {
    const v = makeVacancy()
    expect(() =>
      v.recordActivity({
        type: "found",
        date: "",
        site: "x",
        url: "u",
        description: "",
        contact: { name: "", email: "", phone: "" },
        notes: "",
      }),
    ).toThrow('Cannot record "found" directly')
    expect(() =>
      v.recordActivity({ type: "not-found", date: "", site: "all", notes: "" }),
    ).toThrow('Cannot record "not-found" directly')
  })
})

describe("fromDiscovery", () => {
  const base = {
    site: "xing",
    url: "https://example.test/job",
    crawlDate: "2026-06-03",
    title: "Developer",
    company: "ACME",
    address: "Berlin",
    contact: { name: "", email: "", phone: "" },
    description: "Hello",
    startDate: "",
  }

  test("creates hash, found activity, sets enriched/enrichmentDirty", () => {
    const v = Vacancy.fromDiscovery(base)
    expect(v.hash).toBe(Vacancy.hashForDiscovery(base))
    expect(v.activityHistory).toHaveLength(1)
    expect(v.activityHistory[0].type).toBe("found")
    expect(v.active).toBe(true)
    expect(v.enriched).toBe(false)
    expect(v.enrichmentDirty).toBe(true)
  })

  test("handles blank address", () => {
    expect(
      Vacancy.fromDiscovery({ ...base, address: "" }).addresses,
    ).toHaveLength(0)
    const v = Vacancy.fromDiscovery({ ...base, address: "Munich" })
    expect(v.addresses).toHaveLength(1)
    expect(v.addresses[0].format()).toBe("Munich")
  })
})

describe("mergeDiscovery", () => {
  const discovery = {
    site: "xing",
    url: "https://example.test/job",
    crawlDate: "2026-06-04",
    title: "Developer",
    company: "ACME",
    address: "Berlin",
    contact: { name: "", email: "", phone: "" },
    description: "New description",
    startDate: "",
  }

  test("updates description and marks enrichmentDirty when changed", () => {
    const v = Vacancy.fromDiscovery({ ...discovery, description: "Old" })
    v.mergeDiscovery(discovery)
    expect(v.description).toBe("New description")
    expect(v.enrichmentDirty).toBe(true)
  })

  test("keeps prior description when new is empty", () => {
    const v = Vacancy.fromDiscovery({ ...discovery, description: "Original" })
    v.mergeDiscovery({ ...discovery, description: "" })
    expect(v.description).toBe("Original")
  })

  test("updates contact when non-empty, preserves when empty", () => {
    const v = Vacancy.fromDiscovery({
      ...discovery,
      contact: { name: "Existing", email: "e@t.com", phone: "456" },
    })
    v.mergeDiscovery({
      ...discovery,
      contact: { name: "John", email: "john@test.com", phone: "123" },
    })
    expect(v.contact.name).toBe("John")

    v.mergeDiscovery({
      ...discovery,
      contact: { name: "", email: "", phone: "" },
    })
    expect(v.contact.email).toBe("john@test.com")
  })

  test("renews a previously gone vacancy", () => {
    const v = Vacancy.fromDiscovery(discovery)
    v.markNotFound("2026-06-03")
    expect(v.active).toBe(false)
    v.mergeDiscovery(discovery)
    expect(v.active).toBe(true)
  })

  test("appends a new found activity", () => {
    const v = Vacancy.fromDiscovery(discovery)
    v.mergeDiscovery({
      ...discovery,
      site: "stepstone",
      url: "https://s.t/job",
    })
    expect(v.activityHistory).toHaveLength(2)
    expect(v.activityHistory[1].type).toBe("found")
  })
})

describe("updateCoverLetter", () => {
  test("updates cover letter content", () => {
    const v = makeVacancy()
    expect(v.coverLetter).toBe("")
    v.updateCoverLetter("Dear Sir/Madam...")
    expect(v.coverLetter).toBe("Dear Sir/Madam...")
  })
})

describe("markNotFound", () => {
  test("appends not-found activity and flips active false", () => {
    const v = makeVacancy({ active: true })
    v.markNotFound("2026-06-03")

    expect(v.active).toBe(false)
    const last = v.activityHistory.at(-1)
    expect(last).toBeDefined()
    expect(last?.type).toBe("not-found")
    expect(last?.date).toBe("2026-06-03")
  })

  test("is idempotent when already inactive", () => {
    const v = makeVacancy({ active: false })
    v.markNotFound("2026-06-03")

    expect(v.active).toBe(false)
    expect(v.activityHistory).toHaveLength(0)
  })
})

describe("hashForDiscovery", () => {
  const d = {
    site: "xing",
    url: "https://xing.com/job/1",
    crawlDate: "2026-01-01",
    title: "Developer",
    company: "ACME",
    address: "Berlin",
    contact: { name: "", email: "", phone: "" },
    description: "",
    startDate: "",
  }

  test("produces deterministic 6-char hash", () => {
    expect(Vacancy.hashForDiscovery(d)).toBe(Vacancy.hashForDiscovery(d))
    expect(Vacancy.hashForDiscovery(d).length).toBe(6)
  })

  test("different input produces different hash", () => {
    expect(Vacancy.hashForDiscovery(d)).not.toBe(
      Vacancy.hashForDiscovery({ ...d, title: "Senior Developer" }),
    )
  })
})

describe("legacy parsing", () => {
  test("ignores old urls field", () => {
    const v = Vacancy.parse({ hash: "h1", urls: ["http://old"] })
    expect(v.sources).toEqual([])
  })

  test("maps old string addresses", () => {
    const v = Vacancy.parse({ hash: "h1", addresses: ["Berlin"] })
    expect(v.addresses.length).toBe(1)
    expect(v.addresses[0].format()).toBe("Berlin")
  })

  test("merges old commute record into matching address", () => {
    const v = Vacancy.parse({
      hash: "h1",
      addresses: ["Berlin"],
      commute: {
        Berlin: {
          distance: "5 km",
          durations: { morning: 10, day: 8, evening: 12 },
          fetchedAt: "2026-01-01",
        },
      },
    })
    expect(v.addresses[0].commute).toBeDefined()
    expect(v.addresses[0].commute?.distance).toBe("5 km")
  })

  test("defaults missing matchScore to unknown", () => {
    const v = Vacancy.parse({ hash: "h1" })
    expect(v.matchScore).toBe("unknown")
  })

  test("defaults missing coverLetter to empty string", () => {
    const v = Vacancy.parse({ hash: "h1" })
    expect(v.coverLetter).toBe("")
  })
})

function makeVacancy(overrides: Record<string, unknown> = {}): Vacancy {
  return Vacancy.parse({
    hash: "abc123",
    title: "Test",
    company: "Test Co",
    addresses: [],
    contact: { name: "", email: "", phone: "" },
    activityHistory: [],
    active: true,
    ...overrides,
  })
}
