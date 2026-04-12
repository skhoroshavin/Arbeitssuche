## ADDED Requirements

### Requirement: Test files are linted under the same architecture policy
The linting policy MUST include test files in normal ESLint evaluation, and test files SHALL be subject to the same architecture and import boundary checks as production code.

#### Scenario: Test file is no longer globally excluded
- **WHEN** ESLint evaluates a file matching `**/*.test.ts`, `**/*.test.tsx`, `**/*.test-suite.ts`, or `**/*.integration-test.ts`
- **THEN** the file SHALL be linted instead of being skipped by global ignore patterns

#### Scenario: Test import boundary violation is reported
- **WHEN** a test imports from a cross-module internal path that is outside configured entrypoints
- **THEN** ESLint MUST report an `unslop/import-control` violation for that test file

### Requirement: Test lint violations are remediated by black-box coverage
When lint enforcement reveals tests that depend on deep internal imports, remediation MUST preserve black-box testing boundaries through public interfaces.

#### Scenario: Equivalent black-box test already exists
- **WHEN** a test violates architecture boundaries via deep internal imports
- **AND** equivalent black-box coverage already exists
- **THEN** the violating test MUST be deleted

#### Scenario: No equivalent black-box test exists
- **WHEN** a test violates architecture boundaries via deep internal imports
- **AND** equivalent black-box coverage does not exist
- **THEN** the test MUST be refactored to import only public interfaces and remain behavior-focused

### Requirement: Test type-safety follows production baseline
Test files MUST follow the same core type-safety lint constraints as production code and MUST NOT rely on blanket test-only disables for assertion or null-safety rules.

#### Scenario: Blanket test safety disable is removed
- **WHEN** ESLint configuration is reviewed
- **THEN** no global test-only override SHALL disable `@typescript-eslint/consistent-type-assertions`
- **AND** no global test-only override SHALL disable `@typescript-eslint/no-non-null-assertion`
