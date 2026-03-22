import { test, expect } from "vitest";
import { createStubVacancyRepository } from "./index";
import { vacancyRepositoryTests, makeVacancy } from "./vacancy.test-suite";

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
  expect(output!.vacancies.length).toBe(1);
});
