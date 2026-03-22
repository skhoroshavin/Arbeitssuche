import { test, describe, expect } from "vitest";
import type { AppConfig } from "@/models/config/types";
import type { ConfigRepository } from "./types";

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
      expect(repo.load()).toEqual({});
      teardown();
    });

    test("save + load round-trips", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_CONFIG);
      expect(repo.load()).toEqual(SAMPLE_CONFIG);
      teardown();
    });

    test("save with partial data", async () => {
      const { repo, teardown } = factory.createRepo();
      const partial: AppConfig = { assessmentModel: "test/model" };
      await repo.save(partial);
      expect(repo.load()).toEqual(partial);
      teardown();
    });

    test("load returns a deep copy", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_CONFIG);
      const a = repo.load();
      const b = repo.load();
      expect(a).not.toBe(b);
      a.assessmentModel = "mutated";
      expect(repo.load().assessmentModel).toBe("google/gemini-2.5-flash");
      teardown();
    });

    test("save overwrites previous data", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_CONFIG);
      const updated: AppConfig = { coverLetterModel: "new-model" };
      await repo.save(updated);
      expect(repo.load()).toEqual(updated);
      teardown();
    });
  });
}
