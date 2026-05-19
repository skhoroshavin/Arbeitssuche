I'm using the write-plan prompt to create the implementation plan.

# Config & Secrets Repository Refactor — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-05-19-config-secrets-repository-refactor-design.md`

**Goal:** Align config and secrets with the repository + model patterns used by applicant/job-search/vacancy. Extract `cipher` and `kvstore` plugins. Create a unified `ConfigRepository` with automatic migration from old storage. Cover with integration tests.

**Key design additions vs. original spec:**
- **Automatic migration is included.** `loadConfig()` migrates root-level electron-store keys. `loadSecrets()` migrates the old encrypted file.
- **Base64 encoding** for encrypted secrets in KVStore (electron-store serializes JSON; raw `Buffer` objects do not round-trip reliably).

---

## Task 1: Cipher Plugin

Create the `cipher` plugin with Electron (`safeStorage`) and stub (XOR) implementations.

**Files:**
- Create: `src/plugins/cipher/index.ts`
- Create: `src/plugins/cipher/electron/index.ts`
- Create: `src/plugins/cipher/stub/index.ts`

### Step 1: Write interface and exports

`src/plugins/cipher/index.ts`:

```ts
export interface Cipher {
  encryptString(plainText: string): Buffer
  decryptString(encrypted: Buffer): string
  isAvailable(): boolean
}

export { createElectronCipher } from "./electron"
export { createStubCipher } from "./stub"
```

### Step 2: Write Electron implementation

`src/plugins/cipher/electron/index.ts`:

```ts
import { safeStorage } from "electron"

import type { Cipher } from "@/plugins/cipher"

export function createElectronCipher(): Cipher {
  return {
    encryptString(plainText: string): Buffer {
      return safeStorage.encryptString(plainText)
    },

    decryptString(encrypted: Buffer): string {
      return safeStorage.decryptString(encrypted)
    },

    isAvailable(): boolean {
      return safeStorage.isEncryptionAvailable()
    },
  }
}
```

### Step 3: Write stub implementation

`src/plugins/cipher/stub/index.ts`:

```ts
import type { Cipher } from "@/plugins/cipher"

export function createStubCipher(): Cipher {
  return {
    encryptString(plainText: string): Buffer {
      const buf = Buffer.from(plainText, "utf8")
      for (let index = 0; index < buf.length; index++) {
        buf[index] ^= 0x42
      }
      return buf
    },

    decryptString(encrypted: Buffer): string {
      const buf = Buffer.from(encrypted)
      for (let index = 0; index < buf.length; index++) {
        buf[index] ^= 0x42
      }
      return buf.toString("utf8")
    },

    isAvailable(): boolean {
      return true
    },
  }
}
```

### Step 4: Verify build

Run: `npx tsc --noEmit`

Expected: PASS (no new errors; these files are not imported yet).

### Step 5: Commit

```bash
git add src/plugins/cipher
git commit -m "feat: add cipher plugin"
```

---

## Task 2: KVStore Plugin

Create the `kvstore` plugin with Electron (`electron-store`) and stub (in-memory `Map`) implementations.

**Files:**
- Create: `src/plugins/kvstore/index.ts`
- Create: `src/plugins/kvstore/electron/index.ts`
- Create: `src/plugins/kvstore/stub/index.ts`

### Step 1: Write interface and exports

`src/plugins/kvstore/index.ts`:

```ts
export interface KVStore {
  get(key: string): unknown
  set(key: string, value: unknown): void
}

export { createElectronKVStore } from "./electron"
export { createStubKVStore } from "./stub"
```

### Step 2: Write Electron implementation (singleton)

`src/plugins/kvstore/electron/index.ts`:

```ts
import ElectronStoreModule from "electron-store"

import type { KVStore } from "@/plugins/kvstore"

export function createElectronKVStore(): KVStore {
  if (!store) {
    store = instantiateStore()
  }
  return store
}

function instantiateStore(): KVStore {
  const electronStore = new (
    hasCjsDefault(ElectronStoreModule)
      ? ElectronStoreModule.default
      : ElectronStoreModule
  )({ name: "config" })

  return {
    get(key: string): unknown {
      return electronStore.get(key)
    },

    set(key: string, value: unknown): void {
      electronStore.set(key, value)
    },
  }
}

function hasCjsDefault<T>(module_: T): module_ is T & { default: T } {
  return typeof module_ === "object" && module_ !== null && "default" in module_
}

let store: KVStore | undefined
```

### Step 3: Write stub implementation

`src/plugins/kvstore/stub/index.ts`:

```ts
import type { KVStore } from "@/plugins/kvstore"

export function createStubKVStore(): KVStore {
  const data = new Map<string, unknown>()

  return {
    get(key: string): unknown {
      return data.get(key)
    },

    set(key: string, value: unknown): void {
      data.set(key, value)
    },
  }
}
```

### Step 4: Verify build

Run: `npx tsc --noEmit`

Expected: PASS.

### Step 5: Commit

```bash
git add src/plugins/kvstore
git commit -m "feat: add kvstore plugin"
```

---

## Task 3: Config Model Rewrite

Replace the ad-hoc `AppConfig` interface with a `Config` class following the applicant/job-search pattern. Keep legacy exports alive until all consumers are migrated.

**Files:**
- Create: `src/models/config/config.ts`
- Modify: `src/models/config/index.ts`
- Create: `src/models/config/config.test.ts`
- Modify: `src/ui/data/settings.ts`

### Step 1: Write Config class

`src/models/config/config.ts`:

```ts
import { z } from "zod"

export type LlmProvider = "openrouter" | "requesty"

export interface Address {
  street: string
  zip: string
  city: string
}

export interface LlmModel {
  id: string
  name: string
  pricing: { prompt: string; completion: string }
}

export const DEFAULT_PROVIDER: LlmProvider = "openrouter"
export const DEFAULT_ASSESSMENT_MODEL = "google/gemini-2.5-flash"
export const DEFAULT_COVER_LETTER_MODEL = "anthropic/claude-opus-4"
export const DEFAULT_CONSULTATION_MODEL = "google/gemini-2.5-flash"

export class Config {
  provider: LlmProvider = DEFAULT_PROVIDER
  assessmentModel: string = DEFAULT_ASSESSMENT_MODEL
  coverLetterModel: string = DEFAULT_COVER_LETTER_MODEL
  consultationModel: string = DEFAULT_CONSULTATION_MODEL

  static parse(data: unknown): Config {
    const parsed = ConfigInputSchema.parse(data)
    const config = new Config()
    config.provider = parsed.provider
    config.assessmentModel = parsed.assessmentModel
    config.coverLetterModel = parsed.coverLetterModel
    config.consultationModel = parsed.consultationModel
    return config
  }
}

const ConfigInputSchema = z.object({
  provider: z.enum(["openrouter", "requesty"]).default(DEFAULT_PROVIDER),
  assessmentModel: z.string().default(DEFAULT_ASSESSMENT_MODEL),
  coverLetterModel: z.string().default(DEFAULT_COVER_LETTER_MODEL),
  consultationModel: z.string().default(DEFAULT_CONSULTATION_MODEL),
})
```

