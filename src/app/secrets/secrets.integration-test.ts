import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Secrets } from "@/models/secrets/types.js";
import { createEncryptedSecretsRepository } from "./encrypted.js";
import type { Cipher } from "./types.js";
import {
  secretsRepositoryTests,
  SAMPLE_SECRETS,
} from "./secrets.test-suite.js";

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

function createRepo() {
  return {
    repo: createEncryptedSecretsRepository(
      path.join(tmpDir, `${counter++}.enc`),
      testCipher,
    ),
    teardown: () => {},
  };
}

function createRepoWithId(id: string) {
  return {
    repo: createEncryptedSecretsRepository(
      path.join(tmpDir, `${id}.enc`),
      testCipher,
    ),
    teardown: () => {},
  };
}

secretsRepositoryTests("EncryptedSecretsRepository", { createRepo });

// --- Persistence ---

test("saved secrets survive new repository instance", async () => {
  const id = String(counter++);
  const { repo: repo1 } = createRepoWithId(id);
  await repo1.save(SAMPLE_SECRETS);

  const { repo: repo2 } = createRepoWithId(id);
  assert.deepEqual(repo2.load(), SAMPLE_SECRETS);
});

test("overwritten secrets persist correctly", async () => {
  const id = String(counter++);
  const { repo: repo1 } = createRepoWithId(id);
  await repo1.save(SAMPLE_SECRETS);
  const updated: Secrets = { googleMapsApiKey: "new-maps-key" };
  await repo1.save(updated);

  const { repo: repo2 } = createRepoWithId(id);
  assert.deepEqual(repo2.load(), updated);
});

test("returns defaults for corrupted file", async () => {
  const id = String(counter++);
  const filePath = path.join(tmpDir, `${id}.enc`);
  fs.writeFileSync(filePath, "not valid encrypted data");

  const { repo } = createRepoWithId(id);
  assert.deepEqual(repo.load(), {});
});
