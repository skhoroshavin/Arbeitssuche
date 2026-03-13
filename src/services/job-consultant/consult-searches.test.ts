import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Applicant } from "@/models/applicant/types.js";
import { createStubLlmClient } from "@/plugins/llm/stub/index.js";
import {
  buildConsultSearchesPrompt,
  parseConsultSearchesResult,
  consultSearches,
} from "./consult-searches.js";

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

describe("buildConsultSearchesPrompt", () => {
  test("includes applicant profile in prompt", () => {
    const prompt = buildConsultSearchesPrompt(sampleApplicant());
    assert.ok(prompt.includes("Max Mustermann"));
    assert.ok(prompt.includes("Frontend Developer"));
    assert.ok(prompt.includes("React"));
    assert.ok(prompt.includes("TypeScript"));
    assert.ok(prompt.includes("Computer Science B.Sc."));
  });

  test("includes JSON format instructions", () => {
    const prompt = buildConsultSearchesPrompt(sampleApplicant());
    assert.ok(prompt.includes("searchTerm"));
    assert.ok(prompt.includes("searchMode"));
    assert.ok(prompt.includes("reason"));
  });
});

describe("parseConsultSearchesResult", () => {
  test("validates valid array", () => {
    const result = parseConsultSearchesResult([
      {
        searchTerm: "React Entwickler",
        searchMode: "employment",
        reason: "Passt gut zum Profil.",
      },
      {
        searchTerm: "Frontend Lead",
        searchMode: "employment",
        reason: "Erfahrung in Teamführung.",
      },
    ]);
    assert.equal(result!.length, 2);
    assert.equal(result![0].searchTerm, "React Entwickler");
    assert.equal(result![0].searchMode, "employment");
    assert.equal(result![1].searchTerm, "Frontend Lead");
  });

  test("returns null for null input", () => {
    assert.equal(parseConsultSearchesResult(null), null);
  });

  test("returns null for empty array", () => {
    assert.equal(parseConsultSearchesResult([]), null);
  });

  test("returns null for non-array input", () => {
    assert.equal(parseConsultSearchesResult({ searchTerm: "test" }), null);
  });

  test("skips items with invalid searchMode", () => {
    const result = parseConsultSearchesResult([
      {
        searchTerm: "Valid",
        searchMode: "employment",
        reason: "Ok.",
      },
      {
        searchTerm: "Invalid",
        searchMode: "freelance",
        reason: "Nope.",
      },
    ]);
    assert.equal(result!.length, 1);
    assert.equal(result![0].searchTerm, "Valid");
  });

  test("skips items with missing fields", () => {
    const result = parseConsultSearchesResult([
      { searchTerm: "Missing reason", searchMode: "employment" },
      {
        searchTerm: "Complete",
        searchMode: "entry-level",
        reason: "Good fit.",
      },
    ]);
    assert.equal(result!.length, 1);
    assert.equal(result![0].searchTerm, "Complete");
  });

  test("accepts all valid search modes", () => {
    for (const mode of ["employment", "entry-level", "apprenticeship"]) {
      const result = parseConsultSearchesResult([
        { searchTerm: "Test", searchMode: mode, reason: "Reason." },
      ]);
      assert.ok(result, `Expected valid result for mode "${mode}"`);
      assert.equal(result![0].searchMode, mode);
    }
  });
});

describe("consultSearches", () => {
  test("returns suggestions from LLM", async () => {
    const llm = createStubLlmClient({
      json: [
        [
          {
            searchTerm: "React Entwickler",
            searchMode: "employment",
            reason: "Starke React-Erfahrung.",
          },
        ],
      ],
    });
    const result = await consultSearches(sampleApplicant(), llm);
    assert.equal(result.length, 1);
    assert.equal(result[0].searchTerm, "React Entwickler");
  });

  test("throws when LLM returns unparseable response", async () => {
    const llm = createStubLlmClient();
    await assert.rejects(() => consultSearches(sampleApplicant(), llm), {
      message: "Failed to parse consultation response",
    });
  });
});