### Step 2: Update index.ts to export new class alongside legacy exports

`src/models/config/index.ts`:

```ts
export type { Address, LlmModel, LlmProvider } from "./config.js"
export { Config } from "./config.js"
export {
  DEFAULT_PROVIDER,
  DEFAULT_ASSESSMENT_MODEL,
  DEFAULT_COVER_LETTER_MODEL,
  DEFAULT_CONSULTATION_MODEL,
} from "./config.js"

export type ConfigKey =
  | "provider"
  | "assessmentModel"
  | "coverLetterModel"
  | "consultationModel"

// Legacy exports — removed after consumer migration
export interface AppConfig {
  provider?: LlmProvider
  assessmentModel?: string
  coverLetterModel?: string
  consultationModel?: string
}

export { resolveConfig } from "./resolve.js"
export {
  LlmProviderInfoSchema,
  CommuteProviderInfoSchema,
  LlmModelSchema,
  ResolvedConfigSchema,
} from "./schemas.js"
```

### Step 3: Write model tests

`src/models/config/config.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { Config } from "@/models/config"

describe("Config", () => {
  it("default constructor produces default values", () => {
    const c = new Config()
    expect(c.provider).toBe("openrouter")
    expect(c.assessmentModel).toBe("google/gemini-2.5-flash")
    expect(c.coverLetterModel).toBe("anthropic/claude-opus-4")
    expect(c.consultationModel).toBe("google/gemini-2.5-flash")
  })

  it("parse fills missing fields with defaults", () => {
    const c = Config.parse({})
    expect(c.provider).toBe("openrouter")
    expect(c.assessmentModel).toBe("google/gemini-2.5-flash")
    expect(c.coverLetterModel).toBe("anthropic/claude-opus-4")
    expect(c.consultationModel).toBe("google/gemini-2.5-flash")
  })

  it("parse preserves provided values", () => {
    const c = Config.parse({
      provider: "requesty",
      assessmentModel: "test/model",
      coverLetterModel: "test/cover",
      consultationModel: "test/consult",
    })
    expect(c.provider).toBe("requesty")
    expect(c.assessmentModel).toBe("test/model")
    expect(c.coverLetterModel).toBe("test/cover")
    expect(c.consultationModel).toBe("test/consult")
  })
})
```

### Step 4: Run model tests

Run: `npm test -- src/models/config/config.test.ts`

Expected: PASS (3 tests).

### Step 5: Relocate IPC/UI schemas in settings.ts

`src/ui/data/settings.ts` currently imports `LlmProviderInfoSchema`, `CommuteProviderInfoSchema`, `LlmModelSchema`, `ResolvedConfigSchema` from `@/models/config` and `MaskedSecretsRecordSchema`, `SecretTestResultSchema` from `@/models/secrets`.

Replace those imports with local schema definitions and switch `useConfig` to use `Config.parse`.

Full replacement content for `src/ui/data/settings.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import type { MaskedSecret } from "@/models/secrets"
import type { ConfigKey, LlmModel, LlmProvider } from "@/models/config"
import {
  Config,
  DEFAULT_ASSESSMENT_MODEL,
  DEFAULT_CONSULTATION_MODEL,
  DEFAULT_COVER_LETTER_MODEL,
  DEFAULT_PROVIDER,
} from "@/models/config"
import { api } from "./internal/api"

const LlmProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
})

const CommuteProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  instructions: z.string(),
})

const LlmModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
  }),
})

const ResolvedConfigSchema = z.object({
  provider: z.enum(["openrouter", "requesty"]),
  assessmentModel: z.string(),
  coverLetterModel: z.string(),
  consultationModel: z.string(),
})

const MaskedSecretSchema = z.object({
  masked: z.string(),
  isSet: z.boolean(),
})

const MaskedSecretsRecordSchema = z.record(MaskedSecretSchema)

const SecretTestResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
})

// --- Provider secrets (factory) ---

export function useProviderSecretActions(
  type: "llm" | "commute",
  providerId: string,
) {
  const hooks = type === "llm" ? llmHooks : commuteHooks
  const saveMutation = hooks.useSave()
  const clearMutation = hooks.useClear()
  const testMutation = hooks.useTest()

  return {
    onSave: async (value: string) => {
      await saveMutation.mutateAsync({ providerId, value })
    },
    onClear: async () => {
      await clearMutation.mutateAsync(providerId)
    },
    onTest: () => testMutation.mutateAsync(providerId),
  }
}

export function resolveSecret(
  secrets: Record<string, MaskedSecret> | undefined,
  providerId: string,
): MaskedSecret {
  return secrets?.[providerId] ?? EMPTY_MASKED_SECRET
}

// --- Provider info ---

export function useCommuteProviderListView() {
  const query = useCommuteProviders()
  return {
    ...query,
    data: query.data ?? [],
  }
}

// --- API key status (used across the app) ---

export function useApiKeyStatus(): {
  hasLlmKey: boolean
  hasMapsKey: boolean
  isLoading: boolean
} {
  const { data: llmSecrets, isLoading: llmLoading } = useLlmSecrets()
  const { data: commuteSecrets, isLoading: commuteLoading } =
    useCommuteSecrets()
  const { data: config, isLoading: configLoading } = useConfig()

  const provider: LlmProvider = config?.provider ?? DEFAULT_PROVIDER
  const isLoading = llmLoading || commuteLoading || configLoading

  return {
    hasLlmKey: hasSecret(llmSecrets, provider),
    hasMapsKey: hasSecret(commuteSecrets, "google-maps"),
    isLoading,
  }
}

export function useAISettingsView(fallbackModels: LlmModel[]) {
  const { data: secrets, isLoading: secretsLoading } = useLlmSecrets()
  const { data: config, isLoading: configLoading } = useResolvedConfig()
  const { data: remoteModels, isLoading: modelsLoading } = useLlmModels()
  const { data: providers } = useLlmProviders()
  const saveConfig = useSaveConfig()

  return {
    secrets,
    provider: config.provider,
    config,
    providers: providers ?? [],
    models:
      remoteModels && remoteModels.length > 0 ? remoteModels : fallbackModels,
    modelsLoading,
    saveConfig,
    isLoading: secretsLoading || configLoading,
  }
}

export function useCommuteSecrets() {
  return commuteHooks.useSecrets()
}

export function useLlmProviders() {
  return useQuery({
    queryKey: ["llm-providers"],
    queryFn: async () =>
      z
        .array(LlmProviderInfoSchema)
        .parse(await api().invoke("settings:llm-providers")),
  })
}

const EMPTY_MASKED_SECRET: MaskedSecret = { masked: "", isSet: false }

function useLlmSecrets() {
  return llmHooks.useSecrets()
}

function useCommuteProviders() {
  return useQuery({
    queryKey: ["commute-providers"],
    queryFn: async () =>
      z
        .array(CommuteProviderInfoSchema)
        .parse(await api().invoke("settings:commute-providers")),
  })
}

function useResolvedConfig() {
  const query = useConfig()
  return {
    ...query,
    data: query.data ?? new Config(),
  }
}

function useSaveConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: ConfigKey; value: string }) =>
      api().invoke("settings:config:save", key, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["config"] })
      void queryClient.invalidateQueries({ queryKey: ["llm-models"] })
    },
  })
}

function hasSecret(
  secrets: Record<string, MaskedSecret> | undefined,
  key: string,
): boolean {
  return secrets?.[key]?.isSet ?? false
}

function createProviderSecretHooks(type: "llm" | "commute") {
  const queryKey = [`${type}-secrets`]

  function useSecrets() {
    return useQuery({
      queryKey,
      queryFn: async () =>
        MaskedSecretsRecordSchema.parse(
          await api().invoke(`settings:${type}:secrets`),
        ),
    })
  }

  function useSave() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: ({
        providerId,
        value,
      }: {
        providerId: string
        value: string
      }) => api().invoke(`settings:${type}:secret:save`, providerId, value),
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    })
  }

  function useClear() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (providerId: string) =>
        api().invoke(`settings:${type}:secret:clear`, providerId),
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    })
  }

  function useTest() {
    return useMutation({
      mutationFn: async (providerId: string) =>
        SecretTestResultSchema.parse(
          await api().invoke(`settings:${type}:secret:test`, providerId),
        ),
    })
  }

  return { useSecrets, useSave, useClear, useTest }
}

const llmHooks = createProviderSecretHooks("llm")
const commuteHooks = createProviderSecretHooks("commute")

// --- Config ---

function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: async () =>
      Config.parse(await api().invoke("settings:config:load")),
  })
}

function useLlmModels() {
  return useQuery({
    queryKey: ["llm-models"],
    queryFn: async () =>
      z.array(LlmModelSchema).parse(await api().invoke("settings:llm-models")),
  })
}
```

