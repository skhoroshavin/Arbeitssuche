import { test, expect } from "vitest";
import { createStubConfigRepository } from "./stub";
import { configRepositoryTests, SAMPLE_CONFIG } from "./config.test-suite";

configRepositoryTests("StubConfigRepository", {
  createRepo: () => ({
    repo: createStubConfigRepository(),
    teardown: () => {},
  }),
});

// --- Stub-specific ---

test("StubConfigRepository initializes from provided data", () => {
  const repo = createStubConfigRepository(SAMPLE_CONFIG);
  expect(repo.load()).toEqual(SAMPLE_CONFIG);
});
