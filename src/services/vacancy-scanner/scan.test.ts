import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { VacancyDetails } from "@/plugins/job-site/types.js";
import type { Vacancy } from "@/models/vacancy/types.js";
import type { Applicant } from "@/models/applicant/types.js";
import { createStubJobSite } from "@/plugins/job-site/stub/index.js";
import { createStubLlmClient } from "@/plugins/llm/stub/index.js";
import { createStubCommuteClient } from "@/plugins/commute/stub/index.js";
import { vacancyHash } from "@/services/vacancy-scanner/vacancy-hash.js";
import { scanVacancies } from "./scan.js";

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

function sampleApplicant(): Applicant {
  return {
    id: "a1",
    personal: { name: "Max Mustermann" },
    experience: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
  };
}

const defaultSearchParams = { location: "Berlin", query: "", radiusKm: 30 };
const defaultPreferences = { freeText: [] };

describe("scanVacancies", () => {
  test("extracts and processes vacancies from single site, single page", async () => {
    const d1 = makeDetails({ url: "https://a.com/1", title: "Job 1" });
    const d2 = makeDetails({ url: "https://a.com/2", title: "Job 2" });
    const pages = new Map([
      [undefined, { urls: ["https://a.com/1", "https://a.com/2"] }],
    ]);
    const vacancies = new Map([
      ["https://a.com/1", d1],
      ["https://a.com/2", d2],
    ]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
    });
    const existingByHash = new Map<string, Vacancy>();

    const result = await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
    });

    assert.equal(result.newCount, 2);
    assert.equal(result.updatedCount, 0);
    assert.equal(result.seenHashes.size, 2);
    assert.equal(existingByHash.size, 2);
  });

  test("processes page 1 vacancies before fetching page 2", async () => {
    const pages = new Map<
      string | undefined,
      { urls: string[]; nextPageId?: string }
    >([
      [undefined, { urls: ["https://a.com/1"], nextPageId: "2" }],
      ["2", { urls: ["https://a.com/2"] }],
    ]);
    const vacancyMap = new Map([
      [
        "https://a.com/1",
        makeDetails({ url: "https://a.com/1", title: "Job" }),
      ],
      [
        "https://a.com/2",
        makeDetails({ url: "https://a.com/2", title: "Job" }),
      ],
    ]);
    const site = createStubJobSite({ name: "test", pages, vacancyMap });

    const existingByHash = new Map<string, Vacancy>();
    await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
    });

    // details for page 1 URL should come before list for page 2
    const detailsIdx = site.callLog.indexOf("details:https://a.com/1");
    const listPage2Idx = site.callLog.indexOf("list:2");
    assert.ok(
      detailsIdx < listPage2Idx,
      `Expected details (${detailsIdx}) before page 2 list (${listPage2Idx})`,
    );
  });

  test("enriches new vacancy with LLM assessment", async () => {
    const d = makeDetails({
      url: "https://a.com/1",
      descriptionHtml: "<p>React developer needed</p>",
    });
    const pages = new Map([[undefined, { urls: ["https://a.com/1"] }]]);
    const vacancies = new Map([["https://a.com/1", d]]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
    });
    const existingByHash = new Map<string, Vacancy>();

    const llmClient = createStubLlmClient({
      json: [{ summary: "- React role\n- Frontend", matchScore: "good" }],
    });

    const result = await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
      llmClient,
      applicant: sampleApplicant(),
      preferences: defaultPreferences,
    });

    assert.equal(result.enrichedCount, 1);
    const vacancy = [...existingByHash.values()][0];
    assert.equal(vacancy.summary, "- React role\n- Frontend");
    assert.equal(vacancy.matchScore, "good");
  });

  test("re-enriches vacancy when description changed", async () => {
    const hash = vacancyHash("Software Engineer", "ACME Corp", "Berlin");
    const existing: Vacancy = {
      hash,
      title: "Software Engineer",
      company: "ACME Corp",
      urls: ["https://a.com/1"],
      addresses: ["Berlin"],
      description: "Old description",
      descriptionChanged: false,
      summary: "- Old summary",
      matchScore: "ok",
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "test",
          url: "https://a.com/1",
        },
      ],
      active: true,
    };

    const d = makeDetails({
      url: "https://a.com/1",
      descriptionHtml: "<p>New description</p>",
    });
    const pages = new Map([[undefined, { urls: ["https://a.com/1"] }]]);
    const vacancies = new Map([["https://a.com/1", d]]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
    });
    const existingByHash = new Map<string, Vacancy>([[hash, existing]]);

    const llmClient = createStubLlmClient({
      json: [{ summary: "- New summary", matchScore: "excellent" }],
    });

    const result = await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-02-01",
      existingByHash,
      llmClient,
      applicant: sampleApplicant(),
      preferences: defaultPreferences,
    });

    assert.equal(result.enrichedCount, 1);
    assert.equal(result.updatedCount, 1);
    const vacancy = existingByHash.get(hash)!;
    assert.equal(vacancy.summary, "- New summary");
    assert.equal(vacancy.matchScore, "excellent");
    assert.equal(vacancy.descriptionChanged, false);
  });

  test("extracts contact info for vacancy needing it", async () => {
    const d = makeDetails({
      url: "https://a.com/1",
      descriptionHtml:
        "<p>Contact: hr@company.com, Max Müller, +49 123 456</p>",
    });
    // No contact or address from crawler
    delete d.contact;
    delete d.address;

    const pages = new Map([[undefined, { urls: ["https://a.com/1"] }]]);
    const vacancies = new Map([["https://a.com/1", d]]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
    });
    const existingByHash = new Map<string, Vacancy>();

    const llmClient = createStubLlmClient({
      json: [
        { summary: "- A job", matchScore: "ok" },
        {
          addresses: ["Hauptstraße 1, 10115 Berlin"],
          contact: {
            name: "Max Müller",
            email: "hr@company.com",
            phone: "+49 123 456",
          },
        },
      ],
    });

    await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
      llmClient,
      applicant: sampleApplicant(),
      preferences: defaultPreferences,
    });

    const vacancy = [...existingByHash.values()][0];
    assert.equal(vacancy.contact?.name, "Max Müller");
    assert.equal(vacancy.contact?.email, "hr@company.com");
  });

  test("scan completes without LLM — no enrichment", async () => {
    const d = makeDetails({ url: "https://a.com/1" });
    const pages = new Map([[undefined, { urls: ["https://a.com/1"] }]]);
    const vacancies = new Map([["https://a.com/1", d]]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
    });
    const existingByHash = new Map<string, Vacancy>();

    const result = await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
    });

    assert.equal(result.newCount, 1);
    assert.equal(result.enrichedCount, 0);
    const vacancy = [...existingByHash.values()][0];
    assert.equal(vacancy.summary, undefined);
  });

  test("computes commute when client and origin provided", async () => {
    const d = makeDetails({ url: "https://a.com/1", address: "Berlin" });
    const pages = new Map([[undefined, { urls: ["https://a.com/1"] }]]);
    const vacancies = new Map([["https://a.com/1", d]]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
    });
    const existingByHash = new Map<string, Vacancy>();

    const commuteClient = createStubCommuteClient();

    await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
      commuteClient,
      commuteOrigin: "München",
    });

    const vacancy = [...existingByHash.values()][0];
    assert.ok(vacancy.commute);
    assert.ok(vacancy.commute["Berlin"]);
    assert.equal(vacancy.commute["Berlin"].distance, "10.0 km");
  });

  test("respects abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const pages = new Map([[undefined, { urls: ["https://a.com/1"] }]]);
    const vacancies = new Map([
      ["https://a.com/1", makeDetails({ url: "https://a.com/1" })],
    ]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
    });
    const existingByHash = new Map<string, Vacancy>();

    const result = await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
      signal: controller.signal,
    });

    assert.equal(result.newCount, 0);
    assert.equal(existingByHash.size, 0);
  });

  test("respects limit per site", async () => {
    const pages = new Map([
      [
        undefined,
        {
          urls: ["https://a.com/1", "https://a.com/2", "https://a.com/3"],
        },
      ],
    ]);
    const vacancies = new Map([
      ["https://a.com/1", makeDetails({ url: "https://a.com/1", title: "J1" })],
      ["https://a.com/2", makeDetails({ url: "https://a.com/2", title: "J2" })],
      ["https://a.com/3", makeDetails({ url: "https://a.com/3", title: "J3" })],
    ]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
    });
    const existingByHash = new Map<string, Vacancy>();

    const result = await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
      limit: 2,
    });

    assert.ok(result.newCount <= 2);
  });

  test("deduplicates URLs across sites", async () => {
    const pages = new Map([[undefined, { urls: ["https://a.com/1"] }]]);
    const vacancies = new Map([
      ["https://a.com/1", makeDetails({ url: "https://a.com/1" })],
    ]);
    const site1 = createStubJobSite({
      name: "site1",
      pages,
      vacancyMap: vacancies,
    });
    const site2 = createStubJobSite({
      name: "site2",
      pages,
      vacancyMap: vacancies,
    });
    const existingByHash = new Map<string, Vacancy>();

    const result = await scanVacancies({
      sites: [site1, site2],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
    });

    // Same URL deduplicated — only extracted once
    assert.equal(result.newCount, 1);
  });

  test("calls onVacancyProcessed for each vacancy", async () => {
    const d1 = makeDetails({ url: "https://a.com/1", title: "J1" });
    const d2 = makeDetails({
      url: "https://a.com/2",
      title: "J2",
      company: "Other",
    });
    const pages = new Map([
      [undefined, { urls: ["https://a.com/1", "https://a.com/2"] }],
    ]);
    const vacancies = new Map([
      ["https://a.com/1", d1],
      ["https://a.com/2", d2],
    ]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
    });
    const existingByHash = new Map<string, Vacancy>();
    const processed: { hash: string; isNew: boolean }[] = [];

    await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
      onVacancyProcessed: (_vacancy, hash, isNew) => {
        processed.push({ hash, isNew });
      },
    });

    assert.equal(processed.length, 2);
    assert.ok(processed.every((p) => p.isNew));
  });

  test("extraction error on one vacancy does not stop others", async () => {
    const d2 = makeDetails({ url: "https://a.com/2", title: "J2" });

    const pages = new Map([
      [undefined, { urls: ["https://a.com/1", "https://a.com/2"] }],
    ]);
    const vacancyMap = new Map([["https://a.com/2", d2]]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap,
      errors: new Map([["https://a.com/1", new Error("Network error")]]),
    });

    const existingByHash = new Map<string, Vacancy>();
    const result = await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
    });

    assert.equal(result.newCount, 1);
    assert.equal(existingByHash.size, 1);
  });

  test("skips modes not supported by site", async () => {
    const pages = new Map([[undefined, { urls: ["https://a.com/1"] }]]);
    const vacancies = new Map([
      ["https://a.com/1", makeDetails({ url: "https://a.com/1" })],
    ]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
      supportedModes: ["employment"],
    });
    const existingByHash = new Map<string, Vacancy>();

    const result = await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "apprenticeship",
      crawlDate: "2026-01-15",
      existingByHash,
    });

    assert.equal(result.newCount, 0);
  });

  test("entry-level falls back to employment on unsupported site", async () => {
    const pages = new Map([[undefined, { urls: ["https://a.com/1"] }]]);
    const vacancies = new Map([
      ["https://a.com/1", makeDetails({ url: "https://a.com/1" })],
    ]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
      supportedModes: ["employment"],
    });
    const existingByHash = new Map<string, Vacancy>();

    const result = await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "entry-level",
      crawlDate: "2026-01-15",
      existingByHash,
    });

    assert.equal(result.newCount, 1);
  });

  test("reports progress events", async () => {
    const pages = new Map([[undefined, { urls: ["https://a.com/1"] }]]);
    const vacancies = new Map([
      ["https://a.com/1", makeDetails({ url: "https://a.com/1" })],
    ]);
    const site = createStubJobSite({
      name: "test",
      pages,
      vacancyMap: vacancies,
    });
    const existingByHash = new Map<string, Vacancy>();
    const events: { phase?: string }[] = [];

    await scanVacancies({
      sites: [site],
      searchParams: defaultSearchParams,
      mode: "employment",
      crawlDate: "2026-01-15",
      existingByHash,
      onProgress: (e) => events.push(e),
    });

    const phases = events.map((e) => e.phase);
    assert.ok(phases.includes("search"));
    assert.ok(phases.includes("scan"));
  });
});
