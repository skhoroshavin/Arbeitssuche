import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildPersonalizedCoverLetterPrompt,
  generatePersonalizedCoverLetter,
} from "./generate-personalized.js";
import type { Applicant } from "@/models/applicant/types.js";
import type { JobSearch } from "@/models/job-search/types.js";
import type { Vacancy } from "@/models/vacancy/types.js";
import { createStubLlmClient } from "@/plugins/llm/stub/index.js";

function makeApplicant(overrides?: Partial<Applicant>): Applicant {
  return {
    id: "test-applicant",
    personal: { name: "Max Mustermann", email: "max@example.com" },
    experience: [
      {
        role: "Developer",
        company: "Acme",
        startDate: "2020-01",
        endDate: "2023-12",
      },
    ],
    education: [
      { course: "Informatik", institution: "TU Berlin", endDate: "2020" },
    ],
    skills: [{ name: "TypeScript" }, { name: "React" }],
    languages: [{ language: "Deutsch", level: "C1" }],
    certifications: [],
    ...overrides,
  };
}

function makeVacancy(overrides?: Partial<Vacancy>): Vacancy {
  return {
    hash: "abc123",
    title: "Frontend Developer",
    company: "TechCorp GmbH",
    urls: ["https://example.com/job/1"],
    addresses: ["Berlin"],
    description: "We are looking for a React developer with TypeScript skills.",
    descriptionChanged: false,
    activityHistory: [],
    active: true,
    contact: { name: "Frau Schmidt", email: "schmidt@techcorp.de" },
    ...overrides,
  };
}

function makeJobSearch(overrides?: Partial<JobSearch>): JobSearch {
  return {
    id: "test-search",
    applicantId: "test-applicant",
    params: {
      searchTerm: "Frontend Developer",
      radiusKm: 50,
      searchMode: "employment",
      sources: [],
      maxResults: 100,
    },
    preferences: {
      maxDistanceKm: 30,
      maxCommuteMinutes: 45,
      freeText: ["Remote preferred"],
    },
    ...overrides,
  };
}

describe("buildPersonalizedCoverLetterPrompt", () => {
  test("includes vacancy title and company", () => {
    const prompt = buildPersonalizedCoverLetterPrompt(
      makeApplicant(),
      makeVacancy(),
      "Template text here",
      makeJobSearch(),
    );
    assert.ok(prompt.includes("Frontend Developer"));
    assert.ok(prompt.includes("TechCorp GmbH"));
  });

  test("includes vacancy description", () => {
    const prompt = buildPersonalizedCoverLetterPrompt(
      makeApplicant(),
      makeVacancy(),
      undefined,
      makeJobSearch(),
    );
    assert.ok(prompt.includes("React developer with TypeScript skills"));
  });

  test("includes vacancy contact info", () => {
    const prompt = buildPersonalizedCoverLetterPrompt(
      makeApplicant(),
      makeVacancy(),
      undefined,
      makeJobSearch(),
    );
    assert.ok(prompt.includes("Frau Schmidt"));
    assert.ok(prompt.includes("schmidt@techcorp.de"));
  });

  test("includes applicant info", () => {
    const prompt = buildPersonalizedCoverLetterPrompt(
      makeApplicant(),
      makeVacancy(),
      undefined,
      makeJobSearch(),
    );
    assert.ok(prompt.includes("Max Mustermann"));
    assert.ok(prompt.includes("Developer bei Acme"));
    assert.ok(prompt.includes("TypeScript"));
    assert.ok(prompt.includes("Deutsch (C1)"));
  });

  test("includes template cover letter when provided", () => {
    const template = "Sehr geehrte Damen und Herren, ich bewerbe mich...";
    const prompt = buildPersonalizedCoverLetterPrompt(
      makeApplicant(),
      makeVacancy(),
      template,
      makeJobSearch(),
    );
    assert.ok(prompt.includes(template));
    assert.ok(prompt.includes("Example Cover Letter"));
  });

  test("works without template cover letter", () => {
    const prompt = buildPersonalizedCoverLetterPrompt(
      makeApplicant(),
      makeVacancy(),
      undefined,
      makeJobSearch(),
    );
    assert.ok(!prompt.includes("Example Cover Letter"));
    assert.ok(prompt.includes("Frontend Developer"));
  });

  test("works with minimal vacancy (no contact, no description)", () => {
    const vacancy = makeVacancy({
      contact: undefined,
      description: undefined,
    });
    const prompt = buildPersonalizedCoverLetterPrompt(
      makeApplicant(),
      vacancy,
      undefined,
      makeJobSearch(),
    );
    assert.ok(prompt.includes("Frontend Developer"));
    assert.ok(prompt.includes("TechCorp GmbH"));
    assert.ok(!prompt.includes("Contact:"));
  });

  test("includes job search preferences", () => {
    const prompt = buildPersonalizedCoverLetterPrompt(
      makeApplicant(),
      makeVacancy(),
      undefined,
      makeJobSearch(),
    );
    assert.ok(prompt.includes("Remote preferred"));
  });
});

describe("generatePersonalizedCoverLetter", () => {
  test("calls LLM and returns response", async () => {
    const llmClient = createStubLlmClient({
      text: ["Sehr geehrte Frau Schmidt, ..."],
    });

    const result = await generatePersonalizedCoverLetter(
      makeApplicant(),
      makeVacancy(),
      "Template text",
      makeJobSearch(),
      llmClient,
    );
    assert.equal(result, "Sehr geehrte Frau Schmidt, ...");
  });
});
