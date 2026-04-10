## Context

The repository currently uses two separate tools for architecture enforcement: ESLint (with `eslint-plugin-unslop@0.2.x` in partial mode) and dependency-cruiser (`.dependency-cruiser.cjs` as the actual boundary source of truth). These overlap, diverge over time, and require maintaining two configs. `eslint-plugin-unslop@0.4.0` now has the rule coverage needed to fully replace dependency-cruiser.

The migration touches tooling, config, and source structure. Because boundary rules change at the ESLint level while source files are simultaneously reshaped, sequencing matters.

## Goals / Non-Goals

**Goals:**

- Replace `.dependency-cruiser.cjs` entirely with `unslop/import-control` in `eslint.config.ts`
- Adopt `unslop.configs.full` as the baseline (enables `import-control`, `export-control`, `no-false-sharing`, `read-friendly-order`)
- Achieve zero lint errors under the full unslop rule set with the target architecture config
- Clean up source structure so module ownership is unambiguous (no loose root-level helpers in `models/`, `plugins/`, `services/`)
- Flatten `app/ipc-handlers/` into `app/` to eliminate the bidirectional module dependency

**Non-Goals:**

- Declaring `exports` contracts in `export-control` — deferred until after the migration is stable
- Changing any runtime behavior
- Upgrading unrelated dependencies beyond what `eslint-plugin-unslop@0.4.0` requires

## Decisions

### D1: Use `unslop.configs.full` as the baseline, not `configs.minimal`

`configs.minimal` enables only `read-friendly-order`. `configs.full` enables all four rules. Starting from `full` means we land on the target state in one step rather than incrementally enabling rules. Repo-specific overrides (e.g. suppressing a rule for a file) go in `eslint.config.ts` on top of the baseline.

### D2: Architecture config lives inline in `eslint.config.ts`, not in a separate file

The unslop architecture block is readable TypeScript and benefits from being co-located with the rest of the ESLint config. A separate JSON/YAML file adds indirection with no real benefit at this codebase size.

### D3: Flatten `app/ipc-handlers/` into `app/` rather than extracting `AppServices` types

The submodule imports `AppServices` from `@/app/index.js` (an alias import), which unslop's shallow-relative-entrypoint bypass does not cover. The alternative — extracting types into a shared leaf (`app/types.ts`) — does not resolve the issue because the alias import from a child submodule to a parent module still requires explicit permission. Flattening eliminates the `app` ↔ `app/*` bidirectionality without any architecture config workaround.

Renamed files use an `ipc-` prefix to preserve discoverability:

| Old path | New path |
|---|---|
| `app/ipc-handlers/index.ts` | `app/ipc-handlers.ts` |
| `app/ipc-handlers/applicants.ts` | `app/ipc-applicants.ts` |
| `app/ipc-handlers/crawl.ts` | `app/ipc-crawl.ts` |
| `app/ipc-handlers/job-searches.ts` | `app/ipc-job-searches.ts` |
| `app/ipc-handlers/settings.ts` | `app/ipc-settings.ts` |
| `app/ipc-handlers/vacancies.ts` | `app/ipc-vacancies.ts` |
| `app/ipc-handlers/utilities.ts` | `app/ipc-utilities.ts` |

All `@/app/index.js` and `@/app/crawl-manager.js` alias imports inside the moved files become same-module relative imports (`./index.js`, `./crawl-manager.js`). `app/ipc.ts` re-export path updates from `./ipc-handlers` to `./ipc-handlers.js`.

### D4: Source reshaping is prerequisite to enabling the full rule set

Enabling `import-control` with the target architecture before fixing root-level loose files (e.g. `models/utilities.ts`, `plugins/stub-utilities.ts`) would produce lint errors on unchanged files. The sequencing is: reshape source → update ESLint config → remove dependency-cruiser. This keeps `npm run verify` green at each step.

### D5: `repositories/*` does not depend on `plugins/*`

The current dependency-cruiser config allowed this; no actual file in `src/repositories/` imports from `src/plugins/`. The unslop architecture omits it, tightening the boundary without breaking anything.

### D6: `ui` and `ui/pages` require no explicit architecture entries

Unslop's `import-control` allows any `./something` relative import that is shallow (max one level deep) and targets a public entrypoint (`index.ts`/`types.ts`). This covers `ui/app.tsx → ./layout` and `ui/app.tsx → ./pages`, and `ui/pages/index.ts → ./applicant` etc., without declaring a `"ui"` or `"ui/pages"` entry.

## Risks / Trade-offs

**Risk: source reshape and ESLint migration touch many files simultaneously**
→ Mitigation: execute as a sequence of small, independently-verifiable steps (reshape one module group, run lint, proceed). Tasks are ordered accordingly.

**Risk: `no-false-sharing` false positives on `utils` and `ui/components` during reshape**
→ Mitigation: `utils` and `ui/components` are declared `shared: true`. The rule fires only if a shared entrypoint is used by fewer than two consumers. During the transition, temporarily suppress only if a symbol genuinely has two consumers that simply haven't been wired yet.

**Risk: `export-control` blocks new exports during the migration**
→ Mitigation: `export-control` is inert unless an `exports` pattern array is declared on the module. Since no `exports` contracts are added in this phase, the rule produces no errors.

**Risk: test files violate `import-control` (e.g. importing internals for testing)**
→ Mitigation: ESLint config applies the architecture only to `src/**` production files, not test files, consistent with existing conventions.

## Migration Plan

1. **Flatten `app/ipc-handlers/`** — move and rename files, update imports, verify build and E2E tests pass.
2. **Reshape `models/`** — move `events.ts` → `models/progress/index.ts`, move `utilities.ts` to appropriate target, keep `models/index.ts` as aggregator only.
3. **Reshape `plugins/`** — move `stub-utilities.ts` → `utils/`, move `page-utilities/` → `plugins/job-site/utils/`.
4. **Reshape `services/`** — move `asserts.ts` into a named submodule or `utils/`.
5. **Update `eslint.config.ts`** — replace old unslop config with `unslop.configs.full` + architecture block.
6. **Remove dependency-cruiser** — remove `.dependency-cruiser.cjs`, remove `depcruise`-based scripts from `package.json`, uninstall the package.
7. **Update specs and docs** — update `openspec/specs/dependency-boundaries/spec.md`, create `openspec/specs/linting-policy/spec.md`, update `AGENTS.md`.

Rollback: all steps are committed independently. Reverting any step leaves the repo in a valid intermediate state (lint may emit errors on the partially-migrated config, but the build is unaffected).

## Resolved Questions

- `src/models/utilities.ts`: `arrayToString` and `stringToArray` are pure string↔array converters with no domain semantics. The sole consumer is `ui/pages/applicant/hooks/applicant-form.ts`, which reaches them via the public `@/models/index` surface. Move to `src/utils/`; update `models/index.ts` to drop the re-export and update the one consumer's import path.
- `src/services/asserts.ts`: `ensureLlmAvailable` imports `LlmClient` from `plugins/llm/types` and is used by exactly two services (`job-consultant` and `cover-letter-writer`). Not generic enough for `utils/`. Move to `src/services/llm/index.ts` as a shared services-level LLM support module.
