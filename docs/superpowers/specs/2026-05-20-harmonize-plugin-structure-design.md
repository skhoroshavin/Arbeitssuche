# Harmonize Plugin Structure

## Problem

Several structural inconsistencies across `src/plugins/`:

1. **`types.ts` inconsistency** — some plugins define interfaces in `types.ts`, others in `index.ts`. The simpler pattern (interfaces directly in `index.ts`) should be the default; `types.ts` only when the type surface is large.
2. **`job-site/types.ts`** — mixes public contract types with site-specific JSON-LD types (`JobPostingJsonLd`, `JobPostingAddress`) that belong in xing/ and dm/ respectively.
3. **`plugins/fetch/`** — only a type alias + test stub, with no production implementation. The type can live at its sole consumer (arbeitsagentur), and `FetchStub` belongs in utils.
4. **`plugins/openai-compatible/`** — lives as a sibling of `plugins/llm/` at the root plugins level, while its tests live under `plugins/llm/openai-compatible/` behind a thin re-export wrapper. Move the source into `plugins/llm/openai-compatible/`, merge with the wrapper, and upgrade `LlmProviderInfo` / `CommuteProviderInfo` to full provider interfaces with factory methods (`createClient`, `createModelRegistry`, `ping`).
5. **Plugin-level test naming** — inconsistency between `.test.ts` and `.integration-test.ts`; plugin-level tests should be `integration.test.ts`.
6. **Stale stub tests** — `pdf-renderer` test only exercises the stub (delete it); `commute` test only exercises the stub (replace with real integration test calling Google Maps API).

## Design

### 1. Update AGENTS.md

**Public surfaces rule** — replace:

> **Public surfaces:** Cross-module imports must go through `index.ts`. `types.ts` is an internal contract file for repositories and plugins — do not import it cross-module.

with:

> **Public surfaces:** Cross-module imports must go through `index.ts`. Prefer defining interfaces directly in `index.ts`; extract to a separate file only when the type surface is large enough to hurt readability.

**Test suffix convention** — replace:

> Test suffixes: `.test.ts`, `.test.tsx`, `.test-suite.ts`, `.integration-test.ts`.

with:

> Test suffixes: `.test.ts`, `.test.tsx`, `.test-suite.ts`.

Update `vitest.integration.config.ts` include pattern from `src/plugins/job-site/*.integration-test.ts` to `src/plugins/**/integration.test.ts`. This adopts the new suffix convention and broadens the scope to cover integration tests across all plugins (commute, llm, etc.).

### 2. Inline and delete `types.ts` files

| Plugin | Action |
|---|---|
| **fetch** | Dissolve the plugin entirely (see §3). |
| **pdf-renderer** | Inline `PdfRenderer` interface into `index.ts`, delete `types.ts`. |
| **browser** | Inline `Browser`, `Page`, `OpenPageOptions` into `index.ts`, delete `types.ts`. |
| **commute** | Inline all interfaces into `index.ts`, delete `types.ts`. |
| **llm** | Inline all interfaces (including `TypedSchema`, `LlmClient`, `LlmModelRegistry`, `LlmModelInfo`, `LlmPricing`, `LlmProviderInfo`) into `index.ts`, delete `types.ts`. |
| **job-site** | Inline public types into `index.ts`; move `JobPostingJsonLd` and `JobPostingAddress` into xing/ and dm/ as site-local types (the similarity is coincidental, not a shared contract). Delete `types.ts`. Remove `JobPostingJsonLd` export from `index.ts`. |
| **cipher** | No change (already correct). |
| **kvstore** | No change (already correct). |

Each inlined interface becomes a re-exported or non-exported symbol in `index.ts`, matching the pattern cipher/kvstore already use. Only types that are part of the cross-module public surface get `export`; internal types stay non-exported.

### 3. Dissolve `plugins/fetch/`

