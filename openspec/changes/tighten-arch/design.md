## Context

The codebase enforces architectural boundaries via `eslint-plugin-unslop`'s `import-control` rule. Currently, cross-module imports are allowed through both `index.ts` and `types.ts`. The published npm version of unslop treats both files as implicit public entrypoints. A local fork at `../eslint-plugin-unslop` has already implemented configurable entrypoints — defaulting to `index.ts` only — so `types.ts` is no longer implicitly allowed unless explicitly configured.

The current dual-barrel pattern creates three problems:
1. Models export types from `types.ts` and runtime values from `index.ts`, forcing consumers to know which file has what. With the planned move to rich model classes this distinction vanishes.
2. Repository and plugin `index.ts` files re-export concrete implementations alongside contracts, meaning any consumer can depend on implementations rather than abstractions.
3. Factory plugins (llm, commute, browser, job-site) have `index.ts` importing from implementation submodules that import from `types.ts` — if we naively merge everything into `index.ts`, these become circular.

## Goals / Non-Goals

**Goals:**

- Single public surface per module: `index.ts` is the only cross-module import target
- Models have no `types.ts` — all exports merge into `index.ts`
- Repositories and plugins expose only contract interfaces through `index.ts`, re-exported from an internal `types.ts`
- Factory plugins isolate runtime-selection logic in `create.ts`, imported only by the app wiring layer
- ESLint enforces the new surface rules via the local unslop plugin's configurable entrypoints
- All existing tests continue to pass

**Non-Goals:**

