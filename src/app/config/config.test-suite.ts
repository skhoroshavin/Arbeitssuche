import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { AppConfig } from "@/models/config/types.js";
import type { ConfigRepository } from "./types.js";

export const SAMPLE_CONFIG: AppConfig = {
  assessmentModel: "google/gemini-2.5-flash",
  coverLetterModel: "anthropic/claude-opus-4",
};

interface RepoFactory {
  createRepo: () => { repo: ConfigRepository; teardown: () => void };
}

export function configRepositoryTests(name: string, factory: RepoFactory) {
  describe(name, () => {
    test("returns empty config initially", () => {
      const { repo, teardown } = factory.createRepo();
      assert.deepEqual(repo.load(), {});
      teardown();
    });

    test("save + load round-trips", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_CONFIG);
      assert.deepEqual(repo.load(), SAMPLE_CONFIG);
      teardown();
    });

    test("save with partial data", async () => {
      const { repo, teardown } = factory.createRepo();
      const partial: AppConfig = { assessmentModel: "test/model" };
      await repo.save(partial);
      assert.deepEqual(repo.load(), partial);
      teardown();
    });

    test("load returns a deep copy", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_CONFIG);
      const a = repo.load();
      const b = repo.load();
      assert.notEqual(a, b);
      a.assessmentModel = "mutated";
      assert.equal(repo.load().assessmentModel, "google/gemini-2.5-flash");
      teardown();
    });

    test("save overwrites previous data", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_CONFIG);
      const updated: AppConfig = { coverLetterModel: "new-model" };
      await repo.save(updated);
      assert.deepEqual(repo.load(), updated);
      teardown();
    });
  });
}
