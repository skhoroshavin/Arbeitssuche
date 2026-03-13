import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { VacancyDetails } from "@/plugins/job-site/types.js";
import type { Vacancy } from "@/models/vacancy/types.js";
import { vacancyHash } from "@/services/vacancy-scanner/vacancy-hash.js";
import { processOneCrawlResult, markUnseenAsGone } from "./unify.js";

function makeDetails(overrides?: Partial<VacancyDetails>): VacancyDetails {
  return {
    url: "https://example.com/job/1",
    title: "Software Engineer",
    company: "ACME Corp",
    address: "Berlin",
    descriptionHtml: "<p>Build stuff</p>",
    ...overrides,
  };
}

function makeVacancy(overrides?: Partial<Vacancy>): Vacancy {
  return {
    hash: vacancyHash("Software Engineer", "ACME Corp", "Berlin"),
    title: "Software Engineer",
    company: "ACME Corp",
    urls: ["https://example.com/job/1"],
    addresses: ["Berlin"],
    descriptionChanged: false,
    description: "Build stuff",
    activityHistory: [
      {
        type: "found",
        date: "2026-01-01",
        site: "indeed",
        url: "https://example.com/job/1",
      },
    ],
    active: true,
    ...overrides,
  };
}

describe("processOneCrawlResult", () => {
  test("creates new vacancy with description + contact in FoundActivity", () => {
    const d = makeDetails({
      descriptionHtml: "<p>Build React apps</p>",
      contact: { name: "Max", email: "max@co.de" },
    });
    const existingByHash = new Map<string, Vacancy>();

    const result = processOneCrawlResult(
      d,
      "indeed",
      existingByHash,
      "2026-02-01",
    );

    assert.equal(result.isNew, true);
    assert.equal(result.vacancy.title, "Software Engineer");
    assert.ok(result.vacancy.description!.includes("Build React apps"));
    assert.equal(result.vacancy.contact?.name, "Max");
    assert.equal(result.vacancy.contact?.email, "max@co.de");
    assert.equal(result.vacancy.activityHistory.length, 1);

    const activity = result.vacancy.activityHistory[0];
    assert.equal(activity.type, "found");
    if (activity.type === "found") {
      assert.ok(activity.description!.includes("Build React apps"));
      assert.equal(activity.contact?.name, "Max");
      assert.equal(activity.contact?.email, "max@co.de");
    }
  });

  test("updates existing vacancy, merges URLs", () => {
    const existing = makeVacancy();
    const existingByHash = new Map<string, Vacancy>();
    existingByHash.set(existing.hash, existing);

    const d = makeDetails({
      url: "https://stepstone.de/job/1",
    });

    const result = processOneCrawlResult(
      d,
      "stepstone",
      existingByHash,
      "2026-02-01",
    );

    assert.equal(result.isNew, false);
    assert.equal(result.vacancy.urls.length, 2);
    assert.ok(result.vacancy.urls.includes("https://example.com/job/1"));
    assert.ok(result.vacancy.urls.includes("https://stepstone.de/job/1"));
    assert.equal(result.vacancy.activityHistory.length, 2);
    assert.equal(result.vacancy.active, true);
  });

  test("detects description change", () => {
    const existing = makeVacancy({ description: "Old description" });
    const existingByHash = new Map<string, Vacancy>();
    existingByHash.set(existing.hash, existing);

    const d = makeDetails({
      descriptionHtml: "<p>New description</p>",
    });

    const result = processOneCrawlResult(
      d,
      "indeed",
      existingByHash,
      "2026-02-01",
    );

    assert.equal(result.descriptionChanged, true);
    assert.equal(result.vacancy.descriptionChanged, true);
    assert.ok(result.vacancy.description!.includes("New description"));
  });
});

describe("markUnseenAsGone", () => {
  test("marks active vacancies as gone", () => {
    const v1 = makeVacancy();
    const v2 = makeVacancy({
      hash: vacancyHash("Other Job", "Other Corp", "Munich"),
      title: "Other Job",
    });
    const seenHashes = new Set([v1.hash]);

    const result = markUnseenAsGone([v1, v2], seenHashes, "2026-02-01");

    assert.equal(result.goneCount, 1);
    assert.equal(result.vacancies.length, 2);

    const gone = result.vacancies.find((v) => v.hash === v2.hash)!;
    assert.equal(gone.active, false);
    const lastActivity = gone.activityHistory[gone.activityHistory.length - 1];
    assert.equal(lastActivity.type, "not-found");

    const seen = result.vacancies.find((v) => v.hash === v1.hash)!;
    assert.equal(seen.active, true);
  });

  test("skips already-inactive vacancies", () => {
    const inactive = makeVacancy({
      active: false,
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "indeed",
          url: "https://example.com/job/1",
        },
        { type: "not-found", date: "2026-01-15", site: "all" },
      ],
    });
    const seenHashes = new Set<string>();

    const result = markUnseenAsGone([inactive], seenHashes, "2026-02-01");

    assert.equal(result.goneCount, 0);
    assert.equal(result.vacancies[0].active, false);
    assert.equal(result.vacancies[0].activityHistory.length, 2);
  });
});
