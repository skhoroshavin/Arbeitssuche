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

### Requirement: Entrypoints enforce module public surfaces

The unslop architecture config SHALL rely on the default `entrypoints: ['index.ts']` for all modules except factory plugins. The factory plugin modules `plugins/llm`, `plugins/commute`, `plugins/browser`, and `plugins/job-site` SHALL declare `entrypoints: ['index.ts', 'create.ts']`. The `import-control` rule SHALL reject cross-module imports targeting any file outside the configured entrypoints for that module.

#### Scenario: Factory plugins declare create.ts entrypoint

- **WHEN** a developer reads the architecture config in `eslint.config.ts`
- **THEN** `plugins/llm`, `plugins/commute`, `plugins/browser`, and `plugins/job-site` SHALL declare `entrypoints: ['index.ts', 'create.ts']`
- **AND** other modules SHALL continue using the default `index.ts` entrypoint

#### Scenario: Cross-module import of types.ts is rejected

- **WHEN** a file in `services/*` imports from `@/plugins/llm/types`
- **THEN** ESLint SHALL report an `unslop/import-control` error because `types.ts` is not in the default entrypoints

#### Scenario: Cross-module import of index.ts is accepted

- **WHEN** a file in `services/*` imports from `@/plugins/llm`
- **THEN** the import SHALL be accepted because `index.ts` is the default entrypoint

#### Scenario: App import of create.ts is accepted for factory plugin

- **WHEN** a file in `app/*` imports from `@/plugins/llm/create`
- **THEN** the import SHALL be accepted because `create.ts` is configured as an entrypoint for `plugins/llm`
