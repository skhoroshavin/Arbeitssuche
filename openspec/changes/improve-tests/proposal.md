## Why

Test files are currently excluded from key linting and architecture checks, which allows the test suite to drift from the same dependency and quality constraints required in production code. Enforcing the same standards in tests now prevents boundary violations from being introduced through test-only imports and improves long-term maintainability.

## What Changes

- Remove test-file exclusions from the global ESLint ignore configuration so test files are linted by default.
- Apply architecture rules (including import/export boundary checks) to test files under the existing linting policy.
- Align TypeScript quality expectations for tests with production code by removing broad test-only relaxations that bypass core safety rules.
- If tests fails linting, then tests must be refactored to satisfy the linting policy.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `linting-policy`: Extend linting and architecture requirements so tests are evaluated with the same boundary and quality checks as production code.

## Impact

- Affected code: `eslint.config.ts`, plus test files that currently rely on disallowed imports or relaxed type-safety rules.
- Affected systems: local lint workflow and CI verification steps that run ESLint.
- Dependencies/APIs: no external API changes; may require minor test refactors to satisfy enforced rules.
