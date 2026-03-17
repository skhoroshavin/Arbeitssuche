import { test } from "node:test";
import assert from "node:assert/strict";
import { createStubConfigRepository } from "./stub.js";
import { configRepositoryTests, SAMPLE_CONFIG } from "./config.test-suite.js";

configRepositoryTests("StubConfigRepository", {
  createRepo: () => ({
    repo: createStubConfigRepository(),
    teardown: () => {},
  }),
});

// --- Stub-specific ---

test("StubConfigRepository initializes from provided data", () => {
  const repo = createStubConfigRepository(SAMPLE_CONFIG);
  assert.deepEqual(repo.load(), SAMPLE_CONFIG);
});