- Converting models to rich classes (separate effort that benefits from this change)
- Adding `export-control` contracts (the rule stays enabled but inert)
- Changing the layer dependency graph itself — only the entrypoint convention changes
- Restructuring UI modules (they don't use `types.ts` today)

## Decisions

### 1. Use local `eslint-plugin-unslop` from `../eslint-plugin-unslop`

The local fork already implements configurable `entrypoints` per module in the `import-control` rule. Default entrypoints are `['index.ts']`, meaning `types.ts` is rejected unless explicitly listed. This is the enforcement mechanism for the entire change.

**Alternative considered:** Patch the published npm package. Rejected because the local fork already has the feature and is under active development. A file-path dependency (`"eslint-plugin-unslop": "file:../eslint-plugin-unslop"`) keeps the coupling explicit.

**Config change:** In `eslint.config.ts`, the `import` statement stays the same but resolves to the local package. No `entrypoints` config is needed for modules that should only expose `index.ts` (that's the default). Modules that need `types.ts` as a valid entrypoint for internal submodules (repositories, plugins) get `entrypoints: ['index.ts', 'types.ts']` — but only for sibling modules within the same layer that implement the interface.

**Important nuance:** The `entrypoints` config controls what other modules are allowed to import. Repository and plugin submodules (e.g. `repositories/vacancy/sqlite`) import from their parent's `types.ts` — this is a same-module relative import (`./types.js`), not a cross-module import, so `import-control` does not restrict it. Cross-module consumers (services, app) can only import through `index.ts`.

### 2. Models: merge `types.ts` into `index.ts`

All 5 model modules (`vacancy`, `applicant`, `config`, `secrets`, `job-search`) have `types.ts` files containing only type definitions. Models are leaf nodes — nothing within a model module implements an interface defined in that module. No circular dependency risk.

**Action:** Move all type exports from `types.ts` to `index.ts`, delete `types.ts`, update all import sites from `@/models/*/types` to `@/models/*`.

**Ordering within `index.ts`:** Types go at the top, before runtime exports. This follows the existing convention where `import type` precedes runtime imports.

**Import site count (approximate):**
- `models/vacancy/types` — used across services, repositories, UI (~20+ sites)
- `models/applicant/types` — used across services, repositories, UI (~15+ sites)
- `models/config/types` — used across app, services, models/applicant (~10+ sites)
- `models/secrets/types` — used in app, services (~5 sites)
- `models/job-search/types` — used in services, app (~10+ sites)

### 3. Repositories: contract-only `index.ts`

Each repository module's `index.ts` currently re-exports concrete implementations (e.g. `createSqliteVacancyRepository`, `createStubVacancyRepository`). After this change, `index.ts` re-exports only the contract interface from `types.ts`.

**Before:**
```ts
// repositories/vacancy/index.ts
export { createStubVacancyRepository } from "./stub"
export { createSqliteVacancyRepository } from "./sqlite"
```

**After:**
```ts
// repositories/vacancy/index.ts
export type { VacancyRepository, VacancyListOutput } from "./types.js"
```

**Consumer migration:**
- Services already import from `@/repositories/*/types` — these change to `@/repositories/*` (the index)
- `src/app/index.ts` is the only file importing concrete implementations — these change to direct submodule imports: `@/repositories/vacancy/sqlite`, `@/repositories/applicant/sqlite`, `@/repositories/job-search/sqlite`
- Test files that import stubs change to: `@/repositories/*/stub`

**Alternative considered:** Keep implementations in `index.ts` and let all consumers import everything. Rejected because it defeats the purpose of separating contract from implementation — services should never depend on which database backend is in use.

### 4. Plugins without runtime selection: contract-only `index.ts`

Same pattern as repositories. `index.ts` re-exports only the interface from `types.ts`. Concrete implementations are imported directly by the app layer.

**Applies to:** `plugins/fetch`, `plugins/pdf-renderer`

`plugins/fetch/index.ts` currently exports only `createStubFetch`. After: `index.ts` re-exports `type { Fetch }` from `types.ts`. Stub is imported directly in tests.

`plugins/pdf-renderer/index.ts` currently exports `createElectronPdfRenderer` and `createStubPdfRenderer`. After: `index.ts` re-exports `type { PdfRenderer }` from `types.ts`. Implementations imported directly by app layer and tests.

### 5. Plugins with runtime selection: extract `create.ts`

Four plugin modules have factory functions that import all implementations and perform runtime selection: `llm`, `commute`, `browser`, `job-site`.

**Pattern:**
- `types.ts` — contract interfaces (unchanged)
- `index.ts` — re-exports types from `types.ts` only
- `create.ts` — factory functions with runtime selection, imports from `types.ts` and implementation submodules

**Plugin-specific details:**

**`plugins/llm`:**
- `create.ts` gets: `createLlmClient`, `createLlmClientForPing`, `createModelRegistry`, `getLlmProviders`
- Consumers: `app/index.ts`, `app/ipc-settings.ts`

**`plugins/commute`:**
- `create.ts` gets: `createCommuteClient`, `getCommuteProviders`
- Direct implementation exports (`createStubCommuteClient`, `createGoogleMapsCommuteClient`) stay in their submodules, imported directly by tests and app
- Consumers: `app/ipc-settings.ts`, `app/index.ts`

**`plugins/browser`:**
- `create.ts` gets: `createElectronBrowser`, `createPlaywrightBrowser`
- `createStubBrowser` stays in its submodule, imported directly by tests
- Consumers: `app/crawl-manager.ts`, integration tests

**`plugins/job-site`:**
- `create.ts` gets: `createJobSite`, `getJobSiteInfos`, `getJobSiteNames`
- Consumers: `app/crawl-manager.ts`, `app/ipc-settings.ts`, `app/index.ts`

**Alternative considered:** Keep factories in `index.ts`. Rejected because `index.ts` would then import from implementation submodules that import from `types.ts` — if `index.ts` also re-exports from `types.ts`, the module's internal dependency graph becomes fragile. Separating `create.ts` makes the dependency flow explicit: `create.ts → types.ts + implementations`, `index.ts → types.ts`.

### 6. ESLint architecture config: no `entrypoints` overrides needed

Since the local unslop plugin defaults to `entrypoints: ['index.ts']`, and cross-module imports should only go through `index.ts`, no per-module `entrypoints` overrides are needed in the architecture config. Same-module relative imports (`./types.js` within a repository or plugin) are not subject to `import-control`'s entrypoint check.

The only config change is updating `package.json` to point `eslint-plugin-unslop` at the local fork and ensuring the build of the local plugin is up to date.

### 7. Test files are excluded from `import-control`

The current ESLint config already ignores test files (`**/*.test.ts`, `**/*.test-suite.ts`, `**/*.integration-test.ts`) from the architecture rules. Test files can import from `types.ts`, `create.ts`, implementation submodules, or any other internal path. No test import changes are strictly required, but we'll update them for consistency where practical.

## Risks / Trade-offs

**[Risk] Large import churn across the codebase** → Mitigation: Migrate one module kind at a time (models → repositories → plugins-without-factory → plugins-with-factory), running `npm run verify` and `npm test` after each step. Each step is independently shippable.

**[Risk] Local unslop plugin not built / out of sync** → Mitigation: Add a `preinstall` or `prepare` script, or document that `npm run build` must be run in `../eslint-plugin-unslop` before `npm install` in this project. The `file:` dependency resolves to the built output.

**[Risk] `plugins/job-site` submodules import from parent's `types.ts` via aliased path** → Mitigation: Currently they use `@/plugins/job-site/types.js` which is a cross-module import in unslop's view (same module matcher `plugins/*` but aliased). Verify that `import-control` treats `plugins/job-site/arbeitsagentur` importing from `plugins/job-site/types.ts` as a same-module import (both match `plugins/*`). If not, these need to switch to relative imports (`../types.js`).

**[Risk] `services/*` currently import from `@/plugins/job-site/types.js` and `@/repositories/*/types.js`** → After this change, services must import from `@/plugins/job-site` and `@/repositories/*` (the index). Since `index.ts` will re-export everything from `types.ts`, this is a path-only change with no runtime impact.

**[Trade-off] `types.ts` still exists in repositories and plugins** — This is necessary to break circular dependencies. The file is internal to the module; cross-module consumers never see it. The naming convention is consistent and documented.

**[Trade-off] `create.ts` is a new convention** — Adds a third file to the module surface (alongside `index.ts` and `types.ts`), but only for 4 plugin modules. The alternative (keeping factories in `index.ts`) creates circular import risk.
