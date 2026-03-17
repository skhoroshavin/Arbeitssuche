import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Secrets } from "@/models/secrets/types.js";
import type { SecretsRepository } from "./types.js";

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
      assert.deepEqual(repo.load(), {});
      teardown();
    });

    test("save + load round-trips", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_SECRETS);
      assert.deepEqual(repo.load(), SAMPLE_SECRETS);
      teardown();
    });

    test("save with partial data", async () => {
      const { repo, teardown } = factory.createRepo();
      const partial: Secrets = { openrouterApiKey: "sk-only" };
      await repo.save(partial);
      assert.deepEqual(repo.load(), partial);
      teardown();
    });

    test("load returns a deep copy", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_SECRETS);
      const a = repo.load();
      const b = repo.load();
      assert.notEqual(a, b);
      a.openrouterApiKey = "mutated";
      assert.equal(repo.load().openrouterApiKey, "sk-or-test-key");
      teardown();
    });

    test("save overwrites previous data", async () => {
      const { repo, teardown } = factory.createRepo();
      await repo.save(SAMPLE_SECRETS);
      const updated: Secrets = { googleMapsApiKey: "new-maps-key" };
      await repo.save(updated);
      assert.deepEqual(repo.load(), updated);
      teardown();
    });
  });
}
