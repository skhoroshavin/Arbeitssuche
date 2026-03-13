import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Secrets } from "@/models/secrets/types.js";
import { createStubSecretsRepository } from "./stub.js";
import { createEncryptedSecretsRepository } from "./encrypted.js";
import type { Cipher } from "./types.js";

const SAMPLE_SECRETS: Secrets = {
  openrouterApiKey: "sk-or-test-key",
  googleMapsApiKey: "maps-test-key",
};

/** Simple XOR cipher — enough to verify encrypt/decrypt round-trips. */
const testCipher: Cipher = {
  encryptString(plainText: string): Buffer {
    const buf = Buffer.from(plainText, "utf8");
    for (let i = 0; i < buf.length; i++) buf[i] ^= 0x42;
    return buf;
  },
  decryptString(encrypted: Buffer): string {
    const buf = Buffer.from(encrypted);
    for (let i = 0; i < buf.length; i++) buf[i] ^= 0x42;
    return buf.toString("utf8");
  },
};

let tmpDir: string;
let counter = 0;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secrets-integration-test-"));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const implementations = [
  {
    name: "StubSecretsRepository",
    persistent: false,
    createRepo: (_id: string) => ({
      repo: createStubSecretsRepository(),
      teardown: () => {},
    }),
  },
  {
    name: "EncryptedSecretsRepository",
    persistent: true,
    createRepo: (id: string) => ({
      repo: createEncryptedSecretsRepository(
        path.join(tmpDir, `${id}.enc`),
        testCipher,
      ),
      teardown: () => {},
    }),
  },
];

for (const impl of implementations) {
  describe(impl.name, () => {
    // --- Behavior ---

    test("returns empty secrets initially", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      assert.deepEqual(repo.load(), {});
      teardown();
    });

    test("save + load round-trips", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      await repo.save(SAMPLE_SECRETS);
      assert.deepEqual(repo.load(), SAMPLE_SECRETS);
      teardown();
    });

    test("save with partial data", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const partial: Secrets = { openrouterApiKey: "sk-only" };
      await repo.save(partial);
      assert.deepEqual(repo.load(), partial);
      teardown();
    });

    test("load returns a deep copy", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      await repo.save(SAMPLE_SECRETS);
      const a = repo.load();
      const b = repo.load();
      assert.notEqual(a, b);
      a.openrouterApiKey = "mutated";
      assert.equal(repo.load().openrouterApiKey, "sk-or-test-key");
      teardown();
    });

    test("save overwrites previous data", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      await repo.save(SAMPLE_SECRETS);
      const updated: Secrets = { googleMapsApiKey: "new-maps-key" };
      await repo.save(updated);
      assert.deepEqual(repo.load(), updated);
      teardown();
    });

    // --- Persistence (Encrypted only) ---

    if (impl.persistent) {
      test("saved secrets survive new repository instance", async () => {
        const id = String(counter++);
        const { repo: repo1 } = impl.createRepo(id);
        await repo1.save(SAMPLE_SECRETS);

        const { repo: repo2 } = impl.createRepo(id);
        assert.deepEqual(repo2.load(), SAMPLE_SECRETS);
      });

      test("overwritten secrets persist correctly", async () => {
        const id = String(counter++);
        const { repo: repo1 } = impl.createRepo(id);
        await repo1.save(SAMPLE_SECRETS);
        const updated: Secrets = { googleMapsApiKey: "new-maps-key" };
        await repo1.save(updated);

        const { repo: repo2 } = impl.createRepo(id);
        assert.deepEqual(repo2.load(), updated);
      });

      test("returns defaults for corrupted file", async () => {
        const id = String(counter++);
        const filePath = path.join(tmpDir, `${id}.enc`);
        fs.writeFileSync(filePath, "not valid encrypted data");

        const { repo } = impl.createRepo(id);
        assert.deepEqual(repo.load(), {});
      });
    }
  });
}

// --- Stub-specific ---

test("StubSecretsRepository initializes from provided data", () => {
  const repo = createStubSecretsRepository(SAMPLE_SECRETS);
  assert.deepEqual(repo.load(), SAMPLE_SECRETS);
});