### Step 6: Verify build and tests

Run: `npx tsc --noEmit`

Expected: PASS.

Run: `npm test -- src/models/config/config.test.ts`

Expected: PASS.

### Step 7: Commit

```bash
git add src/models/config src/ui/data/settings.ts
git commit -m "feat: rewrite Config model with class + parse"
```

---

## Task 4: Secrets Model Rewrite

Replace the ad-hoc `Secrets` interface with a `Secrets` class. Keep legacy exports alive.

**Files:**
- Create: `src/models/secrets/secrets.ts`
- Modify: `src/models/secrets/index.ts`
- Create: `src/models/secrets/secrets.test.ts`

### Step 1: Write Secrets class

`src/models/secrets/secrets.ts`:

```ts
import { z } from "zod"

export class Secrets {
  openrouterApiKey?: string
  requestyApiKey?: string
  googleMapsApiKey?: string

  static parse(data: unknown): Secrets {
    const parsed = SecretsInputSchema.parse(data)
    const secrets = new Secrets()
    secrets.openrouterApiKey = parsed.openrouterApiKey
    secrets.requestyApiKey = parsed.requestyApiKey
    secrets.googleMapsApiKey = parsed.googleMapsApiKey
    return secrets
  }
}

const SecretsInputSchema = z.object({
  openrouterApiKey: z.string().optional(),
  requestyApiKey: z.string().optional(),
  googleMapsApiKey: z.string().optional(),
})
```

### Step 2: Update index.ts to export class alongside legacy exports

`src/models/secrets/index.ts`:

```ts
export { Secrets } from "./secrets.js"

export interface MaskedSecret {
  masked: string
  isSet: boolean
}

export type SecretKey =
  | "openrouterApiKey"
  | "requestyApiKey"
  | "googleMapsApiKey"

// Legacy exports — removed after consumer migration
export { resolveSecrets } from "./resolve.js"
export { MaskedSecretsRecordSchema, SecretTestResultSchema } from "./schemas.js"
```

### Step 3: Write model tests

`src/models/secrets/secrets.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { Secrets } from "@/models/secrets"

describe("Secrets", () => {
  it("default constructor produces undefined fields", () => {
    const s = new Secrets()
    expect(s.openrouterApiKey).toBeUndefined()
    expect(s.requestyApiKey).toBeUndefined()
    expect(s.googleMapsApiKey).toBeUndefined()
  })

  it("parse fills missing fields with undefined", () => {
    const s = Secrets.parse({})
    expect(s.openrouterApiKey).toBeUndefined()
    expect(s.requestyApiKey).toBeUndefined()
    expect(s.googleMapsApiKey).toBeUndefined()
  })

  it("parse preserves provided values", () => {
    const s = Secrets.parse({
      openrouterApiKey: "sk-test",
      googleMapsApiKey: "maps-test",
    })
    expect(s.openrouterApiKey).toBe("sk-test")
    expect(s.requestyApiKey).toBeUndefined()
    expect(s.googleMapsApiKey).toBe("maps-test")
  })
})
```

### Step 4: Run model tests

Run: `npm test -- src/models/secrets/secrets.test.ts`

Expected: PASS (3 tests).

### Step 5: Commit

```bash
git add src/models/secrets
git commit -m "feat: rewrite Secrets model with class + parse"
```

---

## Task 5: ConfigRepository with Migration

Create the unified repository that manages both config and secrets, including automatic migration from old storage locations.

**Files:**
- Create: `src/repositories/config/index.ts`
- Create: `src/repositories/config/integration.test.ts`

### Step 1: Write repository implementation

`src/repositories/config/index.ts`:

```ts
import { existsSync, readFileSync } from "node:fs"

import { Config } from "@/models/config"
import { Secrets } from "@/models/secrets"
import type { Cipher } from "@/plugins/cipher"
import type { KVStore } from "@/plugins/kvstore"

export interface ConfigRepository {
  loadConfig(): Config
  saveConfig(data: Config): Promise<void>
  loadSecrets(): Secrets
  saveSecrets(data: Secrets): Promise<void>
}

export function createConfigRepository(
  kvStore: KVStore,
  cipher: Cipher,
  migration?: { secretsFilePath?: string },
): ConfigRepository {
  return {
    loadConfig(): Config {
      const raw = kvStore.get("config")
      if (raw !== undefined) {
        return Config.parse(raw)
      }

      const provider = kvStore.get("provider")
      if (provider !== undefined) {
        const migrated = Config.parse({
          provider,
          assessmentModel: kvStore.get("assessmentModel"),
          coverLetterModel: kvStore.get("coverLetterModel"),
          consultationModel: kvStore.get("consultationModel"),
        })
        kvStore.set("config", migrated)
        return migrated
      }

      return Config.parse({})
    },

    saveConfig(data: Config): Promise<void> {
      kvStore.set("config", data)
      return Promise.resolve()
    },

    loadSecrets(): Secrets {
      const encrypted = kvStore.get("secrets")
      if (encrypted !== undefined) {
        return loadSecretsFromEncrypted(encrypted, cipher)
      }

      if (migration?.secretsFilePath && existsSync(migration.secretsFilePath)) {
        try {
          const oldEncrypted = readFileSync(migration.secretsFilePath)
          const decrypted = cipher.decryptString(oldEncrypted)
          const secrets = Secrets.parse(JSON.parse(decrypted))
          kvStore.set(
            "secrets",
            cipher.encryptString(JSON.stringify(secrets)).toString("base64"),
          )
          return secrets
        } catch {
          // fall through to defaults
        }
      }

      return Secrets.parse({})
    },

    saveSecrets(data: Secrets): Promise<void> {
      const encrypted = cipher.encryptString(JSON.stringify(data))
      kvStore.set("secrets", encrypted.toString("base64"))
      return Promise.resolve()
    },
  }
}

function loadSecretsFromEncrypted(
  encrypted: unknown,
  cipher: Cipher,
): Secrets {
  if (typeof encrypted !== "string") return Secrets.parse({})
  try {
    const decrypted = cipher.decryptString(Buffer.from(encrypted, "base64"))
    return Secrets.parse(JSON.parse(decrypted))
  } catch {
    return Secrets.parse({})
  }
}
```

