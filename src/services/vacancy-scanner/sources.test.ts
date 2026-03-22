import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { deriveSources } from "./index.js";
import type { Vacancy } from "@/models/vacancy/types.js";

function makeVacancy(overrides?: Partial<Vacancy>): Vacancy {
  return {
    hash: "abc123",
    title: "Dev",
    company: "Corp",
    urls: [],
    addresses: [],
    descriptionChanged: false,
    activityHistory: [],
    active: true,
    ...overrides,
  };
}

describe("deriveSources", () => {
  test("empty history returns empty sources", () => {
    const result = deriveSources(makeVacancy());
    assert.deepEqual(result, []);
  });

  test("single found activity returns one source", () => {
    const result = deriveSources(
      makeVacancy({
        activityHistory: [
          {
            type: "found",
            date: "2026-01-01",
            site: "xing",
            url: "https://xing.com/job/1",
          },
        ],
      }),
    );
    assert.deepEqual(result, [{ site: "xing", url: "https://xing.com/job/1" }]);
  });

  test("repeated same site+url is deduplicated", () => {
    const result = deriveSources(
      makeVacancy({
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
      }),
    );
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      site: "xing",
      url: "https://xing.com/job/1",
    });
  });

  test("same site with different URLs produces multiple sources", () => {
    const result = deriveSources(
      makeVacancy({
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
      }),
    );
    assert.equal(result.length, 2);
  });

  test("multiple sites return one entry per unique pair", () => {
    const result = deriveSources(
      makeVacancy({
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
      }),
    );
    assert.equal(result.length, 2);
    assert.equal(result[0].site, "xing");
    assert.equal(result[1].site, "arbeitsagentur");
  });

  test("non-found activities are ignored", () => {
    const result = deriveSources(
      makeVacancy({
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
      }),
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].site, "xing");
  });
});
