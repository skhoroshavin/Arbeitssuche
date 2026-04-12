## MODIFIED Requirements

### Requirement: Unslop full rule set as baseline

The project MUST use `unslop.configs.full` from the local `eslint-plugin-unslop` package (resolved via `file:../eslint-plugin-unslop`) as the ESLint baseline, enabling `import-control`, `export-control`, `no-false-sharing`, and `read-friendly-order`.

#### Scenario: Full rule set is active

- **WHEN** ESLint runs on any file under `src/`
- **THEN** all four unslop rules are evaluated

#### Scenario: Local plugin is used

- **WHEN** `package.json` is inspected
- **THEN** `eslint-plugin-unslop` SHALL resolve to `file:../eslint-plugin-unslop`
- **AND** the local plugin's `import-control` rule SHALL enforce configurable entrypoints

## ADDED Requirements

### Requirement: Default entrypoints enforce index-only imports

The unslop architecture config SHALL rely on the default `entrypoints: ['index.ts']` for all modules. No per-module `entrypoints` overrides SHALL be declared. The `import-control` rule SHALL reject cross-module imports targeting any file other than `index.ts`.

#### Scenario: No entrypoints overrides in config

- **WHEN** a developer reads the architecture config in `eslint.config.ts`
- **THEN** no module declaration SHALL contain an `entrypoints` property

#### Scenario: Cross-module import of types.ts is rejected

- **WHEN** a file in `services/*` imports from `@/plugins/llm/types`
- **THEN** ESLint SHALL report an `unslop/import-control` error because `types.ts` is not in the default entrypoints

#### Scenario: Cross-module import of index.ts is accepted

- **WHEN** a file in `services/*` imports from `@/plugins/llm`
- **THEN** the import SHALL be accepted because `index.ts` is the default entrypoint