### Step 2: Write integration tests

`src/repositories/config/integration.test.ts`:

```ts
import { describe, expect, test, beforeAll, afterAll } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createConfigRepository } from "."
import { createStubKVStore } from "@/plugins/kvstore/stub"
import { createStubCipher } from "@/plugins/cipher/stub"
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

    test("save + load config round-trips", () => {
      const { repo, teardown } = createRepo()
      const config = new Config()
      config.provider = "requesty"
      config.assessmentModel = "test/model"
      repo.saveConfig(config)
      const loaded = repo.loadConfig()
      expect(loaded.provider).toBe("requesty")
      expect(loaded.assessmentModel).toBe("test/model")
      teardown()
    })

    test("save overwrites previous config", () => {
      const { repo, teardown } = createRepo()
      const first = new Config()
      first.provider = "requesty"
      repo.saveConfig(first)
      const second = new Config()
      repo.saveConfig(second)
      expect(repo.loadConfig().provider).toBe("openrouter")
      teardown()
    })

    test("load config returns deep copy", () => {
      const { repo, teardown } = createRepo()
      const config = new Config()
      config.assessmentModel = "test/model"
      repo.saveConfig(config)
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

    test("save + load secrets round-trips", () => {
      const { repo, teardown } = createRepo()
      const secrets = new Secrets()
      secrets.openrouterApiKey = "sk-test"
      repo.saveSecrets(secrets)
      const loaded = repo.loadSecrets()
      expect(loaded.openrouterApiKey).toBe("sk-test")
      teardown()
    })

    test("persistence: save then new repo instance loads correctly", () => {
      const { repo: repo1, teardown: t1, kvStore, cipher } = createRepo()
      const config = new Config()
      config.provider = "requesty"
      const secrets = new Secrets()
      secrets.openrouterApiKey = "sk-test"
      repo1.saveConfig(config)
      repo1.saveSecrets(secrets)
      t1()

      const repo2 = createConfigRepository(kvStore, cipher)
      expect(repo2.loadConfig().provider).toBe("requesty")
      expect(repo2.loadSecrets().openrouterApiKey).toBe("sk-test")
    })

    test("secrets are encrypted at rest", () => {
      const { repo, teardown, kvStore } = createRepo()
      const secrets = new Secrets()
      secrets.openrouterApiKey = "sk-test"
      repo.saveSecrets(secrets)

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
      const repo = createConfigRepository(kvStore, cipher, {
        secretsFilePath: secretsPath,
      })
      const secrets = repo.loadSecrets()
      expect(secrets.openrouterApiKey).toBe("migrated-key")
      expect(typeof kvStore.get("secrets")).toBe("string")
    })
  })
}
```

### Step 3: Run integration tests

Run: `npm test -- src/repositories/config/integration.test.ts`

Expected: PASS (11 tests).

### Step 4: Commit

```bash
git add src/repositories/config
git commit -m "feat: add ConfigRepository with migration"
```

---

## Task 6: Update App-Level Consumers

Wire the new `ConfigRepository` through the app layer. Remove `SecretsRepository` and `ConfigRepository` (old) from `ServiceContext` / `AppServices`. Remove `deleteSecretsFile` control.

**Files:**
- Modify: `src/app/composition/create-service-context.ts`
- Modify: `src/app/composition/create-services.ts`
- Modify: `src/app/ipc-settings.ts`
- Modify: `src/app/ipc-setup.ts`
- Modify: `src/app/ipc-handlers.ts`
- Modify: `src/app/ipc-setup.test.ts`

### Step 1: Update create-service-context.ts

Replace the entire file `src/app/composition/create-service-context.ts`:

```ts
import type { ConfigRepository } from "@/repositories/config"
import type { SetupRepository } from "@/app/setup"
import {
  createSqliteApplicantRepository,
  type ApplicantRepository,
} from "@/repositories/applicant"
import {
  createSqliteJobSearchRepository,
  type JobSearchRepository,
} from "@/repositories/job-search"
import {
  createSqliteVacancyRepository,
  type VacancyRepository,
} from "@/repositories/vacancy"
import type { CommuteClient } from "@/plugins/commute"
import type { LlmModelRegistry } from "@/plugins/llm"
import type { PdfRenderer } from "@/plugins/pdf-renderer"
import type { Database } from "@/utils/index.js"
import type { LlmClientFactory } from "./llm-factory.js"

export function createSqliteServiceContext(
  database: Database,
  configRepo: ConfigRepository,
  setupRepo: SetupRepository,
): ServiceContext {
  return {
    applicantRepo: createSqliteApplicantRepository(database),
    jobSearchRepo: createSqliteJobSearchRepository(database),
    configRepo,
    setupRepo,
    vacancyRepo: createSqliteVacancyRepository(database),
  }
}

export interface ServiceContext {
  applicantRepo: ApplicantRepository
  jobSearchRepo: JobSearchRepository
  configRepo: ConfigRepository
  setupRepo: SetupRepository
  vacancyRepo: VacancyRepository
  pdfRenderer?: PdfRenderer
  modelRegistry?: LlmModelRegistry
  llmClientFactory?: LlmClientFactory
  commuteClient?: CommuteClient
}
```

### Step 2: Update create-services.ts

Replace the entire file `src/app/composition/create-services.ts`:

