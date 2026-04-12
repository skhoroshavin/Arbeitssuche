## MODIFIED Requirements

### Requirement: Test files are linted under the same architecture policy

The linting policy MUST include test files in normal ESLint evaluation, and test files SHALL be subject to the same architecture and import boundary checks as production code, including tighter test-control validation from the current local `eslint-plugin-unslop` implementation.

#### Scenario: Test file is no longer globally excluded

- **WHEN** ESLint evaluates a file matching `**/*.test.ts`, `**/*.test.tsx`, `**/*.test-suite.ts`, or `**/*.integration-test.ts`
- **THEN** the file SHALL be linted instead of being skipped by global ignore patterns

#### Scenario: Test import boundary violation is reported

- **WHEN** a test imports from a cross-module internal path that is outside configured entrypoints
- **THEN** ESLint MUST report an `unslop/import-control` violation for that test file

#### Scenario: Tightened test control rejects legacy deep imports

- **WHEN** a pre-existing test import pattern conflicts with newly tightened unslop test-control checks
- **THEN** ESLint MUST fail until the import is moved to an allowed public entrypoint or the test is removed as redundant

### Requirement: Test lint violations are remediated by black-box coverage

When lint enforcement reveals tests that depend on deep internal imports, remediation MUST preserve black-box testing boundaries through public interfaces and MUST avoid introducing test-only architecture bypasses.

#### Scenario: Equivalent black-box test already exists

- **WHEN** a test violates architecture boundaries via deep internal imports
- **AND** equivalent black-box coverage already exists
- **THEN** the violating test MUST be deleted

#### Scenario: No equivalent black-box test exists

- **WHEN** a test violates architecture boundaries via deep internal imports
- **AND** equivalent black-box coverage does not exist
- **THEN** the test MUST be refactored to import only public interfaces and remain behavior-focused

#### Scenario: Test-only bypass is rejected

- **WHEN** remediation attempts to retain deep internal test imports via test-only entrypoints or broad lint disables
- **THEN** the remediation SHALL be rejected in favor of public-surface imports or behavior-level test restructuring
