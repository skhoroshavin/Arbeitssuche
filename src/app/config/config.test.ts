import { test } from "node:test";
import assert from "node:assert/strict";
import type { AppConfig } from "@/models/config/types.js";
import { createStubConfigRepository } from "./stub.js";
import { configRepositoryTests } from "./config.test-suite.js";

const SAMPLE_CONFIG: AppConfig = {
  assessmentModel: "google/gemini-2.5-flash",
  coverLetterModel: "anthropic/claude-opus-4",
};

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