```ts
import type { ConfigRepository } from "@/repositories/config"
import type { SetupRepository } from "@/app/setup"
import type { ApplicantRepository } from "@/repositories/applicant"
import type { JobSearchRepository } from "@/repositories/job-search"
import type { VacancyRepository } from "@/repositories/vacancy"
import { createGoogleMapsCommuteClient } from "@/plugins/commute"
import type { LlmClient, LlmModelRegistry } from "@/plugins/llm"
import { createLlmClient, createModelRegistry } from "@/plugins/llm"
import { getJobSiteNames } from "@/plugins/job-site"
import { createElectronPdfRenderer } from "@/plugins/pdf-renderer"
import { CoverLetterWriter } from "@/services/cover-letter-writer/index.js"
import { JobConsultant } from "@/services/job-consultant/index.js"
import { ResumeRenderer } from "@/services/resume-renderer/index.js"
import { SiteCrawler } from "@/services/site-crawler/index.js"
import { VacancyEnricher } from "@/services/vacancy-enricher/index.js"
import { VacancyScanner } from "@/services/vacancy-scanner/index.js"
import type { ServiceContext } from "./create-service-context.js"
import type { LlmClientFactory } from "./llm-factory.js"

export function createAppServices(context: ServiceContext): AppServices {
  const pdfRenderer = context.pdfRenderer ?? createElectronPdfRenderer()

  function buildServices() {
    const config = context.configRepo.loadConfig()
    const secrets = context.configRepo.loadSecrets()
    const { provider, assessmentModel, coverLetterModel, consultationModel } =
      config
    const apiKey = getProviderApiKey(provider, secrets)
    const buildConfiguredLlmClient = (model: string) =>
      buildLlmClient(context.llmClientFactory, provider, apiKey, model)

    const assessmentLlm = buildConfiguredLlmClient(assessmentModel)
    const coverLetterLlm = buildConfiguredLlmClient(coverLetterModel)
    const consultationLlm = buildConfiguredLlmClient(consultationModel)

    const googleMapsApiKey = secrets.googleMapsApiKey
    const commuteClient = googleMapsApiKey
      ? createGoogleMapsCommuteClient(googleMapsApiKey)
      : context.commuteClient

    const modelRegistry = context.modelRegistry ?? createModelRegistry(provider)

    const vacancyEnricher = new VacancyEnricher({
      llmClient: assessmentLlm,
      commuteClient,
    })

    return {
      modelRegistry,
      vacancyEnricher,
      resumeRenderer: new ResumeRenderer(context.applicantRepo, pdfRenderer),
      jobConsultant: new JobConsultant(context.applicantRepo, consultationLlm),
      vacancyScanner: new VacancyScanner(
        context.vacancyRepo,
        context.jobSearchRepo,
        context.applicantRepo,
        new SiteCrawler(),
        vacancyEnricher,
        getJobSiteNames,
      ),
      coverLetterWriter: new CoverLetterWriter(
        context.jobSearchRepo,
        context.applicantRepo,
        context.vacancyRepo,
        coverLetterLlm,
      ),
    }
  }

  let services = buildServices()

  return {
    applicantRepo: context.applicantRepo,
    jobSearchRepo: context.jobSearchRepo,
    vacancyRepo: context.vacancyRepo,
    configRepo: context.configRepo,
    setupRepo: context.setupRepo,
    get modelRegistry() {
      return services.modelRegistry
    },
    get resumeRenderer() {
      return services.resumeRenderer
    },
    get jobConsultant() {
      return services.jobConsultant
    },
    get vacancyEnricher() {
      return services.vacancyEnricher
    },
    get vacancyScanner() {
      return services.vacancyScanner
    },
    get coverLetterWriter() {
      return services.coverLetterWriter
    },
    rebuild() {
      services = buildServices()
    },
  }
}

export interface AppServices {
  applicantRepo: ApplicantRepository
  jobSearchRepo: JobSearchRepository
  vacancyRepo: VacancyRepository
  configRepo: ConfigRepository
  setupRepo: SetupRepository
  modelRegistry: LlmModelRegistry
  resumeRenderer: ResumeRenderer
  jobConsultant: JobConsultant
  vacancyEnricher: VacancyEnricher
  vacancyScanner: VacancyScanner
  coverLetterWriter: CoverLetterWriter
  rebuild: () => void
}

function buildLlmClient(
  factory: LlmClientFactory | undefined,
  provider: string,
  apiKey: string | undefined,
  model: string,
): LlmClient | undefined {
  if (factory) {
    try {
      return factory(model)
    } catch {
      return undefined
    }
  }
  if (!apiKey) return undefined
  return createLlmClient(provider, apiKey, model)
}

function getProviderApiKey(
  provider: string,
  secrets: { openrouterApiKey?: string; requestyApiKey?: string },
): string | undefined {
  switch (provider) {
    case "requesty": {
      return secrets.requestyApiKey
    }
    default: {
      return secrets.openrouterApiKey
    }
  }
}
```

### Step 3: Update ipc-settings.ts

Replace the entire file `src/app/ipc-settings.ts`:

```ts
import type { ConfigKey } from "@/models/config"
import { getJobSiteInfos } from "@/plugins/job-site"
import { getLlmProviders, createLlmClientForPing } from "@/plugins/llm"
import { getCommuteProviders, createCommuteClient } from "@/plugins/commute"
import {
  LLM_SECRET_KEYS,
  COMMUTE_SECRET_KEYS,
  maskedSecretsFor,
  resolveSecretKey,
} from "./ipc-utilities.js"
import type { IpcHandle } from "./ipc-handlers.js"
import type { AppServices } from "."

export function registerSettingsHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("sites:list", () => ({ sites: getJobSiteInfos() }))

  handle("settings:llm:secrets", () =>
    maskedSecretsFor(LLM_SECRET_KEYS, services.configRepo.loadSecrets()),
  )
  handle(
    "settings:llm:secret:save",
    async (providerId: string, value: string) =>
      saveProviderSecret(services, providerId, value, LLM_SECRET_KEYS),
  )
  handle("settings:llm:secret:clear", async (providerId: string) =>
    clearProviderSecret(services, providerId, LLM_SECRET_KEYS),
  )
  handle("settings:llm:secret:test", (providerId: string) =>
    testProviderSecret(services, providerId, LLM_SECRET_KEYS),
  )

  handle("settings:commute:secrets", () =>
    maskedSecretsFor(COMMUTE_SECRET_KEYS, services.configRepo.loadSecrets()),
  )
  handle(
    "settings:commute:secret:save",
    async (providerId: string, value: string) =>
      saveProviderSecret(services, providerId, value, COMMUTE_SECRET_KEYS),
  )
  handle("settings:commute:secret:clear", async (providerId: string) =>
    clearProviderSecret(services, providerId, COMMUTE_SECRET_KEYS),
  )
  handle("settings:commute:secret:test", (providerId: string) =>
    testProviderSecret(services, providerId, COMMUTE_SECRET_KEYS),
  )

  handle("settings:llm-providers", () => getLlmProviders())
  handle("settings:commute-providers", () => getCommuteProviders())

  handle("settings:llm-models", () => services.modelRegistry.fetchModels())

  handle("settings:config:load", () => services.configRepo.loadConfig())
  handle("settings:config:save", async (key: ConfigKey, value: string) => {
    const config = services.configRepo.loadConfig()
    if (key === "provider") {
      config.provider = value === "requesty" ? "requesty" : "openrouter"
    } else {
      config[key] = value
    }
    await services.configRepo.saveConfig(config)
    services.rebuild()
    return { ok: true }
  })
}

async function saveProviderSecret(
  services: AppServices,
  providerId: string,
  value: string,
  mapping: typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS,
): Promise<{ ok: true }> {
  const key = resolveSecretKey(providerId, mapping)
  const secrets = services.configRepo.loadSecrets()
  secrets[key] = value
  await services.configRepo.saveSecrets(secrets)
  services.rebuild()
  return { ok: true }
}

async function clearProviderSecret(
  services: AppServices,
  providerId: string,
  mapping: typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS,
): Promise<{ ok: true }> {
  const key = resolveSecretKey(providerId, mapping)
  const secrets = services.configRepo.loadSecrets()
  delete secrets[key]
  await services.configRepo.saveSecrets(secrets)
  services.rebuild()
  return { ok: true }
}

async function testProviderSecret(
  services: AppServices,
  providerId: string,
  mapping: typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS,
): Promise<{ ok: boolean; error?: string }> {
  const key = resolveSecretKey(providerId, mapping)
  const secrets = services.configRepo.loadSecrets()
  const value = secrets[key]
  if (!value) {
    return {
      ok: false,
      error: "Kein Schlüssel gesetzt",
    }
  }
  const ok =
    mapping === LLM_SECRET_KEYS
      ? await createLlmClientForPing(providerId, value).ping()
      : await createCommuteClient(providerId, value).ping()
  return { ok }
}
```

