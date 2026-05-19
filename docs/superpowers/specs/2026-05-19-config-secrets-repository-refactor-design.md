# Config & Secrets Repository Refactor

## Context

Config and secrets currently live in `src/app/config/` and `src/app/secrets/` with their own ad-hoc repository patterns. Applicant, job-search, and vacancy already live in `src/repositories/` with consistent interfaces, stub + sqlite implementations, and integration tests.

Config/secrets models are also ad-hoc — plain interfaces with scattered `resolve.ts`, `constants.ts`, `schemas.ts`. Applicant, job-search, and vacancy use single-file class models with `static parse()`, constructor defaults, and inline zod schemas.

Setup will be heavily refactored later and stays out of scope.

## Goal

Align config and secrets with the repository + model patterns:

1. Refactor models to `Config` and `Secrets` classes following the applicant/job-search/vacancy pattern.
2. Extract storage primitives into testable plugins (`cipher`, `kvstore`).
3. Create a single `ConfigRepository` in `src/repositories/config/` that manages both config and secrets.
4. Cover the repository with integration tests that use stub plugin implementations.

## Design

### Model — Config

Single file with class, zod schema, types. Replaces `src/models/config/` (5 files → 1).

```
src/models/config/
  config.ts         ← Config class + zod schema + types
  index.ts          ← exports
```

```ts
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

export type LlmProvider = "openrouter" | "requesty"
```

Removed: `constants.ts`, `resolve.ts`, `schemas.ts`. Defaults live in the class constructor. `resolveConfig()` is absorbed into `Config.parse()`.

### Model — Secrets

Single file with class, zod schema, types. Replaces `src/models/secrets/` (3 files → 1).

```
src/models/secrets/
  secrets.ts        ← Secrets class + zod schema + types
  index.ts          ← exports
```

```ts
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
```

Removed: `resolve.ts`, `schemas.ts`. `resolveSecrets()` absorbed into `Secrets.parse()`.

### Schemas relocation

The following schemas are NOT domain model schemas — they describe IPC/UI data shapes:

- `LlmProviderInfoSchema` → move to `src/plugins/llm/` or `src/ui/data/settings.ts`
- `CommuteProviderInfoSchema` → move to `src/plugins/commute/` or `src/ui/data/settings.ts`
- `LlmModelSchema` → move to `src/plugins/llm/`
- `ResolvedConfigSchema` → delete, replaced by `Config.parse()`
- `MaskedSecretsRecordSchema` → move to `src/ui/data/settings.ts`
- `SecretTestResultSchema` → move to `src/ui/data/settings.ts`

### Plugin — Cipher

Mirrors `electron.safeStorage` interface.

```
src/plugins/cipher/
  index.ts          ← Cipher interface + factory exports
  electron/
    index.ts        ← createElectronCipher() wraps safeStorage
  stub/
    index.ts        ← createStubCipher() XOR test cipher
```

```ts
interface Cipher {
  encryptString(plainText: string): Buffer
  decryptString(encrypted: Buffer): string
  isAvailable(): boolean
}
```

### Plugin — KVStore

Mirrors the minimal `electron-store` interface used by the app.

```
src/plugins/kvstore/
  index.ts          ← KVStore interface + factory exports
  electron/
    index.ts        ← createElectronKVStore() returns new ElectronStore()
  stub/
    index.ts        ← createStubKVStore() in-memory Map
```

```ts
interface KVStore {
  get(key: string): unknown
  set(key: string, value: unknown): void
}
```

### Repository — Config

Single repository managing both config and secrets. Injected with `KVStore` and `Cipher`.

```
src/repositories/config/
  index.ts          ← ConfigRepository interface + createConfigRepository
  integration.test.ts
```

```ts
interface ConfigRepository {
  loadConfig(): Config
  saveConfig(data: Config): Promise<void>
  loadSecrets(): Secrets
  saveSecrets(data: Secrets): Promise<void>
}

function createConfigRepository(
  kvStore: KVStore,
  cipher: Cipher,
): ConfigRepository
```

**Storage strategy:**
- Config: `kvStore.get('config')` / `kvStore.set('config', data)`
- Secrets: encrypted blob at `kvStore.get('secrets')` / `kvStore.set('secrets', encrypted)`

**Stub tests:**
```ts
createConfigRepository(createStubKVStore(), createStubCipher())
```

**Electron production:**
```ts
createConfigRepository(createElectronKVStore(), createElectronCipher())
```

## Changes

### New files (10)

