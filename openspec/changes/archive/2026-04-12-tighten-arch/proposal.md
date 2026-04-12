## Why

The codebase currently allows cross-module imports through both `index.ts` and `types.ts`, creating a dual-barrel pattern that weakens architectural boundaries. With the planned move to rich model classes, this split becomes unnecessary for models and introduces friction. For repositories and plugins, the current `index.ts` re-exports concrete implementations alongside contracts, making it impossible to enforce that consumers depend only on abstractions. Tightening to a single `index.ts` public surface — with `types.ts` retained only where circular dependencies require it — simplifies the import model and makes boundary violations immediately visible through linting.

## What Changes

- **Switch eslint-plugin-unslop to local version** from `../eslint-plugin-unslop` which already implements stricter public-surface enforcement (index-only cross-module imports, with `types.ts` allowed only for contract interfaces)
- **Models: merge `types.ts` into `index.ts`** — Models are dependency-graph leaves with no circular dependency risk. All type definitions move into `index.ts`, `types.ts` files are deleted. **BREAKING** for any consumer importing from `@/models/*/types`
- **Repositories: contract-only `index.ts`** — Repository `index.ts` re-exports only the contract interface from `types.ts`. Concrete implementation imports (e.g. `createSqliteVacancyRepository`) move to direct submodule imports in the app wiring layer. **BREAKING** for any consumer importing implementations from `@/repositories/*/index`
- **Plugins without factories: contract-only `index.ts`** — Same pattern as repositories. `index.ts` re-exports only the interface from `types.ts`
- **Plugins with factories: extract `create.ts`** — Factory functions with runtime provider selection (e.g. `createLlmClient`) move from `index.ts` to a new `create.ts` file that imports from `types.ts` and implementation submodules. Only the app layer imports `create.ts`. Applies to `plugins/llm`, `plugins/commute`, `plugins/browser`
- **Update all import sites** across services, app, and UI layers to match new surface conventions
- **Update `AGENTS.md`** to document the new import conventions

## Capabilities

### New Capabilities

- `module-export-surfaces`: Defines which files constitute a module's public surface, the rules for `index.ts` vs `types.ts` vs `create.ts`, and the per-module-kind export conventions (models, repositories, plugins-without-factory, plugins-with-factory)

### Modified Capabilities

- `dependency-boundaries`: Tightening cross-module import rule from "index.ts or types.ts" to "index.ts only" for value and type imports, with types.ts retained only as an internal contract file within modules that have interface/implementation splits
- `linting-policy`: Updating eslint config to use local `eslint-plugin-unslop` from `../eslint-plugin-unslop` and configuring stricter public-surface enforcement rules

## Impact

- **Source files**: Every `types.ts` in `src/models/` (5 files) is deleted and merged into `index.ts`. Every `index.ts` in `src/repositories/` and `src/plugins/` is narrowed to contract-only re-exports. New `create.ts` files added in 3 plugin modules.
- **Import sites**: All files importing from `@/models/*/types`, `@/repositories/*/index` (for implementations), or `@/plugins/*/index` (for factories) need import path updates. The app wiring layer gains direct submodule imports.
- **ESLint config**: `eslint.config.ts` (or `.mjs`) updated to reference local unslop plugin with stricter surface rules.
- **Dependencies**: `package.json` updated to reference local `eslint-plugin-unslop` instead of npm version.
- **Documentation**: `AGENTS.md` imports section updated to reflect new conventions.