### Step 4: Update ipc-setup.ts

Replace the entire file `src/app/ipc-setup.ts`:

```ts
import type { AppSetupState } from "@/models/setup"
import type { ConfigRepository } from "@/repositories/config"
import type { SetupRepository } from "@/app/setup"
import { Config } from "@/models/config"
import { Secrets } from "@/models/secrets"
import type { IpcHandle } from "./ipc-handlers.js"

export function registerSetupHandlers(
  handle: IpcHandle,
  services: SetupHandlerServices,
  controls: SetupHandlerControls,
): void {
  handle("setup:state:load", () => ({ state: services.setupRepo.load() }))
  handle("setup:state:save", (update: Partial<AppSetupState>) =>
    services.setupRepo.save(update),
  )
  handle("setup:state:complete", () => services.setupRepo.complete())
  handle("setup:clear-data", async () => clearAppData({ services, controls }))
  handle("app:close", () => {
    controls.closeApp()
    return { ok: true }
  })
}

export async function clearAppData({
  services,
  controls,
}: {
  services: SetupHandlerServices
  controls: SetupHandlerControls
}): Promise<{ ok: true }> {
  let failure: unknown

  controls.closeDatabase()

  try {
    controls.deleteDatabaseFiles()
    await services.configRepo.saveConfig(new Config())
    await services.configRepo.saveSecrets(new Secrets())
    await services.setupRepo.reset()
  } catch (error) {
    failure = error
  } finally {
    controls.reopenDatabase()
  }

  if (failure) {
    throw toError(failure)
  }

  return { ok: true }
}

interface SetupHandlerControls {
  closeDatabase: () => void
  deleteDatabaseFiles: () => void
  reopenDatabase: () => void
  closeApp: () => void
}

interface SetupHandlerServices {
  configRepo: ConfigRepository
  setupRepo: SetupRepository
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
```

### Step 5: Update ipc-handlers.ts

Replace the entire file `src/app/ipc-handlers.ts`:

```ts
import { ipcMain, type WebContents } from "electron"
import type { AppServices } from "."
import { registerApplicantsHandlers } from "./ipc-applicants.js"
import { registerJobSearchesHandlers } from "./ipc-job-searches.js"
import { registerVacanciesHandlers } from "./ipc-vacancies.js"
import { registerCrawlHandlers } from "./ipc-crawl.js"
import { registerSettingsHandlers } from "./ipc-settings.js"
import { registerSetupHandlers } from "./ipc-setup.js"

export type IpcHandle = <A extends unknown[], R>(
  channel: string,
  handler: (...arguments_: A) => R,
) => void

export type SafeSend = (channel: string, ...arguments_: unknown[]) => void

export function registerIpcHandlers(options: IpcHandlerOptions): void {
  const { services, getWebContents } = options
  const safeSend = createSafeSend(getWebContents)

  registerApplicantsHandlers(handle, services)
  registerJobSearchesHandlers(handle, services)
  registerVacanciesHandlers(handle, services, safeSend)
  registerCrawlHandlers(handle, services, safeSend)
  registerSettingsHandlers(handle, services)
  registerSetupHandlers(handle, services, {
    closeDatabase: options.closeDatabase,
    deleteDatabaseFiles: options.deleteDatabaseFiles,
    reopenDatabase: options.reopenDatabase,
    closeApp: options.closeApp,
  })
}

interface IpcHandlerOptions {
  services: AppServices
  getWebContents: () => WebContents | undefined
  closeDatabase: () => void
  deleteDatabaseFiles: () => void
  reopenDatabase: () => void
  closeApp: () => void
}

function handle<A extends unknown[], R>(
  channel: string,
  handler: (...arguments_: A) => R,
): void {
  ipcMain.handle(channel, (_event, ...arguments_: A) => handler(...arguments_))
}

function createSafeSend(
  getWebContents: () => WebContents | undefined,
): SafeSend {
  return (channel, ...arguments_) => {
    const webContents = getWebContents()
    webContents?.send(channel, ...arguments_)
  }
}
```

### Step 6: Update ipc-setup.test.ts

Replace the entire file `src/app/ipc-setup.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { clearAppData, registerSetupHandlers } from "@/app"
import { createConfigRepository } from "@/repositories/config"
import { createStubSetupRepository } from "@/app/setup"
import { createStubKVStore } from "@/plugins/kvstore/stub"
import { createStubCipher } from "@/plugins/cipher/stub"
import { Config } from "@/models/config"
import { Secrets } from "@/models/secrets"

describe("setup IPC handlers", () => {
  it("loads, saves, and completes setup state", async () => {
    const calls = new Map<string, (...arguments_: unknown[]) => unknown>()
    const services = createServices()

    registerSetupHandlers(
      (channel, handler) => {
        calls.set(channel, (...arguments_) => handler(...arguments_))
      },
      services,
      createControls(),
    )

    expect(await invoke(calls, "setup:state:load")).toEqual({
      state: undefined,
    })

    expect(
      await invoke(calls, "setup:state:save", {
        lastPhase: "applicant",
        lastStep: "experience",
      }),
    ).toEqual({
      completed: false,
      lastPhase: "applicant",
      lastStep: "experience",
    })

    expect(await invoke(calls, "setup:state:complete")).toEqual({
      completed: true,
    })
  })

  it("clears persisted data and reopens the database", async () => {
    const services = createServices()
    const controls = createControls()

    const config = new Config()
    config.assessmentModel = "test/model"
    await services.configRepo.saveConfig(config)

    const secrets = new Secrets()
    secrets.openrouterApiKey = "secret"
    await services.configRepo.saveSecrets(secrets)

    await services.setupRepo.save({
      lastPhase: "job-search",
      lastStep: "preferences",
      applicantId: "ada",
    })

    await clearAppData({ services, controls })

    expect(controls.closeDatabase).toHaveBeenCalledOnce()
    expect(controls.deleteDatabaseFiles).toHaveBeenCalledOnce()
    expect(controls.reopenDatabase).toHaveBeenCalledOnce()
    expect(services.configRepo.loadConfig()).toEqual(new Config())
    expect(services.configRepo.loadSecrets()).toEqual(new Secrets())
    expect(services.setupRepo.load()).toEqual({ completed: false })
  })
})

function invoke(
  calls: Map<string, (...arguments_: unknown[]) => unknown>,
  channel: string,
  ...arguments_: unknown[]
) {
  const handler = calls.get(channel)
  if (!handler) {
    throw new Error(`Missing handler for ${channel}`)
  }
  return handler(...arguments_)
}

function createControls() {
  return {
    closeDatabase: vi.fn(),
    deleteDatabaseFiles: vi.fn(),
    reopenDatabase: vi.fn(),
    closeApp: vi.fn(),
  }
}

function createServices() {
  const kvStore = createStubKVStore()
  const cipher = createStubCipher()
  return {
    configRepo: createConfigRepository(kvStore, cipher),
    setupRepo: createStubSetupRepository(),
  }
}
```

