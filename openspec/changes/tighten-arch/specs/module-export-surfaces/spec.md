## ADDED Requirements

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

### Requirement: Repository index.ts exports only the contract interface

Repository modules (`repositories/*`) SHALL have an `index.ts` that re-exports only the contract interface and related types from `types.ts`. Concrete implementation factories (e.g. `createSqliteVacancyRepository`) SHALL NOT be exported from `index.ts`.

#### Scenario: Service imports repository contract

- **WHEN** a service needs the repository interface (e.g. `VacancyRepository`)
- **THEN** it SHALL import from `@/repositories/<module>` (the `index.ts` surface)
- **AND** the import resolves to the contract interface, not a concrete implementation

#### Scenario: App layer imports concrete repository implementation

- **WHEN** the app wiring layer needs a concrete repository (e.g. `createSqliteVacancyRepository`)
- **THEN** it SHALL import directly from the implementation submodule (e.g. `@/repositories/vacancy/sqlite`)
- **AND** it SHALL NOT import the implementation from `@/repositories/vacancy`

### Requirement: Repository types.ts defines the contract interface

Repository modules SHALL retain `types.ts` as an internal file defining the contract interface. `types.ts` SHALL be importable by sibling submodules within the same repository (e.g. `sqlite/index.ts` importing `../types.js`) but SHALL NOT be importable cross-module.

#### Scenario: Repository submodule imports contract from types.ts

- **WHEN** `repositories/vacancy/sqlite/index.ts` needs the `VacancyRepository` interface
- **THEN** it SHALL import from `../types.js` (relative, same-module)

#### Scenario: Cross-module import of repository types.ts is rejected

- **WHEN** a file in `services/*` attempts to import from `@/repositories/vacancy/types`
- **THEN** the linter SHALL report an `unslop/import-control` error

### Requirement: Plugin index.ts exports only the contract interface

Plugin modules (`plugins/*`) without factory functions SHALL have an `index.ts` that re-exports only the contract interface from `types.ts`. Concrete implementations SHALL NOT be exported from `index.ts`.

#### Scenario: Service imports plugin contract

- **WHEN** a service needs the plugin interface (e.g. `Fetch`, `PdfRenderer`)
- **THEN** it SHALL import from `@/plugins/<module>` (the `index.ts` surface)

#### Scenario: App layer imports concrete plugin implementation

- **WHEN** the app wiring layer needs a concrete plugin (e.g. `createElectronPdfRenderer`)
- **THEN** it SHALL import directly from the implementation submodule (e.g. `@/plugins/pdf-renderer/electron`)

### Requirement: Plugin types.ts defines the contract interface

Plugin modules SHALL retain `types.ts` as an internal file defining the contract interface. The same cross-module restriction as repositories applies.

#### Scenario: Plugin submodule imports contract from types.ts

- **WHEN** `plugins/llm/openrouter/index.ts` needs the `LlmClient` interface
- **THEN** it SHALL import from `../types.js` (relative, same-module)

#### Scenario: Cross-module import of plugin types.ts is rejected

- **WHEN** a file in `services/*` attempts to import from `@/plugins/llm/types`
- **THEN** the linter SHALL report an `unslop/import-control` error

### Requirement: Factory plugins isolate runtime selection in create.ts

Plugin modules with factory functions that perform runtime provider selection SHALL place those factories in a `create.ts` file. `create.ts` SHALL import from `types.ts` and implementation submodules. Only the app wiring layer SHALL import from `create.ts`.

#### Scenario: Factory function lives in create.ts

- **WHEN** a plugin has a factory with runtime selection (e.g. `createLlmClient` switching on provider string)
- **THEN** that factory SHALL be defined in `<plugin>/create.ts`
- **AND** `<plugin>/index.ts` SHALL NOT contain or re-export the factory

#### Scenario: App layer imports factory from create.ts

- **WHEN** the app wiring layer needs to create a plugin instance with runtime selection
- **THEN** it SHALL import from `@/plugins/<module>/create` (e.g. `@/plugins/llm/create`)

#### Scenario: Service does not import from create.ts

- **WHEN** a service needs a plugin interface
- **THEN** it SHALL import only from `@/plugins/<module>` (the `index.ts` surface)
- **AND** it SHALL NOT import from `@/plugins/<module>/create`

### Requirement: Factory plugin classification

The following plugin modules SHALL be treated as factory plugins (having `create.ts`): `plugins/llm`, `plugins/commute`, `plugins/browser`, `plugins/job-site`. The following plugin modules SHALL be treated as contract-only plugins (no `create.ts`): `plugins/fetch`, `plugins/pdf-renderer`.

#### Scenario: Factory plugins have create.ts

- **WHEN** a developer inspects `plugins/llm`, `plugins/commute`, `plugins/browser`, or `plugins/job-site`
- **THEN** each SHALL contain `index.ts`, `types.ts`, and `create.ts`

#### Scenario: Contract-only plugins have no create.ts

- **WHEN** a developer inspects `plugins/fetch` or `plugins/pdf-renderer`
- **THEN** each SHALL contain `index.ts` and `types.ts` but no `create.ts`

### Requirement: index.ts is the single cross-module public surface

For all module kinds (models, repositories, plugins, services), `index.ts` SHALL be the only file importable by other modules. `types.ts` and `create.ts` SHALL be internal files that are not valid cross-module import targets.

#### Scenario: Cross-module import through index.ts succeeds

- **WHEN** a file in `services/*` imports from `@/models/vacancy`
- **THEN** the import resolves to `models/vacancy/index.ts` and is accepted

#### Scenario: Cross-module import through types.ts is rejected

- **WHEN** a file in `services/*` imports from `@/models/vacancy/types`
- **THEN** the linter SHALL report an error

#### Scenario: Cross-module import through create.ts is rejected for non-app layers

- **WHEN** a file in `services/*` imports from `@/plugins/llm/create`
- **THEN** the linter SHALL report an error

#### Scenario: App layer import through create.ts is accepted

- **WHEN** a file in `app/*` imports from `@/plugins/llm/create`
- **THEN** the import SHALL be accepted because `app/*` is allowed to import from `plugins/*` submodules
