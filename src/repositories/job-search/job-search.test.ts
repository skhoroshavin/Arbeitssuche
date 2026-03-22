import { test, expect } from "vitest";
import { createStubJobSearchRepository } from "./index";
import {
  jobSearchRepositoryTests,
  makeSampleJobSearch,
} from "./job-search.test-suite";

jobSearchRepositoryTests("StubJobSearchRepository", {
  createRepo: () => ({
    repo: createStubJobSearchRepository(),
    teardown: () => {},
  }),
});

// --- Stub-specific ---

test("StubJobSearchRepository initializes from provided data", () => {
  const sample = makeSampleJobSearch("s1");
  const repo = createStubJobSearchRepository({
    s1: { jobSearch: sample },
  });
  expect(repo.exists("s1")).toBe(true);
  expect(repo.load("s1").params.searchTerm).toBe("Software Engineer");
});
