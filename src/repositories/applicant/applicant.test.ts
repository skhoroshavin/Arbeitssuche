import { test, expect } from "vitest";
import { createStubApplicantRepository } from "./index";
import {
  applicantRepositoryTests,
  makeSampleApplicant,
} from "./applicant.test-suite";

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
  expect(repo.exists("john")).toBe(true);
  expect(repo.load("john").personal.name).toBe("John Doe");
});
