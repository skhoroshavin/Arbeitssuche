import { test, describe, expect, beforeAll, afterAll } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { Secrets } from "@/models/secrets/types"
import {
  createEncryptedSecretsRepository,
  createStubSecretsRepository,
} from "."
import type { Cipher } from "./types"

let temporaryDirectory: string
let counter = 0

beforeAll(() => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "secrets-test-"))
})

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true })
})

function runSecretsRepositoryTests(
  name: string,
  createRepo: () => {
    repo: {
      load: () => Secrets
      save: (data: Secrets) => Promise<void>
    }
    teardown: () => void
  },
) {
  describe(name, () => {
    test("returns empty secrets initially", () => {
      const { repo, teardown } = createRepo()
      expect(repo.load()).toEqual({})
      teardown()
    })

    test("save + load round-trips", async () => {
      const { repo, teardown } = createRepo()
      await repo.save(SAMPLE_SECRETS)
      expect(repo.load()).toEqual(SAMPLE_SECRETS)
      teardown()
    })

    test("save with partial data", async () => {
      const { repo, teardown } = createRepo()
      const partial: Secrets = { openrouterApiKey: "sk-only" }
      await repo.save(partial)
      expect(repo.load()).toEqual(partial)
      teardown()
    })

    test("load returns a deep copy", async () => {
      const { repo, teardown } = createRepo()
      await repo.save(SAMPLE_SECRETS)
      const a = repo.load()
      const b = repo.load()
      expect(a).not.toBe(b)
      a.openrouterApiKey = "mutated"
      expect(repo.load().openrouterApiKey).toBe("sk-or-test-key")
      teardown()
    })

    test("save overwrites previous data", async () => {
      const { repo, teardown } = createRepo()
      await repo.save(SAMPLE_SECRETS)
      const updated: Secrets = { googleMapsApiKey: "new-maps-key" }
      await repo.save(updated)
      expect(repo.load()).toEqual(updated)
      teardown()
    })
  })
}

// --- Stub ---

runSecretsRepositoryTests("StubSecretsRepository", () => ({
  repo: createStubSecretsRepository(),
  teardown: () => {},
}))

test("StubSecretsRepository initializes from provided data", () => {
  const repo = createStubSecretsRepository(SAMPLE_SECRETS)
  expect(repo.load()).toEqual(SAMPLE_SECRETS)
})

// --- Encrypted (with test cipher) ---

runSecretsRepositoryTests("EncryptedSecretsRepository", createEncryptedRepo)

test("saved secrets survive new repository instance", async () => {
  const id = String(counter++)
  const { repo: repo1 } = createEncryptedRepoWithId(id)
  await repo1.save(SAMPLE_SECRETS)

  const { repo: repo2 } = createEncryptedRepoWithId(id)
  expect(repo2.load()).toEqual(SAMPLE_SECRETS)
})

test("overwritten secrets persist correctly", async () => {
  const id = String(counter++)
  const { repo: repo1 } = createEncryptedRepoWithId(id)
  await repo1.save(SAMPLE_SECRETS)
  const updated: Secrets = { googleMapsApiKey: "new-maps-key" }
  await repo1.save(updated)

  const { repo: repo2 } = createEncryptedRepoWithId(id)
  expect(repo2.load()).toEqual(updated)
})

test("returns defaults for corrupted file", () => {
  const id = String(counter++)
  const filePath = path.join(temporaryDirectory, `${id}.enc`)
  fs.writeFileSync(filePath, "not valid encrypted data")

  const { repo } = createEncryptedRepoWithId(id)
  expect(repo.load()).toEqual({})
})

function createEncryptedRepo() {
  return {
    repo: createEncryptedSecretsRepository(
      path.join(temporaryDirectory, `${counter++}.enc`),
      testCipher,
    ),
    teardown: () => {},
  }
}

function createEncryptedRepoWithId(id: string) {
  return {
    repo: createEncryptedSecretsRepository(
      path.join(temporaryDirectory, `${id}.enc`),
      testCipher,
    ),
    teardown: () => {},
  }
}

const SAMPLE_SECRETS: Secrets = {
  openrouterApiKey: "sk-or-test-key",
  googleMapsApiKey: "maps-test-key",
}

/** Simple XOR cipher — enough to verify encrypt/decrypt round-trips. */
const testCipher: Cipher = {
  encryptString(plainText: string): Buffer {
    const buf = Buffer.from(plainText, "utf8")
    for (let index = 0; index < buf.length; index++) buf[index] ^= 0x42
    return buf
  },
  decryptString(encrypted: Buffer): string {
    const buf = Buffer.from(encrypted)
    for (let index = 0; index < buf.length; index++) buf[index] ^= 0x42
    return buf.toString("utf8")
  },
}
