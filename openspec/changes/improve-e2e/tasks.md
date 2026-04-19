## 1. E2E Runtime Contract

- [x] 1.1 Update `test:e2e` so it prepares the built Electron app before Playwright launches `out/main/main.cjs`
- [x] 1.2 Simplify the Playwright Electron config so the default E2E command targets the intended live flow tests only
- [x] 1.3 Add Playwright-side preflight validation for required OpenRouter and Google Maps environment variables with clear failure messages

## 2. Test-Mode Credential Injection

- [x] 2.1 Add test-mode app bootstrap logic that loads OpenRouter and Google Maps keys from environment variables into the E2E secrets repository before services are built
- [x] 2.2 Keep per-test isolated app data directories and verify that automatic key injection does not leak state across runs
- [x] 2.3 Remove or downgrade old fake-key assumptions in the current E2E harness so ambient injected credentials become the default contract

## 3. Live Flow Test Rewrite

- [x] 3.1 Add higher-level E2E helpers for creating an applicant with a city, creating a job search with bounded results, starting a crawl, and waiting for crawl completion
- [x] 3.2 Replace current smoke-style settings and job-search E2E cases with a small set of comprehensive major-flow tests using real crawling and provider-backed generation
- [x] 3.3 Ensure the live flow tests use `arbeitsagentur` and `Max. Ergebnisse = 5` to keep runtime bounded while exercising the real crawl path
- [x] 3.4 Strengthen assertions so the suite verifies real outcomes such as vacancy count bounds, summary visibility, commute data, and non-empty generated cover-letter content

## 4. CI And Script Alignment

- [x] 4.1 Update `test:all` to run the self-contained live E2E contract after unit and crawler tests
- [x] 4.2 Wire CI to pass required provider secrets into the live E2E job for trusted branches and same-repository PRs
- [x] 4.3 Gate the CI workflow so live E2E is skipped for forked pull requests that cannot access repository secrets

## 5. Verification And Cleanup

- [x] 5.1 Remove or rewrite obsolete fake-key and low-value E2E tests that conflict with the new live-flow contract
- [ ] 5.2 Run the updated E2E suite locally and in CI-oriented conditions to confirm the build, key validation, crawl, enrichment, commute, and cover-letter paths all work end-to-end
- [x] 5.3 Update any supporting test utilities or documentation needed so contributors can run the live E2E suite consistently with the required environment variables