- `src/models/config/config.ts`
- `src/models/secrets/secrets.ts`
- `src/plugins/cipher/index.ts`
- `src/plugins/cipher/electron/index.ts`
- `src/plugins/cipher/stub/index.ts`
- `src/plugins/kvstore/index.ts`
- `src/plugins/kvstore/electron/index.ts`
- `src/plugins/kvstore/stub/index.ts`
- `src/repositories/config/index.ts`
- `src/repositories/config/integration.test.ts`

### Deleted files (15)

- `src/models/config/constants.ts`
- `src/models/config/resolve.ts`
- `src/models/config/schemas.ts`
- `src/models/secrets/resolve.ts`
- `src/models/secrets/schemas.ts`
- `src/app/config/config.test.ts`
- `src/app/config/electron-store-store.ts`
- `src/app/config/electron-store.ts`
- `src/app/config/stub.ts`
- `src/app/config/types.ts`
- `src/app/secrets/encrypted.ts`
- `src/app/secrets/index.ts`
- `src/app/secrets/secrets.test.ts`
- `src/app/secrets/stub.ts`
- `src/app/secrets/types.ts`

### Architecture rule change

`repositories/*` must import `KVStore` and `Cipher` from `plugins/*`. Update `eslint.config.ts`:

```ts
"repositories/*": {
  imports: ["repositories/+", "models/+", "utils/+", "plugins/*"],
},
```

### Consumers to update

- `src/app/main.ts` — remove `deleteSecretsFile` control; wire new `ConfigRepository`
- `src/app/composition/create-service-context.ts` — inject `ConfigRepository`
- `src/app/composition/create-services.ts` — consume `ConfigRepository`
- `src/app/ipc-setup.ts` — `clearAppData` clears secrets via `configRepo.saveSecrets(new Secrets())`
- `src/app/ipc-settings.ts` — use `ConfigRepository` methods
- `src/app/ipc-utilities.ts` — update imports
- `src/app/index.ts` — update exports
- `src/app/setup/electron-store.ts` — imports `createElectronKVStore` from new plugin (singleton, so config repo and setup repo share the same underlying store)
- `src/ui/data/settings.ts` — relocated schemas
- All tests referencing `createStubConfigRepository`, `createStubSecretsRepository`, `resolveConfig`, `resolveSecrets`

### Data migration

Config and secrets currently store in **different** locations:
- **Config**: stored at root level of the electron-store JSON (`{ provider, assessmentModel, coverLetterModel, consultationModel, setup? }`)
- **Secrets**: separate encrypted file on disk via direct file I/O

The new repository stores **both** under named keys in the same KVStore:
- Config: `kvStore.get('config')` / `kvStore.set('config', data)`
- Secrets: `kvStore.get('secrets')` / `kvStore.set('secrets', encryptedBlob)`

On first load with the new repository:
- `loadConfig()` reads from `kvStore.get('config')` — misses existing config stored at root level of the electron-store JSON
- `loadSecrets()` reads encrypted blob from `kvStore.get('secrets')` — misses existing secrets file

**Decision:** This refactor does NOT include automatic migration. The config data is small (a few strings) and can be re-entered. Secrets must be re-entered anyway since they are encrypted. This is acceptable for a pre-release app.

### `deleteSecretsFile` control removal

The `clearAppData` IPC handler currently receives a `deleteSecretsFile` callback that removes the separate secrets file. After this refactor:
- The callback is **removed** from `registerSetupHandlers` and `main.ts`.
- `clearAppData` clears secrets by calling `configRepo.saveSecrets(new Secrets())`, which stores an empty encrypted blob under the `'secrets'` key.
- The old `getSecretsPath()` and `rmSync(secretsPath)` code in `main.ts` is deleted.

## Testing

### Model tests

Add `config.test.ts` and `secrets.test.ts` following existing model test patterns:

```ts
test("parse fills defaults for missing fields", () => {
  const config = Config.parse({})
  expect(config.provider).toBe("openrouter")
})
```

### Integration tests

Follow the existing parameterized pattern:

```ts
configRepositoryTests("Stub", () => ({
  repo: createConfigRepository(createStubKVStore(), createStubCipher()),
  teardown: () => {},
}))
```

Tests cover:
- load/save config round-trip
- load/save secrets round-trip
- save overwrites previous data
- load returns deep copies (mutation isolation)
- persistence: save → new repo instance → load
- secrets are encrypted at rest
- corrupted encrypted blob returns defaults (garbled `kvStore.get('secrets')` → `Secrets.parse({})`)

## Open questions

None.

## Out of scope

- Setup repository refactor
- Automatic data migration from old storage locations
- `onDidChange` / watching support in KVStore