The `Fetch` type alias has a single consumer (`arbeitsagentur`), and `FetchStub` is test infrastructure used by two test files.

- Move the `Fetch` type alias inline into `src/plugins/job-site/arbeitsagentur/index.ts` (remove the import from `@/plugins/fetch`).
- Move `FetchStub` class into `src/utils/http-stub.ts` (alongside `HttpStub` which it already extends). Export from `src/utils/index.ts`.
- Delete `src/plugins/fetch/types.ts` and `src/plugins/fetch/stub/index.ts` and the `src/plugins/fetch/` directory.
- Update imports in `src/plugins/commute/google-maps/index.test.ts` and `src/plugins/job-site/arbeitsagentur/index.test.ts` to import `FetchStub` from `@/utils`.

### 4. Move `openai-compatible` into `plugins/llm/` and upgrade to provider objects

Currently `plugins/openai-compatible/` (source) and `plugins/llm/openai-compatible/` (thin re-export + tests) are separate directories. Move the source files (`index.ts`, `strict-schema.ts`) from `plugins/openai-compatible/` into `plugins/llm/openai-compatible/`, merging the two `index.ts` files. The re-export wrapper disappears — the implementation and its tests now live together.

Then introduce the `LlmProvider` interface that bundles metadata + client creation + model registry:

```ts
interface LlmProvider {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly instructions: string
  createClient(apiKey: string, model: string): LlmClient
  createModelRegistry(): LlmModelRegistry
  ping(apiKey: string): Promise<boolean>
}
```

- `OpenRouterProvider` and `RequestyProvider` become provider objects implementing `LlmProvider`. They delegate to the (now-co-located) `openai-compatible` utility functions internally.
- The existing `LlmProviderInfo` interface is replaced by `LlmProvider` (which includes the old fields plus factory methods). `LlmProviderInfo` is preserved as `Pick<LlmProvider, "id" | "name" | "description" | "instructions">` for the serializable subset sent over IPC.
- The existing `createLlmClient`, `createLlmClientForPing`, `createModelRegistry`, and `getLlmProviders` functions in `llm/index.ts` are replaced by a registry/routing that dispatches by provider ID to an `LlmProvider` instance.
- `normalizeNestedPricing` and `normalizeFlatPricing` stay as internal utilities — consumer code never calls them directly.
- Delete the now-empty `plugins/openai-compatible/` directory.

### 5. Convert `CommuteProviderInfo` to `CommuteProvider` interface

Parallel to the LLM change:

```ts
interface CommuteProvider {
  readonly id: string
  readonly name: string
  readonly instructions: string
  createClient(apiKey: string): CommuteClient
  ping(apiKey: string): Promise<boolean>
}
```

- `GoogleMapsCommuteProvider` implements `CommuteProvider` — bundles metadata + client creation + ping.
- The `createCommuteClient` dispatch function and `getCommuteProviders()` are replaced by a registry that holds `CommuteProvider` instances.
- `CommuteProviderInfo` is absorbed into `CommuteProvider`.

### 6. Plugin-level test naming and quality

Rename convention: `.integration-test.ts` → `.integration.test.ts`.

| Current | New |
|---|---|
| `commute/commute.test.ts` | `commute/integration.test.ts` |
| `pdf-renderer/pdf-renderer.test.ts` | (delete — stub-only test adds no value) |
| `job-site/index.integration-test.ts` | `job-site/integration.test.ts` |

The commute integration test should call the real Google Maps API. API key loaded from `process.env.GOOGLE_MAPS_API_KEY` (available via `.env` locally and CI env vars). Test should be skipped if the key is absent.

### 7. No other structural changes

The organic variation in subdirectory naming (electron/stub vs. google-maps/stub, etc.) reflects real backend differences and is appropriate.

## Out of Scope

- Simplifying or merging cipher/kvstore (they are "done" and already follow the right pattern)
- Any changes to plugin subdirectory layout or factory patterns beyond what's described above