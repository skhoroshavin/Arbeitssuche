import { test } from "node:test";
import assert from "node:assert/strict";
import { createStubSecretsRepository } from "./stub.js";
import {
  secretsRepositoryTests,
  SAMPLE_SECRETS,
} from "./secrets.test-suite.js";

secretsRepositoryTests("StubSecretsRepository", {
  createRepo: () => ({
    repo: createStubSecretsRepository(),
    teardown: () => {},
  }),
});

// --- Stub-specific ---

test("StubSecretsRepository initializes from provided data", () => {
  const repo = createStubSecretsRepository(SAMPLE_SECRETS);
  assert.deepEqual(repo.load(), SAMPLE_SECRETS);
});
