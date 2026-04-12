## Why

The locally linked `eslint-plugin-unslop` now enforces tighter test import controls, which exposes architecture violations in the current test suite. We need to adopt the updated rule behavior now to keep test code aligned with the same boundary guarantees as production code and to keep lint and verify green.

## What Changes

- Upgrade repository lint behavior to the latest local `../eslint-plugin-unslop` test-control semantics.
- Remediate failing tests to satisfy stricter import-control constraints by using public module surfaces and black-box test patterns.
- Remove or refactor tests that depend on internal cross-module implementation paths when equivalent behavior-level coverage can be preserved.
- Keep existing runtime behavior unchanged; this change is focused on lint policy compliance and test structure.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `linting-policy`: Tighten test import-control requirements and require test remediation patterns that preserve behavior coverage while using only allowed module entrypoints.

## Impact

- Affected code: test files across `src/**` that currently import non-entrypoint module internals.
- Affected config/dependencies: ESLint behavior via locally linked `eslint-plugin-unslop` and architecture enforcement in `eslint.config.ts`.
- Validation impact: `npm run fix`, `npm run verify`, and `npm test` outcomes depend on test refactors/removals completing.
