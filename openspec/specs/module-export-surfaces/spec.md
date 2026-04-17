# module-export-surfaces Specification

## Purpose

Defines module public export surfaces so cross-module imports stay stable, contract-first, and lint-enforceable.

## Requirements

### Requirement: Model modules export everything from index.ts

Model modules (`models/*`) SHALL export all types and runtime values from `index.ts`. Model modules SHALL NOT have a `types.ts` file. All type definitions previously in `types.ts` SHALL be moved into `index.ts`.

#### Scenario: Model module has no types.ts

- **WHEN** a developer inspects any model module directory (`models/vacancy`, `models/applicant`, `models/config`, `models/secrets`, `models/job-search`)
- **THEN** only `index.ts` exists as the public surface
- **AND** no `types.ts` file is present

#### Scenario: Consumer imports model types

- **WHEN** a file needs a type from a model module (e.g. `VacancyStatus`, `Applicant`, `AppConfig`)
- **THEN** it SHALL import from `@/models/<module>` (the `index.ts` surface)
- **AND** importing from `@/models/<module>/types` SHALL be rejected by the linter

### Requirement: Repository index.ts is the public surface

Repository modules (`repositories/*`) SHALL expose their public API from `index.ts`. That surface MAY include contract types, concrete factory functions, and testing helpers when they are intended for cross-module use.

#### Scenario: Service imports repository contract

- **WHEN** a service needs the repository interface (e.g. `VacancyRepository`)
- **THEN** it SHALL import from `@/repositories/<module>` (the `index.ts` surface)

#### Scenario: App layer imports concrete repository factory

- **WHEN** the app wiring layer needs a concrete repository (e.g. `createSqliteVacancyRepository`)
- **THEN** it SHALL import from `@/repositories/<module>`

### Requirement: Repository types.ts defines the contract interface

Repository modules SHALL retain `types.ts` as an internal file defining the contract interface. `types.ts` SHALL be importable by sibling submodules within the same repository (e.g. `sqlite/index.ts` importing `../types.js`) but SHALL NOT be importable cross-module.

#### Scenario: Repository submodule imports contract from types.ts

- **WHEN** `repositories/vacancy/sqlite/index.ts` needs the `VacancyRepository` interface
- **THEN** it SHALL import from `../types.js` (relative, same-module)

#### Scenario: Cross-module import of repository types.ts is rejected

- **WHEN** a file in `services/*` attempts to import from `@/repositories/vacancy/types`
- **THEN** the linter SHALL report an `unslop/import-control` error

### Requirement: Plugin index.ts is the public surface

Plugin modules (`plugins/*`) SHALL expose their public API from `index.ts`. That surface MAY include contract types, factories, and testing helpers when they are intended for cross-module use.

#### Scenario: Service imports plugin contract

- **WHEN** a service needs the plugin interface (e.g. `Fetch`, `PdfRenderer`)
- **THEN** it SHALL import from `@/plugins/<module>` (the `index.ts` surface)

#### Scenario: App layer imports plugin factory

- **WHEN** the app wiring layer needs a concrete plugin (e.g. `createElectronPdfRenderer`)
- **THEN** it SHALL import from `@/plugins/<module>`

### Requirement: Plugin types.ts defines the contract interface

Plugin modules SHALL retain `types.ts` as an internal file defining the contract interface. The same cross-module restriction as repositories applies.

#### Scenario: Plugin submodule imports contract from types.ts

- **WHEN** `plugins/llm/openrouter/index.ts` needs the `LlmClient` interface
- **THEN** it SHALL import from `../types.js` (relative, same-module)

#### Scenario: Cross-module import of plugin types.ts is rejected

- **WHEN** a file in `services/*` attempts to import from `@/plugins/llm/types`
- **THEN** the linter SHALL report an `unslop/import-control` error

### Requirement: Type-only access can be stricter than value access

When a module should depend only on another module's contract, the architecture config SHALL prefer `typeImports` from that module's `index.ts` instead of allowing general value imports.

#### Scenario: Service imports plugin type without value access

- **WHEN** a service only needs a plugin contract type
- **THEN** it SHALL import that type from `@/plugins/<module>`
- **AND** lint configuration MAY allow that access via `typeImports` while keeping value imports forbidden

### Requirement: Cross-module public surface is index.ts

For models, repositories, services, and plugins, `index.ts` SHALL be the only cross-module public entrypoint. `types.ts` SHALL remain internal and SHALL NOT be a valid cross-module import target.

#### Scenario: Cross-module import through index.ts succeeds

- **WHEN** a file in `services/*` imports from `@/plugins/llm`
- **THEN** the import resolves to `plugins/llm/index.ts` and is evaluated against that module policy

#### Scenario: Cross-module import through types.ts is rejected

- **WHEN** a file in `services/*` imports from `@/plugins/llm/types`
- **THEN** the linter SHALL report an error

#### Scenario: Cross-module import through create.ts is rejected

- **WHEN** a file in `services/*` imports from `@/plugins/llm/create`
- **THEN** the linter SHALL report an error