### Step 7: Verify build and tests

Run: `npx tsc --noEmit`

Expected: PASS.

Run: `npm test -- src/app/ipc-setup.test.ts`

Expected: PASS (2 tests).

### Step 8: Commit

```bash
git add src/app
git commit -m "refactor: wire ConfigRepository through app layer"
```

---

## Task 7: Update Main Process and Setup Repository

Wire `createElectronKVStore`, `createElectronCipher`, and `createConfigRepository` in `main.ts`. Update the setup repository to use the new KVStore plugin.

**Files:**
- Modify: `src/app/main.ts`
- Modify: `src/app/setup/electron-store.ts`

### Step 1: Update main.ts

Replace the entire file `src/app/main.ts`:

```ts
import {
  app,
  BrowserWindow,
  Menu,
  protocol,
  safeStorage,
  session,
  shell,
} from "electron"
import { rmSync } from "node:fs"
import path from "node:path"
import { registerIpcHandlers } from "./ipc.js"
import { registerAppProtocol } from "./protocol.js"
import { createAppServices, createSqliteServiceContext } from "."
import { createElectronStoreSetupRepository } from "./setup"
import { Database } from "@/utils/index.js"
import { getDataDirectory, getSecretsPath } from "./data-paths.js"
import { createConfigRepository } from "@/repositories/config"
import { createElectronKVStore } from "@/plugins/kvstore"
import { createElectronCipher, createStubCipher } from "@/plugins/cipher"
import type { AppServices } from "."

let mainWindow: BrowserWindow | undefined
let appDatabase: Database | undefined
let currentServices: AppServices | undefined

const isDevelopment = process.env.NODE_ENV === "development"
const isTest = process.env.ELECTRON_TEST === "1"

// Isolate Chrome user-data per test instance to avoid lock conflicts
if (isTest && process.env.ELECTRON_TEST_DATA_DIR) {
  app.setPath("userData", process.env.ELECTRON_TEST_DATA_DIR)
}

// Register custom protocol before app is ready
if (!isDevelopment) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "app",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ])
}

void (async () => {
  await app.whenReady()

  Menu.setApplicationMenu(null)
  const dataDirectory = isTest
    ? (process.env.ELECTRON_TEST_DATA_DIR ?? "data")
    : getDataDirectory()
  const databasePath = path.join(dataDirectory, "arbeitssuche.db")
  const secretsPath = getSecretsPath()

  // Register custom protocol handler for serving renderer files
  if (!isDevelopment) {
    registerAppProtocol(getRendererDirectory())
  }

  // Deny all permission requests (camera, microphone, geolocation, etc.)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) =>
    callback(false),
  )

  appDatabase = Database.open(databasePath)

  const kvStore = createElectronKVStore()
  const cipher = isTest ? createStubCipher() : createElectronCipher()
  const configRepo = createConfigRepository(kvStore, cipher, {
    secretsFilePath: isTest ? undefined : secretsPath,
  })
  const setupRepo = createElectronStoreSetupRepository()

  currentServices = createAppServices(
    createSqliteServiceContext(appDatabase, configRepo, setupRepo),
  )
  const services = createMutableAppServices(() => getCurrentServices())

  registerIpcHandlers({
    services,
    getWebContents: () => mainWindow?.webContents,
    closeDatabase: () => getCurrentDatabase().close(),
    deleteDatabaseFiles: () => deleteDatabaseFiles(databasePath),
    reopenDatabase: () => {
      appDatabase = Database.open(databasePath)
      currentServices = createAppServices(
        createSqliteServiceContext(appDatabase, configRepo, setupRepo),
      )
    },
    closeApp: () => app.quit(),
  })

  await createAndShowWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAndShowWindow().catch(console.error)
    }
  })

  app.on("window-all-closed", () => {
    app.quit()
  })

  app.on("before-quit", () => {
    appDatabase?.close()
  })
})()

function getCurrentDatabase(): Database {
  if (!appDatabase) throw new Error("App database not initialized")
  return appDatabase
}

function getCurrentServices(): AppServices {
  if (!currentServices) throw new Error("App services not initialized")
  return currentServices
}

function getRendererDirectory(): string {
  return path.join(__dirname, "../renderer")
}

function deleteDatabaseFiles(databasePath: string): void {
  rmSync(databasePath, { force: true })
  rmSync(`${databasePath}-shm`, { force: true })
  rmSync(`${databasePath}-wal`, { force: true })
}

async function createAndShowWindow(): Promise<void> {
  mainWindow = createBrowserWindow()
  await (isDevelopment
    ? mainWindow.loadURL("http://localhost:5173")
    : mainWindow.loadURL("app://./"))
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url).catch(console.error)
    }
    return { action: "deny" }
  })

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const isInternal =
      url.startsWith("http://localhost:") || url.startsWith("app://")
    if (!isInternal) {
      event.preventDefault()
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = undefined
  })
}

function createBrowserWindow(): BrowserWindow {
  return new BrowserWindow({
    width: 1080,
    height: 900,
    show: !isTest,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDevelopment || isTest,
    },
  })
}

function createMutableAppServices(getServices: () => AppServices): AppServices {
  return {
    get applicantRepo() {
      return getServices().applicantRepo
    },
    get jobSearchRepo() {
      return getServices().jobSearchRepo
    },
    get vacancyRepo() {
      return getServices().vacancyRepo
    },
    get configRepo() {
      return getServices().configRepo
    },
    get setupRepo() {
      return getServices().setupRepo
    },
    get modelRegistry() {
      return getServices().modelRegistry
    },
    get resumeRenderer() {
      return getServices().resumeRenderer
    },
    get jobConsultant() {
      return getServices().jobConsultant
    },
    get vacancyEnricher() {
      return getServices().vacancyEnricher
    },
    get vacancyScanner() {
      return getServices().vacancyScanner
    },
    get coverLetterWriter() {
      return getServices().coverLetterWriter
    },
    rebuild() {
      getServices().rebuild()
    },
  }
}
```

### Step 2: Update setup/electron-store.ts

Replace the entire file `src/app/setup/electron-store.ts`:

```ts
import { createElectronKVStore } from "@/plugins/kvstore"
import {
  completeSetupState,
  createIncompleteSetupState,
  mergeSetupState,
  resolveSetupState,
} from "@/models/setup"
import type { AppSetupState } from "@/models/setup"
import type { SetupRepository } from "./types.js"

export function createElectronStoreSetupRepository(): SetupRepository {
  const kvStore = createElectronKVStore()

  return {
    load(): AppSetupState | undefined {
      const setup = kvStore.get("setup")
      return setup ? structuredClone(resolveSetupState(setup)) : undefined
    },

    save(update: Partial<AppSetupState>): Promise<AppSetupState> {
      const current = kvStore.get("setup")
      const next = mergeSetupState(current, update)
      kvStore.set("setup", next)
      return Promise.resolve(structuredClone(next))
    },

    complete(): Promise<AppSetupState> {
      const next = completeSetupState()
      kvStore.set("setup", next)
      return Promise.resolve(structuredClone(next))
    },

    reset(): Promise<AppSetupState> {
      const next = createIncompleteSetupState()
      kvStore.set("setup", next)
      return Promise.resolve(structuredClone(next))
    },
  }
}
```

