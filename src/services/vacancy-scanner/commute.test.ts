import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Vacancy } from "@/models/vacancy/types.js";
import type { CommuteInfo } from "@/models/vacancy/types.js";
import { createStubCommuteClient } from "@/plugins/commute/stub/index.js";
import { computeCommutes } from "./commute.js";

const STUB_COMMUTE: CommuteInfo = {
  distance: "15.2 km",
  durations: { morning: "32 mins", day: "28 mins", evening: "35 mins" },
  fetchedAt: "2026-01-15T10:00:00Z",
};

function makeVacancy(overrides?: Partial<Vacancy>): Vacancy {
  return {
    hash: "abc123",
    title: "Software Engineer",
    company: "ACME Corp",
    urls: ["https://example.com/job/1"],
    addresses: ["Berlin"],
    descriptionChanged: false,
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

describe("computeCommutes", () => {
  test("computes commute for active vacancy with addresses", async () => {
    const client = createStubCommuteClient(STUB_COMMUTE);
    const vacancy = makeVacancy({ addresses: ["Berlin", "Munich"] });

    const result = await computeCommutes({
      vacancies: [vacancy],
      origin: "My Street 1, 12345 MyCity",
      commuteClient: client,
    });

    assert.equal(result.computedCount, 1);
    assert.equal(result.skippedCount, 0);
    assert.equal(result.errorCount, 0);
    assert.deepEqual(result.vacancies[0].commute?.["Berlin"], STUB_COMMUTE);
    assert.deepEqual(result.vacancies[0].commute?.["Munich"], STUB_COMMUTE);
  });

  test("skips inactive vacancies", async () => {
    const client = createStubCommuteClient(STUB_COMMUTE);
    const vacancy = makeVacancy({ active: false });

    const result = await computeCommutes({
      vacancies: [vacancy],
      origin: "My Street 1, 12345 MyCity",
      commuteClient: client,
    });

    assert.equal(result.computedCount, 0);
    assert.equal(result.skippedCount, 1);
    assert.equal(result.vacancies[0].commute, undefined);
  });

  test("skips vacancies with no addresses", async () => {
    const client = createStubCommuteClient(STUB_COMMUTE);
    const vacancy = makeVacancy({ addresses: [] });

    const result = await computeCommutes({
      vacancies: [vacancy],
      origin: "My Street 1, 12345 MyCity",
      commuteClient: client,
    });

    assert.equal(result.computedCount, 0);
    assert.equal(result.skippedCount, 1);
  });

  test("skips addresses that already have commute data", async () => {
    const client = createStubCommuteClient(STUB_COMMUTE);
    const vacancy = makeVacancy({
      addresses: ["Berlin", "Munich"],
      commute: { Berlin: STUB_COMMUTE },
    });

    const result = await computeCommutes({
      vacancies: [vacancy],
      origin: "My Street 1, 12345 MyCity",
      commuteClient: client,
    });

    assert.equal(result.computedCount, 1);
    assert.deepEqual(result.vacancies[0].commute?.["Berlin"], STUB_COMMUTE);
    assert.deepEqual(result.vacancies[0].commute?.["Munich"], STUB_COMMUTE);
  });

  test("skips vacancy entirely when all addresses have commute data", async () => {
    const client = createStubCommuteClient(STUB_COMMUTE);
    const vacancy = makeVacancy({
      addresses: ["Berlin"],
      commute: { Berlin: STUB_COMMUTE },
    });

    const result = await computeCommutes({
      vacancies: [vacancy],
      origin: "My Street 1, 12345 MyCity",
      commuteClient: client,
    });

    assert.equal(result.computedCount, 0);
    assert.equal(result.skippedCount, 1);
  });

  test("handles commute client errors gracefully", async () => {
    const client = createStubCommuteClient(new Error("API error"));

    const vacancy = makeVacancy();

    const result = await computeCommutes({
      vacancies: [vacancy],
      origin: "My Street 1, 12345 MyCity",
      commuteClient: client,
    });

    assert.equal(result.computedCount, 0);
    assert.equal(result.errorCount, 1);
    assert.equal(result.vacancies[0].commute, undefined);
  });

  test("respects abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const client = createStubCommuteClient(STUB_COMMUTE);
    const vacancy = makeVacancy();

    const result = await computeCommutes({
      vacancies: [vacancy],
      origin: "My Street 1, 12345 MyCity",
      commuteClient: client,
      signal: controller.signal,
    });

    assert.equal(result.computedCount, 0);
  });

  test("reports progress via callback", async () => {
    const client = createStubCommuteClient(STUB_COMMUTE);
    const v1 = makeVacancy({ hash: "h1", title: "Job A" });
    const v2 = makeVacancy({
      hash: "h2",
      title: "Job B",
      addresses: ["Munich"],
    });

    const progress: { message: string; current: number; total: number }[] = [];

    await computeCommutes({
      vacancies: [v1, v2],
      origin: "My Street 1, 12345 MyCity",
      commuteClient: client,
      onProgress: (message, current, total) => {
        progress.push({ message, current, total });
      },
    });

    assert.equal(progress.length, 2);
    assert.equal(progress[0].current, 1);
    assert.equal(progress[0].total, 2);
    assert.equal(progress[1].current, 2);
    assert.equal(progress[1].total, 2);
  });
});
