## 1. Plugin And Lint Baseline

- [x] 1.1 Update the local `eslint-plugin-unslop` dependency/lockfile state so the repository resolves to the latest plugin code in `../eslint-plugin-unslop`.
- [x] 1.2 Run lint (`npm run fix` or lint command path) to capture the full set of test-control violations introduced by the tightened rules.

## 2. Test Remediation

- [x] 2.1 Refactor violating tests to import only allowed module entrypoints (`index.ts` and explicitly configured entrypoints).
- [x] 2.2 Remove violating tests that are redundant with existing compliant black-box coverage.
- [x] 2.3 Where deletion is not safe, add or adjust behavior-focused black-box assertions so coverage remains equivalent after remediation.

## 3. Verification

- [x] 3.1 Run `npm run fix` and resolve remaining lint errors, including any new test-control failures.
- [x] 3.2 Run `npm run verify` and address any failures from lint, typecheck, build, or test phases.
- [x] 3.3 Run `npm test` and confirm no behavior regressions were introduced by test refactors/removals.
