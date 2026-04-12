## Context

The current ESLint setup excludes `*.test.ts`, `*.test.tsx`, `*.test-suite.ts`, and `*.integration-test.ts` at the global ignore layer, so architecture and import-boundary checks do not run for most test code. In addition, test-specific rule overrides disable some core TypeScript safety rules, creating a quality gap between production and test code.

This change modifies the existing `linting-policy` capability rather than introducing a new capability. The goal is to enforce the same boundary and quality guarantees in tests and require test refactoring when violations are found.

## Goals / Non-Goals

**Goals:**
- Ensure test files are linted by default under the same architecture/import-control regime as production files.
- Remove broad test-only safety exemptions so tests follow the same baseline TypeScript quality constraints.
- Require test code to be updated to satisfy policy, rather than relying on broad or new test-only exemptions.
- Make CI behavior consistent so lint failures in tests are surfaced the same way as production failures.

**Non-Goals:**
- Redesigning the repository architecture model or introducing new module layers.
- Changing test frameworks, test execution strategy, or test discovery patterns.
- Refactoring every existing test for style-only reasons beyond what is needed to satisfy enforced rules.

## Decisions

1. Enforce linting on tests by removing global ignore patterns for test file suffixes.
   - Rationale: Global ignores bypass all checks, including architecture rules from `eslint-plugin-unslop`.
   - Alternative considered: Keeping ignores and adding a separate test-only lint command. Rejected because it fragments policy and can drift from CI defaults.

2. Keep architecture checks active for tests and require imports through allowed public module surfaces.
   - Rationale: Tests should not become a backdoor for boundary violations that would be disallowed in production code.
   - Alternative considered: Permit broad test-only deep imports. Rejected because it weakens modular contracts and increases coupling to internals.

3. Remove blanket test override disabling `@typescript-eslint/consistent-type-assertions` and `@typescript-eslint/no-non-null-assertion`.
   - Rationale: Broad exemptions reduce type-safety discipline and hide issues that should be modeled explicitly.
   - Alternative considered: Keep both rules off for all tests for convenience. Rejected because convenience outweighs maintainability only in narrow cases.

4. Resolve lint failures by refactoring tests to compliant imports and type-safe patterns.
   - Rationale: The proposal explicitly requires test fixes when lint fails, so design should prioritize remediation over exemption.
   - Alternative considered: Adding new test-only overrides for convenience. Rejected because it recreates the quality gap this change removes.

5. Treat resulting lint errors in existing tests as follow-up remediation tasks within this change scope.
   - Rationale: Enabling checks without remediation leaves the repository in a failing state.
   - Alternative considered: Deferring remediation to later changes. Rejected because policy enforcement must be actionable immediately.

6. Enforce black-box testing boundaries: tests must import only public interfaces.
   - Rationale: The test suite should validate externally observable behavior and preserve architecture contracts.
   - Alternative considered: Keeping some deep-import tests as exceptions. Rejected because internal-coupling tests undermine module boundaries.

## Risks / Trade-offs

- [Existing tests fail after enforcement] -> Update affected test imports and typing patterns in the same change until lint passes.
- [Some tests become harder to express under strict rules] -> Refactor fixtures/mocks and helper APIs so tests stay readable while remaining compliant.
- [Boundary-compliant imports make certain tests harder to write] -> Prefer testing via public surfaces; when internals must be tested, document and constrain that access pattern.
- [CI time may increase slightly due to additional linted files] -> Accept minor runtime increase as a trade-off for stronger consistency and architectural safety.

## Migration Plan

1. Update `eslint.config.ts` to remove global test ignore patterns and remove broad test-only safety disables.
2. Run lint/verify and fix resulting test violations (import paths, boundary usage, and type-safety issues).
3. Refactor failing tests until they pass lint without adding new broad test-only relaxations.
4. For any deep-import violation, assess whether an equivalent black-box test already exists:
   - If yes, delete the violating test.
   - If no, refactor the violating test to black-box style via public surfaces.
5. Validate CI-equivalent checks pass with tests included.

Rollback strategy:
- Revert the lint-policy changes in `eslint.config.ts` if rollout reveals blocking issues that cannot be safely remediated immediately.

## Open Questions

- None at this time.
