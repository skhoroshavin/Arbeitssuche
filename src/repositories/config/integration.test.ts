import { describe, expect, test, beforeAll, afterAll } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createConfigRepository } from "."
import { createStubKVStore } from "@/plugins/kvstore"
import { createStubCipher } from "@/plugins/cipher"
import { Config } from "@/models/config"
import { Secrets } from "@/models/secrets"

let temporaryDirectory: string
let counter = 0

beforeAll(() => {
  temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "config-repo-test-"),
  )
})

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true })
})

configRepositoryTests("Stub", () => {
  const kvStore = createStubKVStore()
  const cipher = createStubCipher()
  return {
    repo: createConfigRepository(kvStore, cipher),
    teardown: () => {},
    kvStore,
    cipher,
  }
})

function configRepositoryTests(
  name: string,
  createRepo: () => {
    repo: ReturnType<typeof createConfigRepository>
    teardown: () => void
    kvStore: ReturnType<typeof createStubKVStore>
    cipher: ReturnType<typeof createStubCipher>
  },
) {
  describe(name, () => {
    test("returns default config initially", () => {
      const { repo, teardown } = createRepo()
      const config = repo.loadConfig()
      expect(config.provider).toBe("openrouter")
      expect(config.assessmentModel).toBe("google/gemini-2.5-flash")
      teardown()
    })

    test("save + load config round-trips", async () => {
      const { repo, teardown } = createRepo()
      const config = new Config()
      config.provider = "requesty"
      config.assessmentModel = "test/model"
      await repo.saveConfig(config)
      const loaded = repo.loadConfig()
      expect(loaded.provider).toBe("requesty")
      expect(loaded.assessmentModel).toBe("test/model")
      teardown()
    })

    test("save overwrites previous config", async () => {
      const { repo, teardown } = createRepo()
      const first = new Config()
      first.provider = "requesty"
      await repo.saveConfig(first)
      const second = new Config()
      await repo.saveConfig(second)
      expect(repo.loadConfig().provider).toBe("openrouter")
      teardown()
    })

    test("load config returns deep copy", async () => {
      const { repo, teardown } = createRepo()
      const config = new Config()
      config.assessmentModel = "test/model"
      await repo.saveConfig(config)
      const a = repo.loadConfig()
      const b = repo.loadConfig()
      expect(a).not.toBe(b)
      a.assessmentModel = "mutated"
      expect(repo.loadConfig().assessmentModel).toBe("test/model")
      teardown()
    })

    test("returns empty secrets initially", () => {
      const { repo, teardown } = createRepo()
      const secrets = repo.loadSecrets()
      expect(secrets.openrouterApiKey).toBeUndefined()
      teardown()
    })

    test("save + load secrets round-trips", async () => {
      const { repo, teardown } = createRepo()
      const secrets = new Secrets()
      secrets.openrouterApiKey = "sk-test"
      await repo.saveSecrets(secrets)
      const loaded = repo.loadSecrets()
      expect(loaded.openrouterApiKey).toBe("sk-test")
      teardown()
    })

    test("persistence: save then new repo instance loads correctly", async () => {
      const { repo: repo1, teardown: t1, kvStore, cipher } = createRepo()
      const config = new Config()
      config.provider = "requesty"
      const secrets = new Secrets()
      secrets.openrouterApiKey = "sk-test"
      await repo1.saveConfig(config)
      await repo1.saveSecrets(secrets)
      t1()

      const repo2 = createConfigRepository(kvStore, cipher)
      expect(repo2.loadConfig().provider).toBe("requesty")
      expect(repo2.loadSecrets().openrouterApiKey).toBe("sk-test")
    })

    test("secrets are encrypted at rest", async () => {
      const { repo, teardown, kvStore } = createRepo()
      const secrets = new Secrets()
      secrets.openrouterApiKey = "sk-test"
      await repo.saveSecrets(secrets)

      const raw = kvStore.get("secrets")
      expect(typeof raw).toBe("string")
      expect(raw).not.toContain("sk-test")
      teardown()
    })

    test("corrupted encrypted blob returns defaults", () => {
      const { repo, teardown, kvStore } = createRepo()
      kvStore.set("secrets", "garbled-data")
      const secrets = repo.loadSecrets()
      expect(secrets.openrouterApiKey).toBeUndefined()
      teardown()
    })

    test("migrates old root-level config", () => {
      const { repo, teardown, kvStore } = createRepo()
      kvStore.set("provider", "requesty")
      kvStore.set("assessmentModel", "old-model")
      const config = repo.loadConfig()
      expect(config.provider).toBe("requesty")
      expect(config.assessmentModel).toBe("old-model")
      expect(kvStore.get("config")).toEqual(config)
      teardown()
    })

    test("migrates old secrets file", () => {
      const id = String(counter++)
      const secretsPath = path.join(temporaryDirectory, `${id}.enc`)
      const { cipher } = createRepo()
      const oldEncrypted = cipher.encryptString(
        JSON.stringify({ openrouterApiKey: "migrated-key" }),
      )
      fs.writeFileSync(secretsPath, oldEncrypted)

      const kvStore = createStubKVStore()
      const repo = createConfigRepository(kvStore, cipher, secretsPath)
      const secrets = repo.loadSecrets()
      expect(secrets.openrouterApiKey).toBe("migrated-key")
      expect(typeof kvStore.get("secrets")).toBe("string")
    })
  })
}
