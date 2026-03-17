import { test } from "node:test";
import assert from "node:assert/strict";
import { createStubVacancyRepository } from "./index.js";
import { vacancyRepositoryTests, makeVacancy } from "./vacancy.test-suite.js";

const SAMPLE_VACANCY = makeVacancy();

vacancyRepositoryTests("StubVacancyRepository", {
  createRepo: () => ({
    repo: createStubVacancyRepository(),
    teardown: () => {},
  }),
});

// --- Stub-specific ---

test("StubVacancyRepository initializes from provided data", () => {
  const repo = createStubVacancyRepository({
    s1: { vacancies: [SAMPLE_VACANCY], latestCrawl: "2026-01-01.yaml" },
  });
  const output = repo.loadAll("s1");
  assert.equal(output!.vacancies.length, 1);
});
