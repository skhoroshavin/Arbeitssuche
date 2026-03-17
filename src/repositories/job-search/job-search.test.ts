import { test } from "node:test";
import assert from "node:assert/strict";
import { createStubJobSearchRepository } from "./index.js";
import {
  jobSearchRepositoryTests,
  makeSampleJobSearch,
} from "./job-search.test-suite.js";

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
  assert.equal(repo.exists("s1"), true);
  assert.equal(repo.load("s1").params.searchTerm, "Software Engineer");
});
