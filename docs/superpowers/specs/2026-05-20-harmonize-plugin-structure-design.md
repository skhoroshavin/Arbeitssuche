# Harmonize Plugin Structure

## Problem

Several structural inconsistencies across `src/plugins/`:

1. **`types.ts` inconsistency** — some plugins define interfaces in `types.ts`, others in `index.ts`. The simpler pattern (interfaces directly in `index.ts`) should be the default; `types.ts` only when the type surface is large.
2. **`job-site/types.ts`** — mixes public contract types with site-specific JSON-LD types (`JobPostingJsonLd`, `JobPostingAddress`) that belong in xing/ and dm/ respectively.
3. **`plugins/fetch/`** — only a type alias + test stub, with no production implementation. The type can live at its sole consumer (arbeitsagentur), and `FetchStub` belongs in utils.
4. **`plugins/openai-compatible/`** — should become a proper provider class, and `LlmProviderInfo` / `CommuteProviderInfo` should be upgraded to full provider interfaces.
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

> Test suffixes: `.test.ts`, `.test.tsx`, `.test-suite.ts`, `.integration.test.ts`.

Update `vitest.integration.config.ts` include pattern from `*.integration-test.ts` to `*.integration.test.ts`.

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

### 4. Convert `openai-compatible` to a provider class

Create an `OpenAICompatibleProvider` class that bundles metadata + client creation + model registry:

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

- `OpenAICompatibleProvider` extends this interface with `baseUrl` and config-based construction. OpenRouter and Requesty become thin subclasses or instances that set `baseUrl`, `providerName`, and pricing normalization.
- The existing `LlmProviderInfo` interface is replaced by `LlmProvider` (which includes the old fields plus factory methods).
- The existing `createLlmClient`, `createLlmClientForPing`, `createModelRegistry`, and `getLlmProviders` functions in `llm/index.ts` are replaced by a registry/routing that dispatches by provider ID to an `LlmProvider` instance.
- `normalizeNestedPricing` and `normalizeFlatPricing` become methods or stay as utilities internally — consumer code never calls them directly.

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