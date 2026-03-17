import { test } from "node:test";
import assert from "node:assert/strict";
import { createStubApplicantRepository } from "./index.js";
import {
  applicantRepositoryTests,
  makeSampleApplicant,
} from "./applicant.test-suite.js";

applicantRepositoryTests("StubApplicantRepository", {
  createRepo: () => ({
    repo: createStubApplicantRepository(),
    teardown: () => {},
  }),
});

// --- Stub-specific ---

test("StubApplicantRepository initializes from provided data", () => {
  const sample = makeSampleApplicant("john");
  const repo = createStubApplicantRepository({ john: sample });
  assert.equal(repo.exists("john"), true);
  assert.equal(repo.load("john").personal.name, "John Doe");
});
