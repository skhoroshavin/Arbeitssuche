## 1. Remove app-side secret bootstrap

- [x] 1.1 Update `src/app/main.ts` so E2E/test launches use the persisted secrets repository instead of creating stub secrets from environment variables.
- [x] 1.2 Remove the now-unused environment secret readers and any related test-only secret bootstrap code paths.
- [x] 1.3 Trim `src/app/ipc-settings.ts` to drop raw secret load/save helpers that are no longer needed for E2E setup.

## 2. Add reusable UI-driven E2E setup

- [x] 2.1 Extend `e2e/pages/settings.page.ts` with helpers that can assert unset provider state, save provider keys, and verify the saved state for both AI and Maps settings.
- [x] 2.2 Add a reusable live E2E setup helper that reads required keys from the Playwright environment and configures the app through the Settings UI.
- [x] 2.3 Keep isolated-run setup in `e2e/electron-fixtures.ts` focused on clean storage only, while preserving validation that required live credentials are available to the test runner.

## 3. Update live E2E coverage

- [x] 3.1 Rewrite `e2e/tests-flow/runtime-contract.spec.ts` to assert a clean launch, UI-based key entry, and visible saved-state transitions instead of automatic secret injection.
- [x] 3.2 Update the live flow spec and related helpers to run the reusable UI setup before exercising crawl, enrichment, commute, and cover-letter flows.
- [x] 3.3 Remove or simplify E2E helper methods that only supported raw secret IPC setup.

## 4. Verify the change

- [x] 4.1 Run the focused live E2E specs that cover runtime setup and the live flow.
- [x] 4.2 Run the repository verification commands required for completion and fix any regressions caused by the setup change.
