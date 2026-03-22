import { test, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Secrets } from "@/models/secrets/types";
import { createStubSecretsRepository } from "./stub";
import { createEncryptedSecretsRepository } from "./encrypted";
import type { Cipher } from "./types";
import { secretsRepositoryTests, SAMPLE_SECRETS } from "./secrets.test-suite";

// --- Stub ---

secretsRepositoryTests("StubSecretsRepository", {
  createRepo: () => ({
    repo: createStubSecretsRepository(),
    teardown: () => {},
  }),
});

test("StubSecretsRepository initializes from provided data", () => {
  const repo = createStubSecretsRepository(SAMPLE_SECRETS);
  expect(repo.load()).toEqual(SAMPLE_SECRETS);
});

// --- Encrypted (with test cipher) ---

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

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secrets-test-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createEncryptedRepo() {
  return {
    repo: createEncryptedSecretsRepository(
      path.join(tmpDir, `${counter++}.enc`),
      testCipher,
    ),
    teardown: () => {},
  };
}

function createEncryptedRepoWithId(id: string) {
  return {
    repo: createEncryptedSecretsRepository(
      path.join(tmpDir, `${id}.enc`),
      testCipher,
    ),
    teardown: () => {},
  };
}

secretsRepositoryTests("EncryptedSecretsRepository", {
  createRepo: createEncryptedRepo,
});

test("saved secrets survive new repository instance", async () => {
  const id = String(counter++);
  const { repo: repo1 } = createEncryptedRepoWithId(id);
  await repo1.save(SAMPLE_SECRETS);

  const { repo: repo2 } = createEncryptedRepoWithId(id);
  expect(repo2.load()).toEqual(SAMPLE_SECRETS);
});

test("overwritten secrets persist correctly", async () => {
  const id = String(counter++);
  const { repo: repo1 } = createEncryptedRepoWithId(id);
  await repo1.save(SAMPLE_SECRETS);
  const updated: Secrets = { googleMapsApiKey: "new-maps-key" };
  await repo1.save(updated);

  const { repo: repo2 } = createEncryptedRepoWithId(id);
  expect(repo2.load()).toEqual(updated);
});

test("returns defaults for corrupted file", async () => {
  const id = String(counter++);
  const filePath = path.join(tmpDir, `${id}.enc`);
  fs.writeFileSync(filePath, "not valid encrypted data");

  const { repo } = createEncryptedRepoWithId(id);
  expect(repo.load()).toEqual({});
});
