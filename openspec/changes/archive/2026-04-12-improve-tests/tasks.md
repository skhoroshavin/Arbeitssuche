## 1. Enforce lint policy on test files

- [x] 1.1 Remove test file globs from the global `ignores` list in `eslint.config.ts` so `*.test.ts`, `*.test.tsx`, `*.test-suite.ts`, and `*.integration-test.ts` are linted.
- [x] 1.2 Remove blanket test-only overrides that disable `@typescript-eslint/consistent-type-assertions` and `@typescript-eslint/no-non-null-assertion`.
- [x] 1.3 Confirm test files are evaluated by architecture rules (including `unslop/import-control`) using a focused lint run.

## 2. Remediate failing tests to black-box boundaries

- [x] 2.1 Run lint and collect all test violations introduced by policy enforcement.
- [x] 2.2 For each deep-import violation, check whether equivalent black-box coverage already exists.
- [x] 2.3 Delete violating tests when equivalent black-box coverage exists.
- [x] 2.4 Refactor remaining violating tests to import only from public interfaces and keep behavior-focused assertions.

## 3. Remediate test type-safety violations

- [x] 3.1 Replace non-null assertions and type assertions in tests with safer typing patterns and explicit setup.
- [x] 3.2 Update test helpers/fixtures where needed so tests remain readable without relaxing lint rules.

## 4. Validate and finalize

- [x] 4.1 Run `npm run fix` and address any remaining lint issues.
- [x] 4.2 Run `npm test` and fix regressions caused by test refactors.
- [x] 4.3 Run `npm run verify` to confirm full CI-equivalent checks pass with test linting enforced.
