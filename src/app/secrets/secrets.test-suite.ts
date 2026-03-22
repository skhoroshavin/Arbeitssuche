import { test, describe, expect } from "vitest";
import type { Secrets } from "@/models/secrets/types";
import type { SecretsRepository } from "./types";

export const SAMPLE_SECRETS: Secrets = {
  openrouterApiKey: "sk-or-test-key",
  googleMapsApiKey: "maps-test-key",
};

interface RepoFactory {
  createRepo: () => { repo: SecretsRepository; teardown: () => void };
}

export function secretsRepositoryTests(name: string, factory: RepoFactory) {
  describe(name, () => {
    test("returns empty secrets initially", () => {
      const { repo, teardown } = factory.createRepo();
      expect(repo.load()).toEqual({});
      teardown();
    });

    test("save + load round-trips", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_SECRETS);
      expect(repo.load()).toEqual(SAMPLE_SECRETS);
      teardown();
    });

    test("save with partial data", async () => {
      const { repo, teardown } = factory.createRepo();
      const partial: Secrets = { openrouterApiKey: "sk-only" };
      await repo.save(partial);
      expect(repo.load()).toEqual(partial);
      teardown();
    });

    test("load returns a deep copy", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_SECRETS);
      const a = repo.load();
      const b = repo.load();
      expect(a).not.toBe(b);
      a.openrouterApiKey = "mutated";
      expect(repo.load().openrouterApiKey).toBe("sk-or-test-key");
      teardown();
    });

    test("save overwrites previous data", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_SECRETS);
      const updated: Secrets = { googleMapsApiKey: "new-maps-key" };
      await repo.save(updated);
      expect(repo.load()).toEqual(updated);
      teardown();
    });
  });
}
