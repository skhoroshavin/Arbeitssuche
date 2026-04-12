# dependency-boundaries Specification

## Purpose

Defines the architectural import boundary enforcement for the codebase, ensuring module dependencies follow a well-defined layered architecture with clear import rules.

## Requirements

### Requirement: Single architecture boundary authority

The system MUST enforce architectural import boundaries using `eslint-plugin-unslop` as the single policy authority. Dependency-cruiser MUST NOT be used for boundary enforcement.

#### Scenario: Architecture verification runs

- **WHEN** architecture verification executes
- **THEN** `unslop/import-control` determines whether internal imports are valid
- **AND** boundary outcomes are not dependent on duplicated architecture policies in other tools

### Requirement: Allow-list only, default-deny boundaries

The system MUST represent boundaries as explicit allow lists where any unlisted internal dependency is forbidden.

#### Scenario: Unlisted dependency is introduced

- **WHEN** a source module imports a target module not present in its allow list
- **THEN** ESLint reports an `unslop/import-control` error on the import statement

### Requirement: Uniform public surface convention

The system MUST enforce a uniform cross-module public surface convention.

#### Scenario: Cross-module value import

- **WHEN** a file imports runtime values from another module
- **THEN** only that module's `index.ts` surface is allowed

#### Scenario: Cross-module type-only import

- **WHEN** a file imports types from another module
- **THEN** only that module's `index.ts` surface is allowed

### Requirement: Parent imports are forbidden under src

The system MUST forbid parent-relative imports (`../`) in `src/`.

#### Scenario: Parent import appears in src

- **WHEN** a source file under `src/` uses a parent-relative import
- **THEN** the import is rejected

## REMOVED Requirements

### Requirement: Layer dependency directions

**Reason**: Replaced by the more precise module-level allow lists in `linting-policy` spec. The old layer-level table listed `repositories -> plugins` which was never used in practice, and `app -> app` which creates a circular module dependency. The new allow lists reflect the tightened and verified target architecture.

**Migration**: See `linting-policy` spec, Requirement: Module-level import allow lists.

### Requirement: Uniform public surface convention (types.ts allowance)

**Reason**: The previous version of this requirement allowed cross-module type imports through both `index.ts` and `types.ts`. With the move to index-only public surfaces, `types.ts` is no longer a valid cross-module import target. Types are either merged into `index.ts` (models) or re-exported from `types.ts` through `index.ts` (repositories, plugins).

**Migration**: Update all cross-module imports from `@/<module>/types` to `@/<module>`. For models, the types are directly in `index.ts`. For repositories and plugins, `index.ts` re-exports the contract interface from `types.ts`.
