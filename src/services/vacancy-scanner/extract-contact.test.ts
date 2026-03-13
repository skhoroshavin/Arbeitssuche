import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Vacancy } from "@/models/vacancy/types.js";
import { createStubLlmClient } from "@/plugins/llm/stub/index.js";
import {
  needsContactExtraction,
  buildContactExtractionPrompt,
  parseContactExtractionResult,
  extractContactInfo,
  mergeContactInfo,
} from "./extract-contact.js";

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

// --- needsContactExtraction ---

describe("needsContactExtraction", () => {
  test("returns false when no description", () => {
    assert.equal(
      needsContactExtraction(sampleVacancy({ description: undefined })),
      false,
    );
  });

  test("returns true when addresses are empty", () => {
    assert.equal(
      needsContactExtraction(sampleVacancy({ addresses: [] })),
      true,
    );
  });

  test("returns true when contact is missing", () => {
    assert.equal(
      needsContactExtraction(sampleVacancy({ contact: undefined })),
      true,
    );
  });

  test("returns true when contact has no name", () => {
    assert.equal(
      needsContactExtraction(
        sampleVacancy({ contact: { email: "a@b.com", phone: "+49123" } }),
      ),
      true,
    );
  });

  test("returns true when contact has no email", () => {
    assert.equal(
      needsContactExtraction(
        sampleVacancy({ contact: { name: "Max", phone: "+49123" } }),
      ),
      true,
    );
  });

  test("returns true when contact has no phone", () => {
    assert.equal(
      needsContactExtraction(
        sampleVacancy({ contact: { name: "Max", email: "a@b.com" } }),
      ),
      true,
    );
  });

  test("returns false when addresses and contact are complete", () => {
    assert.equal(
      needsContactExtraction(
        sampleVacancy({
          addresses: ["Musterstraße 1, 10115 Berlin"],
          contact: {
            name: "Max Mustermann",
            email: "max@example.com",
            phone: "+49 30 123456",
          },
        }),
      ),
      false,
    );
  });
});

// --- buildContactExtractionPrompt ---

describe("buildContactExtractionPrompt", () => {
  test("includes vacancy title and company", () => {
    const prompt = buildContactExtractionPrompt(sampleVacancy());
    assert.ok(prompt.includes("Senior React Developer"));
    assert.ok(prompt.includes("StartupGmbH"));
  });

  test("includes description", () => {
    const prompt = buildContactExtractionPrompt(sampleVacancy());
    assert.ok(prompt.includes("We are looking for a senior React developer"));
  });

  test("includes existing addresses", () => {
    const prompt = buildContactExtractionPrompt(
      sampleVacancy({ addresses: ["Berlin", "München"] }),
    );
    assert.ok(prompt.includes("Berlin, München"));
  });

  test("includes existing contact data", () => {
    const prompt = buildContactExtractionPrompt(
      sampleVacancy({
        contact: { name: "Hr. Schmidt", email: "schmidt@co.de" },
      }),
    );
    assert.ok(prompt.includes("Hr. Schmidt"));
    assert.ok(prompt.includes("schmidt@co.de"));
  });

  test("shows 'Keine vorhanden' when no addresses", () => {
    const prompt = buildContactExtractionPrompt(
      sampleVacancy({ addresses: [] }),
    );
    assert.ok(prompt.includes("Adressen: Keine vorhanden"));
  });

  test("shows 'Keine vorhanden' when no contact", () => {
    const prompt = buildContactExtractionPrompt(
      sampleVacancy({ contact: undefined }),
    );
    assert.ok(prompt.includes("Kontakt: Keine vorhanden"));
  });
});

// --- parseContactExtractionResult ---

describe("parseContactExtractionResult", () => {
  test("validates parsed object with addresses and contact", () => {
    const result = parseContactExtractionResult({
      addresses: ["Musterstr. 1, 10115 Berlin"],
      contact: { name: "Max", email: "max@co.de", phone: "+49 30 123" },
    });
    assert.deepEqual(result, {
      addresses: ["Musterstr. 1, 10115 Berlin"],
      contact: { name: "Max", email: "max@co.de", phone: "+49 30 123" },
    });
  });

  test("returns null for null input", () => {
    assert.equal(parseContactExtractionResult(null), null);
  });

  test("returns null for non-object input", () => {
    assert.equal(parseContactExtractionResult("not an object"), null);
  });

  test("returns null when both addresses and contact are empty", () => {
    assert.equal(
      parseContactExtractionResult({ addresses: [], contact: null }),
      null,
    );
  });

  test("handles partial contact (only name)", () => {
    const result = parseContactExtractionResult({
      addresses: [],
      contact: { name: "Max" },
    });
    assert.deepEqual(result, {
      addresses: [],
      contact: { name: "Max" },
    });
  });

  test("handles addresses-only result", () => {
    const result = parseContactExtractionResult({
      addresses: ["Berlin", "München"],
      contact: null,
    });
    assert.deepEqual(result, {
      addresses: ["Berlin", "München"],
      contact: null,
    });
  });

  test("trims whitespace in addresses and contact fields", () => {
    const result = parseContactExtractionResult({
      addresses: ["  Berlin  "],
      contact: { name: "  Max  " },
    });
    assert.deepEqual(result, {
      addresses: ["Berlin"],
      contact: { name: "Max" },
    });
  });

  test("filters out empty string addresses", () => {
    const result = parseContactExtractionResult({
      addresses: ["Berlin", "", "  "],
      contact: null,
    });
    assert.deepEqual(result, { addresses: ["Berlin"], contact: null });
  });
});

