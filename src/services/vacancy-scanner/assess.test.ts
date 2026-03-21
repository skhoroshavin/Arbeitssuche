import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Applicant } from "@/models/applicant/types.js";
import type { SearchPreferences } from "@/models/job-search/types.js";
import type { Vacancy } from "@/models/vacancy/types.js";
import { createStubLlmClient } from "@/plugins/llm/stub/index.js";
import {
  buildAssessPrompt,
  parseAssessResult,
  assessVacancy,
  needsAssessment,
} from "./assess.js";

function sampleApplicant(): Applicant {
  return {
    id: "test-applicant",
    personal: { name: "Max Mustermann", email: "max@example.com" },
    experience: [
      {
        role: "Frontend Developer",
        company: "TechCo",
        startDate: "2020-01",
        endDate: "2024-01",
        highlights: ["Built React apps", "Led team of 3"],
      },
    ],
    education: [
      {
        institution: "TU Berlin",
        course: "Computer Science B.Sc.",
        endDate: "2019",
      },
    ],
    skills: [{ name: "React" }, { name: "TypeScript" }, { name: "Node.js" }],
    languages: [
      { language: "German", level: "C2" },
      { language: "English", level: "C1" },
    ],
    certifications: [],
  };
}

function sampleVacancy(overrides?: Partial<Vacancy>): Vacancy {
  return {
    hash: "abc123",
    title: "Senior React Developer",
    company: "StartupGmbH",
    urls: ["https://example.com/job/1"],
    addresses: ["Berlin"],
    description: "We are looking for a senior React developer...",
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

function samplePreferences(): SearchPreferences {
  return {
    freeText: ["Remote preferred", "No agencies"],
  };
}

// --- needsAssessment ---

describe("needsAssessment", () => {
  test("returns true for vacancy without summary", () => {
    assert.ok(needsAssessment(sampleVacancy()));
  });

  test("returns true for vacancy with descriptionChanged", () => {
    assert.ok(
      needsAssessment(
        sampleVacancy({
          summary: "existing summary",
          matchScore: "good",
          descriptionChanged: true,
        }),
      ),
    );
  });

  test("returns false for vacancy with summary and no description change", () => {
    assert.ok(
      !needsAssessment(
        sampleVacancy({
          summary: "existing summary",
          matchScore: "good",
          descriptionChanged: false,
        }),
      ),
    );
  });
});

// --- buildAssessPrompt ---

describe("buildAssessPrompt", () => {
  test("includes vacancy details in prompt", () => {
    const prompt = buildAssessPrompt(
      sampleVacancy(),
      sampleApplicant(),
      samplePreferences(),
    );
    assert.ok(prompt.includes("Senior React Developer"));
    assert.ok(prompt.includes("StartupGmbH"));
    assert.ok(prompt.includes("Berlin"));
    assert.ok(prompt.includes("We are looking for a senior React developer"));
  });

  test("includes applicant profile in prompt", () => {
    const prompt = buildAssessPrompt(
      sampleVacancy(),
      sampleApplicant(),
      samplePreferences(),
    );
    assert.ok(prompt.includes("Max Mustermann"));
    assert.ok(prompt.includes("Frontend Developer"));
    assert.ok(prompt.includes("React"));
    assert.ok(prompt.includes("TypeScript"));
    assert.ok(prompt.includes("Computer Science B.Sc."));
  });

  test("includes search preferences in prompt", () => {
    const prompt = buildAssessPrompt(
      sampleVacancy(),
      sampleApplicant(),
      samplePreferences(),
    );
    assert.ok(prompt.includes("Remote preferred"));
    assert.ok(prompt.includes("No agencies"));
  });

  test("handles vacancy without description", () => {
    const vacancy = sampleVacancy({ description: undefined });
    const prompt = buildAssessPrompt(
      vacancy,
      sampleApplicant(),
      samplePreferences(),
    );
    assert.ok(prompt.includes("Keine Beschreibung vorhanden."));
  });

  test("omits preferences section when empty", () => {
    const prompt = buildAssessPrompt(sampleVacancy(), sampleApplicant(), {
      freeText: [],
    });
    assert.ok(!prompt.includes("Search Preferences"));
  });
});

// --- parseAssessResult ---

describe("parseAssessResult", () => {
  test("validates valid parsed object", () => {
    const result = parseAssessResult({
      summary: "- Great match\n- React focus",
      matchScore: "good",
    });
    assert.deepEqual(result, {
      summary: "- Great match\n- React focus",
      matchScore: "good",
    });
  });

  test("returns null for null input", () => {
    assert.equal(parseAssessResult(null), null);
  });

  test("returns null for non-object input", () => {
    assert.equal(parseAssessResult("not an object"), null);
  });

  test("returns null for missing summary", () => {
    assert.equal(parseAssessResult({ matchScore: "good" }), null);
  });

  test("returns null for invalid matchScore", () => {
    assert.equal(
      parseAssessResult({ summary: "- Test", matchScore: "amazing" }),
      null,
    );
  });

  test("accepts all valid match scores", () => {
    for (const score of ["very-bad", "bad", "ok", "good", "excellent"]) {
      const result = parseAssessResult({
        summary: "- Test",
        matchScore: score,
      });
      assert.ok(result, `Expected valid result for score "${score}"`);
      assert.equal(result!.matchScore, score);
    }
  });
});

// --- assessVacancy ---

describe("assessVacancy", () => {
  test("returns summary and matchScore from LLM", async () => {
    const llm = createStubLlmClient({
      json: [
        { summary: "- Good React role\n- Remote possible", matchScore: "good" },
      ],
    });
    const result = await assessVacancy(
      sampleVacancy(),
      sampleApplicant(),
      samplePreferences(),
      llm,
    );
    assert.deepEqual(result, {
      summary: "- Good React role\n- Remote possible",
      matchScore: "good",
    });
  });

  test("returns null when LLM returns invalid response", async () => {
    const llm = createStubLlmClient();
    const result = await assessVacancy(
      sampleVacancy(),
      sampleApplicant(),
      samplePreferences(),
      llm,
    );
    assert.equal(result, null);
  });
});
