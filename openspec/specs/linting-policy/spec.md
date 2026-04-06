# linting-policy Specification

## Purpose

Defines the ESLint configuration, unslop rule setup, and repository-specific linting conventions that enforce code quality and architectural boundaries.

## Requirements

### Requirement: Unslop full rule set as baseline

The project MUST use `unslop.configs.full` as the ESLint baseline, enabling `import-control`, `export-control`, `no-false-sharing`, and `read-friendly-order`.

#### Scenario: Full rule set is active

- **WHEN** ESLint runs on any file under `src/`
- **THEN** all four unslop rules are evaluated

### Requirement: Module-level import allow lists

The project MUST declare the following module-level import allow lists in the unslop architecture config:

- `utils` — may import (empty list, no internal dependencies)
- `models/*` — may import `models/*`
- `plugins/*` — may import `plugins/*`, `utils`
- `repositories/*` — may import `repositories/*`, `models`, `models/*`, `utils`
- `services/*` — may import `services/*`, `plugins/*`, `models`, `models/*`, `repositories/*`, `utils`
- `app` — may import `utils`, `models`, `models/*`, `plugins/*`, `repositories/*`, `services/*`
- `app/*` — may import `utils`, `models`, `models/*`, `plugins/*`, `repositories/*`, `services/*`
- `ui/components` — shared, may import `ui/hooks`
- `ui/hooks` — may import (empty list)
- `ui/layout` — may import `ui/hooks`, `ui/components`, `models`, `models/*`
- `ui/data` — may import `models`, `models/*`
- `ui/pages/*` — may import `ui/hooks`, `ui/components`, `ui/layout`, `ui/data`, `models`, `models/*`, `utils`

#### Scenario: Plugin imports model layer

- **WHEN** a file in `src/plugins` imports from `src/models`
- **THEN** ESLint reports an `unslop/import-control` error

#### Scenario: Page imports from another page group

- **WHEN** a file in `src/ui/pages/applicant` imports from `src/ui/pages/job-search`
- **THEN** ESLint reports an `unslop/import-control` error

#### Scenario: Repository imports plugin layer

- **WHEN** a file in `src/repositories` imports from `src/plugins`
- **THEN** ESLint reports an `unslop/import-control` error

### Requirement: Shared modules must have multiple consumers

Files declared as `shared: true` (`utils`, `ui/components`) MUST be consumed by at least two distinct entities. A shared entrypoint used by only one consumer SHALL be reported as a lint error.

#### Scenario: Shared entrypoint has single consumer

- **WHEN** `unslop/no-false-sharing` runs on a `shared: true` module's `index.ts`
- **THEN** ESLint reports an error if fewer than two distinct entities import from it

### Requirement: Export contracts deferred

The `export-control` rule MUST remain enabled but MUST NOT have any `exports` pattern arrays declared on any module. No symbol-level export contracts are enforced in this phase.

#### Scenario: No exports contracts configured

- **WHEN** `unslop/export-control` evaluates a module's public entrypoint
- **THEN** no error is reported because no `exports` patterns are declared

### Requirement: Architecture config co-located with ESLint config

The unslop architecture definition MUST live inline in `eslint.config.ts`, not in a separate file.

#### Scenario: Architecture is defined

- **WHEN** a developer reads `eslint.config.ts`
- **THEN** the full module architecture is visible without opening any additional file

### Requirement: Dependency-cruiser removed

`.dependency-cruiser.cjs` MUST be deleted and the `dependency-cruiser` package MUST be removed from `package.json`. No `depcruise`-based scripts SHALL remain.

#### Scenario: Dependency-cruiser is absent

- **WHEN** `npm run verify` executes
- **THEN** no dependency-cruiser step runs
- **AND** architecture is enforced entirely through ESLint