// --- mergeContactInfo ---

describe("mergeContactInfo", () => {
  test("fills missing addresses", () => {
    const vacancy = sampleVacancy({ addresses: [] });
    const result = mergeContactInfo(vacancy, {
      addresses: ["Musterstr. 1, 10115 Berlin"],
      contact: null,
    });
    assert.deepEqual(result.addresses, ["Musterstr. 1, 10115 Berlin"]);
  });

  test("replaces less-specific address with more-specific one", () => {
    const vacancy = sampleVacancy({ addresses: ["Berlin"] });
    const result = mergeContactInfo(vacancy, {
      addresses: ["Musterstr. 1, 10115 Berlin"],
      contact: null,
    });
    assert.deepEqual(result.addresses, ["Musterstr. 1, 10115 Berlin"]);
  });

  test("does not duplicate existing address", () => {
    const vacancy = sampleVacancy({
      addresses: ["Musterstr. 1, 10115 Berlin"],
    });
    const result = mergeContactInfo(vacancy, {
      addresses: ["Musterstr. 1, 10115 Berlin"],
      contact: null,
    });
    assert.deepEqual(result.addresses, ["Musterstr. 1, 10115 Berlin"]);
  });

  test("appends new address that does not overlap", () => {
    const vacancy = sampleVacancy({ addresses: ["Berlin"] });
    const result = mergeContactInfo(vacancy, {
      addresses: ["München"],
      contact: null,
    });
    assert.deepEqual(result.addresses, ["Berlin", "München"]);
  });

  test("overrides contact fields from LLM", () => {
    const vacancy = sampleVacancy({
      contact: { name: "Old Name", email: "old@co.de" },
    });
    const result = mergeContactInfo(vacancy, {
      addresses: [],
      contact: { name: "New Name", phone: "+49 123" },
    });
    assert.deepEqual(result.contact, {
      name: "New Name",
      email: "old@co.de",
      phone: "+49 123",
    });
  });

  test("keeps existing contact when LLM returns null", () => {
    const vacancy = sampleVacancy({ contact: { name: "Keep Me" } });
    const result = mergeContactInfo(vacancy, {
      addresses: [],
      contact: null,
    });
    assert.deepEqual(result.contact, { name: "Keep Me" });
  });

  test("returns same reference when nothing changed", () => {
    const vacancy = sampleVacancy({
      addresses: ["Berlin"],
      contact: { name: "Max" },
    });
    const result = mergeContactInfo(vacancy, {
      addresses: [],
      contact: null,
    });
    assert.equal(result, vacancy);
  });

  test("address matching is case-insensitive", () => {
    const vacancy = sampleVacancy({ addresses: ["berlin"] });
    const result = mergeContactInfo(vacancy, {
      addresses: ["Musterstr. 1, 10115 Berlin"],
      contact: null,
    });
    assert.deepEqual(result.addresses, ["Musterstr. 1, 10115 Berlin"]);
  });
});

// --- extractContactInfo ---

describe("extractContactInfo", () => {
  test("returns parsed result from LLM", async () => {
    const llm = createStubLlmClient({
      json: [
        {
          addresses: ["Neue Str. 5, 10115 Berlin"],
          contact: { name: "Fr. Müller", email: "mueller@co.de" },
        },
      ],
    });
    const result = await extractContactInfo(sampleVacancy(), llm);
    assert.deepEqual(result, {
      addresses: ["Neue Str. 5, 10115 Berlin"],
      contact: { name: "Fr. Müller", email: "mueller@co.de" },
    });
  });

  test("returns null when LLM returns invalid response", async () => {
    const llm = createStubLlmClient();
    const result = await extractContactInfo(sampleVacancy(), llm);
    assert.equal(result, null);
  });

  test("extracts contact from vacancy with description", async () => {
    const llm = createStubLlmClient({
      json: [{ addresses: ["Berlin"], contact: null }],
    });
    const result = await extractContactInfo(sampleVacancy(), llm);
    assert.deepEqual(result, { addresses: ["Berlin"], contact: null });
  });
});
