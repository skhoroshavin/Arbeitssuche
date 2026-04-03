# dependency-boundaries Specification Delta

## ADDED Requirements

### Requirement: Single architecture boundary authority

The system MUST enforce architectural import boundaries using dependency-cruiser as the single policy authority.

#### Scenario: Architecture verification runs

**GIVEN** project import boundaries are configured
**WHEN** architecture verification executes
**THEN** dependency-cruiser determines whether internal imports are valid
**AND** boundary outcomes are not dependent on duplicated architecture regex policies in other tools

### Requirement: Allow-list only, default-deny boundaries

The system MUST represent boundaries as explicit allow lists where any unlisted internal dependency is forbidden.

#### Scenario: Unlisted dependency is introduced

**GIVEN** a source module imports a target module not present in its allow list
**WHEN** dependency-cruiser evaluates dependencies
**THEN** the dependency is rejected

### Requirement: Uniform public surface convention

The system MUST enforce a uniform cross-module public surface convention.

#### Scenario: Cross-module value import

**GIVEN** a file imports runtime values from another module
**WHEN** the import path is evaluated
**THEN** only that module's `index.ts` surface is allowed

#### Scenario: Cross-module type-only import

**GIVEN** a file imports types from another module
**WHEN** the import path is evaluated
**THEN** only that module's `index.ts` or `types.ts` surfaces are allowed

### Requirement: Layer dependency directions

The system MUST enforce the following layer-level allow lists:

- `utils` -> none
- `models` -> `models`
- `plugins` -> `utils`
- `repositories` -> `plugins`, `models`, `utils`
- `services` -> `plugins`, `models`, `utils`, `repositories`, `services`
- `app` -> `app`, `utils`, `models`, `plugins`, `repositories`, `services`

#### Scenario: Plugin imports model layer

**GIVEN** a file in `src/plugins` imports from `src/models`
**WHEN** dependency-cruiser evaluates boundaries
**THEN** the dependency is rejected

### Requirement: UI modular allow lists with group isolation

The system MUST enforce UI boundaries with module-level allow lists:

- `ui/hooks` -> none
- `ui/components` -> `ui/hooks`
- `ui/layout` -> `ui/hooks`, `ui/components`
- `ui/data` -> `models`
- `ui/pages/:group` -> `ui/hooks`, `ui/components`, `ui/layout`, `ui/data`, `models`, `ui/pages/:group`

#### Scenario: Page imports from another page group

**GIVEN** a file in `src/ui/pages/applicant` imports from `src/ui/pages/job-search`
**WHEN** dependency-cruiser evaluates module boundaries
**THEN** the dependency is rejected because only `ui/pages/:group` self-group imports are allowed

### Requirement: Parent imports are forbidden under src

The system MUST forbid parent-relative imports (`../`) in `src/`.

#### Scenario: Parent import appears in src

**GIVEN** a source file under `src/` uses a parent-relative import
**WHEN** boundary checks run
**THEN** the import is rejected