### Step 3: Verify build

Run: `npx tsc --noEmit`

Expected: PASS.

### Step 4: Commit

```bash
git add src/app/main.ts src/app/setup/electron-store.ts
git commit -m "refactor: wire new plugins and repository in main process"
```

---

## Task 8: Update Architecture Rules, Delete Old Files, Clean Model Exports

Update `eslint.config.ts` to allow repositories to import from plugins. Delete all obsolete files. Clean up model `index.ts` files to remove legacy exports.

**Files:**
- Modify: `eslint.config.ts`
- Modify: `src/models/config/index.ts`
- Modify: `src/models/secrets/index.ts`
- Delete: `src/models/config/constants.ts`
- Delete: `src/models/config/resolve.ts`
- Delete: `src/models/config/schemas.ts`
- Delete: `src/models/secrets/resolve.ts`
- Delete: `src/models/secrets/schemas.ts`
- Delete: `src/models/secrets/resolve.test.ts`
- Delete: `src/app/config/config.test.ts`
- Delete: `src/app/config/electron-store-store.ts`
- Delete: `src/app/config/electron-store.ts`
- Delete: `src/app/config/stub.ts`
- Delete: `src/app/config/types.ts`
- Delete: `src/app/config/index.ts`
- Delete: `src/app/secrets/encrypted.ts`
- Delete: `src/app/secrets/index.ts`
- Delete: `src/app/secrets/secrets.test.ts`
- Delete: `src/app/secrets/stub.ts`
- Delete: `src/app/secrets/types.ts`

### Step 1: Update eslint.config.ts

In `eslint.config.ts`, find the `repositories/*` entry under `settings.unslop.architecture` and change it to:

```ts
"repositories/*": {
  imports: ["repositories/+", "models/+", "utils/+", "plugins/*"],
},
```

### Step 2: Clean model exports

Replace `src/models/config/index.ts`:

```ts
export type { Address, LlmModel, LlmProvider } from "./config.js"
export { Config } from "./config.js"
export type { ConfigKey } from "./config.js"
export {
  DEFAULT_PROVIDER,
  DEFAULT_ASSESSMENT_MODEL,
  DEFAULT_COVER_LETTER_MODEL,
  DEFAULT_CONSULTATION_MODEL,
} from "./config.js"
```

Wait, `ConfigKey` is not currently exported from `config.ts`. Add it to `config.ts`:

In `src/models/config/config.ts`, add after the `LlmModel` interface:

```ts
export type ConfigKey =
  | "provider"
  | "assessmentModel"
  | "coverLetterModel"
  | "consultationModel"
```

Then `src/models/config/index.ts`:

```ts
export type { Address, LlmModel, LlmProvider, ConfigKey } from "./config.js"
export { Config } from "./config.js"
export {
  DEFAULT_PROVIDER,
  DEFAULT_ASSESSMENT_MODEL,
  DEFAULT_COVER_LETTER_MODEL,
  DEFAULT_CONSULTATION_MODEL,
} from "./config.js"
```

Replace `src/models/secrets/index.ts`:

```ts
export { Secrets } from "./secrets.js"

export interface MaskedSecret {
  masked: string
  isSet: boolean
}

export type SecretKey =
  | "openrouterApiKey"
  | "requestyApiKey"
  | "googleMapsApiKey"
```

### Step 3: Delete old files

Run:

```bash
rm src/models/config/constants.ts
rm src/models/config/resolve.ts
rm src/models/config/schemas.ts
rm src/models/secrets/resolve.ts
rm src/models/secrets/schemas.ts
rm src/models/secrets/resolve.test.ts
rm src/app/config/config.test.ts
rm src/app/config/electron-store-store.ts
rm src/app/config/electron-store.ts
rm src/app/config/stub.ts
rm src/app/config/types.ts
rm src/app/config/index.ts
rm src/app/secrets/encrypted.ts
rm src/app/secrets/index.ts
rm src/app/secrets/secrets.test.ts
rm src/app/secrets/stub.ts
rm src/app/secrets/types.ts
```

### Step 4: Verify build and tests

Run: `npm run fix`

Expected: PASS (auto-fixes any import ordering / formatting).

Run: `npx tsc --noEmit`

Expected: PASS.

Run: `npm test`

Expected: PASS (all unit + integration tests).

### Step 5: Commit

```bash
git add -A
git commit -m "refactor: delete old config/secrets files and clean exports"
```

---

## Task 9: Final Verification

Run the full verification suite to confirm nothing is broken.

### Step 1: Lint and type-check

Run: `npm run fix`

Expected: completes without unfixable errors.

Run: `npx tsc --noEmit`

Expected: PASS.

### Step 2: Run all tests

Run: `npm test`

Expected: PASS (all Vitest unit and integration tests).

### Step 3: Commit if clean

```bash
git diff --quiet || git commit -am "chore: final verification fixes"
```

---

## Self-Review Checklist

| Spec Requirement | Task |
|---|---|
| Config class with `parse()` | Task 3 |
| Secrets class with `parse()` | Task 4 |
| Cipher plugin (interface + electron + stub) | Task 1 |
| KVStore plugin (interface + electron + stub) | Task 2 |
| ConfigRepository interface + `createConfigRepository()` | Task 5 |
| Repository stores config under `'config'` key | Task 5 |
| Repository stores secrets as encrypted blob under `'secrets'` key | Task 5 |
| Automatic migration: root-level config → `'config'` key | Task 5 |
| Automatic migration: old secrets file → `'secrets'` key | Task 5 |
| Schema relocation (LLM/Commute/Masked/Result schemas) | Task 3 (settings.ts) |
| `deleteSecretsFile` control removal | Task 6 |
| Architecture rule update (`repositories/*` imports `plugins/*`) | Task 8 |
| Integration tests (round-trip, overwrite, deep copy, persistence, encryption, corruption, migration) | Task 5 |
| Model tests for Config and Secrets | Tasks 3 & 4 |

**Placeholder scan:** No TBD, TODO, or "similar to" steps. Every code block contains complete, copy-pasteable content.

**Type consistency:**
- `ConfigRepository.loadConfig()` returns `Config`
- `ConfigRepository.loadSecrets()` returns `Secrets`
- `Config.parse()` uses `ConfigInputSchema`
- `Secrets.parse()` uses `SecretsInputSchema`
- `ipc-settings.ts` uses `services.configRepo.loadConfig()` / `loadSecrets()` / `saveConfig()` / `saveSecrets()`
- `ipc-setup.ts` uses `new Config()` and `new Secrets()` for clear

**No gaps found. Plan approved.**

---

Plan complete and saved to `docs/superpowers/plans/2026-05-19-config-secrets-repository-refactor.md`. Use the `execute-plan` prompt to execute tasks sequentially.
