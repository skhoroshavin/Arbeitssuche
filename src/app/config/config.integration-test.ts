import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { AppConfig } from "@/models/config/types.js";
import { createStubConfigRepository } from "./stub.js";

const SAMPLE_CONFIG: AppConfig = {
  assessmentModel: "google/gemini-2.5-flash",
  coverLetterModel: "anthropic/claude-opus-4",
};

const implementations = [
  {
    name: "StubConfigRepository",
    createRepo: () => ({
      repo: createStubConfigRepository(),
      teardown: () => {},
    }),
  },
];

for (const impl of implementations) {
  describe(impl.name, () => {
    test("returns empty config initially", () => {
      const { repo, teardown } = impl.createRepo();
      assert.deepEqual(repo.load(), {});
      teardown();
    });

    test("save + load round-trips", async () => {
      const { repo, teardown } = impl.createRepo();
      await repo.save(SAMPLE_CONFIG);
      assert.deepEqual(repo.load(), SAMPLE_CONFIG);
      teardown();
    });

    test("save with partial data", async () => {
      const { repo, teardown } = impl.createRepo();
      const partial: AppConfig = { assessmentModel: "test/model" };
      await repo.save(partial);
      assert.deepEqual(repo.load(), partial);
      teardown();
    });

    test("load returns a deep copy", async () => {
      const { repo, teardown } = impl.createRepo();
      await repo.save(SAMPLE_CONFIG);
      const a = repo.load();
      const b = repo.load();
      assert.notEqual(a, b);
      a.assessmentModel = "mutated";
      assert.equal(repo.load().assessmentModel, "google/gemini-2.5-flash");
      teardown();
    });

    test("save overwrites previous data", async () => {
      const { repo, teardown } = impl.createRepo();
      await repo.save(SAMPLE_CONFIG);
      const updated: AppConfig = { coverLetterModel: "new-model" };
      await repo.save(updated);
      assert.deepEqual(repo.load(), updated);
      teardown();
    });
  });
}

// --- Stub-specific ---

test("StubConfigRepository initializes from provided data", () => {
  const repo = createStubConfigRepository(SAMPLE_CONFIG);
  assert.deepEqual(repo.load(), SAMPLE_CONFIG);
});
