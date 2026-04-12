## MODIFIED Requirements

### Requirement: Uniform public surface convention

The system MUST enforce a uniform cross-module public surface convention.

#### Scenario: Cross-module value import

- **WHEN** a file imports runtime values from another module
- **THEN** only that module's `index.ts` surface is allowed

#### Scenario: Cross-module type-only import

- **WHEN** a file imports types from another module
- **THEN** only that module's `index.ts` surface is allowed

## REMOVED Requirements

### Requirement: Uniform public surface convention (types.ts allowance)

**Reason**: The previous version of this requirement allowed cross-module type imports through both `index.ts` and `types.ts`. With the move to index-only public surfaces, `types.ts` is no longer a valid cross-module import target. Types are either merged into `index.ts` (models) or re-exported from `types.ts` through `index.ts` (repositories, plugins).

**Migration**: Update all cross-module imports from `@/<module>/types` to `@/<module>`. For models, the types are directly in `index.ts`. For repositories and plugins, `index.ts` re-exports the contract interface from `types.ts`.
