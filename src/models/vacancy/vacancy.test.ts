import { describe, it, test } from "node:test";
import assert from "node:assert/strict";
import { Vacancy } from "./vacancy.js";
import type { VacancyDTO } from "./types.js";

function makeVacancy(overrides: Partial<VacancyDTO> = {}): Vacancy {
  return new Vacancy({
    hash: "abc123",
    title: "Test",
    company: "Test Co",
    urls: [],
    addresses: [],
    descriptionChanged: false,
    activityHistory: [],
    active: true,
    ...overrides,
  });
}

describe("deriveStatus", () => {
  it("returns 'new' for active vacancy with no history", () => {
    assert.equal(makeVacancy().deriveStatus(), "new");
  });

  it("returns 'gone' for inactive vacancy with no user activities", () => {
    assert.equal(makeVacancy({ active: false }).deriveStatus(), "gone");
  });

  it("returns 'renewed' for active vacancy that was previously not-found", () => {
    assert.equal(
      makeVacancy({
        activityHistory: [
          { type: "found", date: "2025-01-01", site: "s", url: "u" },
          { type: "not-found", date: "2025-01-02", site: "s" },
          { type: "found", date: "2025-01-03", site: "s", url: "u" },
        ],
      }).deriveStatus(),
      "renewed",
    );
  });

  it("returns 'applied' for active vacancy with applied activity", () => {
    assert.equal(
      makeVacancy({
        activityHistory: [{ type: "applied", date: "2025-01-01" }],
      }).deriveStatus(),
      "applied",
    );
  });

  it("returns 'ignored' for inactive vacancy with applied activity", () => {
    assert.equal(
      makeVacancy({
        active: false,
        activityHistory: [{ type: "applied", date: "2025-01-01" }],
      }).deriveStatus(),
      "ignored",
    );
  });

  it("returns 'invited' when invited activity exists", () => {
    assert.equal(
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
      "invited",
    );
  });

  it("returns 'interviewed' when interviewed activity exists", () => {
    assert.equal(
      makeVacancy({
        activityHistory: [
          { type: "applied", date: "2025-01-01" },
          { type: "interviewed", date: "2025-01-05", outcome: "completed" },
        ],
      }).deriveStatus(),
      "interviewed",
    );
  });

  it("returns 'offered' when offered activity exists", () => {
    assert.equal(
      makeVacancy({
        activityHistory: [{ type: "offered", date: "2025-01-01" }],
      }).deriveStatus(),
      "offered",
    );
  });

  it("returns 'rejected' when rejected activity exists (highest priority)", () => {
    assert.equal(
      makeVacancy({
        activityHistory: [
          { type: "applied", date: "2025-01-01" },
          { type: "offered", date: "2025-01-02" },
          { type: "rejected", date: "2025-01-03" },
        ],
      }).deriveStatus(),
      "rejected",
    );
  });

  it("returns 'not-interested' when not-interested activity exists", () => {
    assert.equal(
      makeVacancy({
        activityHistory: [{ type: "not-interested", date: "2025-01-01" }],
      }).deriveStatus(),
      "not-interested",
    );
  });

  it("returns 'applied' over 'not-interested' when both exist", () => {
    assert.equal(
      makeVacancy({
        activityHistory: [
          { type: "not-interested", date: "2025-01-01" },
          { type: "applied", date: "2025-01-02" },
        ],
      }).deriveStatus(),
      "applied",
    );
  });
});

describe("deriveSources", () => {
  test("empty history returns empty sources", () => {
    assert.deepEqual(makeVacancy().deriveSources(), []);
  });

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
    }).deriveSources();
    assert.deepEqual(result, [{ site: "xing", url: "https://xing.com/job/1" }]);
  });

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
    }).deriveSources();
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      site: "xing",
      url: "https://xing.com/job/1",
    });
  });

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
    }).deriveSources();
    assert.equal(result.length, 2);
  });

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
    }).deriveSources();
    assert.equal(result.length, 2);
    assert.equal(result[0].site, "xing");
    assert.equal(result[1].site, "arbeitsagentur");
  });

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
    }).deriveSources();
    assert.equal(result.length, 1);
    assert.equal(result[0].site, "xing");
  });
});

describe("getMinCommuteMinutes", () => {
  test("returns undefined when no commute data", () => {
    assert.equal(makeVacancy().getMinCommuteMinutes(), undefined);
  });

  test("returns undefined for empty commute record", () => {
    assert.equal(
      makeVacancy({ commute: {} }).getMinCommuteMinutes(),
      undefined,
    );
  });

  test("returns morning minutes for single address", () => {
    const v = makeVacancy({
      commute: {
        Berlin: {
          distance: "10 km",
          durations: { morning: 25, day: 20, evening: 30 },
          fetchedAt: "2026-01-01",
        },
      },
    });
    assert.equal(v.getMinCommuteMinutes(), 25);
  });

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
    });
    assert.equal(v.getMinCommuteMinutes(), 15);
  });
});

describe("getLatestActivityDate", () => {
  test("returns empty string for no activities", () => {
    assert.equal(makeVacancy().getLatestActivityDate(), "");
  });

  test("returns last activity date", () => {
    const v = makeVacancy({
      activityHistory: [
        { type: "found", date: "2026-01-01", site: "s", url: "u" },
        { type: "applied", date: "2026-01-15" },
      ],
    });
    assert.equal(v.getLatestActivityDate(), "2026-01-15");
  });
});

describe("with", () => {
  test("returns new instance with overridden fields", () => {
    const v = makeVacancy({ title: "Original" });
    const v2 = v.with({ title: "Updated" });
    assert.equal(v2.title, "Updated");
    assert.equal(v.title, "Original");
    assert.ok(v2 instanceof Vacancy);
  });

  test("preserves non-overridden fields", () => {
    const v = makeVacancy({ company: "ACME", title: "Dev" });
    const v2 = v.with({ title: "Senior Dev" });
    assert.equal(v2.company, "ACME");
  });
});

describe("constructor validation", () => {
  test("defaults activityHistory to empty array", () => {
    const v = new Vacancy({
      hash: "h",
      title: "t",
      company: "c",
      urls: [],
      addresses: [],
      descriptionChanged: false,
      active: true,
    } as VacancyDTO);
    assert.deepEqual(v.activityHistory, []);
  });

  test("defaults active to true when missing", () => {
    const v = new Vacancy({
      hash: "h",
      title: "t",
      company: "c",
      urls: [],
      addresses: [],
      descriptionChanged: false,
      activityHistory: [],
    } as VacancyDTO);
    assert.equal(v.active, true);
  });

  test("defaults descriptionChanged to false when missing", () => {
    const v = new Vacancy({
      hash: "h",
      title: "t",
      company: "c",
      urls: [],
      addresses: [],
      activityHistory: [],
      active: true,
    } as VacancyDTO);
    assert.equal(v.descriptionChanged, false);
  });
});
