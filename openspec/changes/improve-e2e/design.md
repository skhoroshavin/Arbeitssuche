## Context

The current Electron Playwright harness already creates a fresh temporary `userData` directory per test and launches a built app bundle, which is a strong base for isolation. However, the suite still leans on low-level test-only IPC helpers, fake-key smoke tests, and seeded vacancy fixtures more than on the real product path.

There are four technical constraints that shape this change:

- `e2e/electron-fixtures.ts` launches `out/main/main.cjs`, so `npm run test:e2e` must guarantee a build artifact exists before Playwright starts.
- `src/app/main.ts` currently swaps to `createStubSecretsRepository()` in `ELECTRON_TEST` mode, so test runs do not exercise encrypted secret persistence today.
- Live crawling can be bounded through the existing product model because `SearchParameters.maxResults` already flows into the crawler limit.
- The current CI workflow does not yet wire provider secrets into the E2E job, and forked PRs must be excluded from live E2E because repository secrets are unavailable under the default GitHub Actions security model.

This change needs a cross-cutting design because it affects Playwright fixtures, app bootstrap behavior in test mode, package scripts, CI wiring, and the structure of the E2E suite itself.

## Goals / Non-Goals

**Goals:**

- Keep every E2E run isolated with fresh app state and no shared persisted data.
- Make OpenRouter and Google Maps keys part of the default E2E contract so tests do not need an explicit `withLiveKeys` opt-in helper.
- Verify the main business path through the real application stack: applicant setup, job-search creation, bounded live crawl, enrichment, commute lookup, and cover-letter generation.
- Improve test readability by expressing setup and assertions in domain terms instead of repeating low-level IPC seeding in each spec.
- Make local `npm run test:e2e`, local `npm run test:all`, and CI E2E runs follow the same startup and environment contract.

**Non-Goals:**

- Replacing unit, crawler integration, or visual snapshot tests with E2E coverage.
- Exercising encrypted secrets storage in E2E; injected test credentials only need to make live flows work in isolated app instances.
- Making every job-site plugin equally central to the live E2E suite; the suite should prefer the most stable real source.
- Eliminating all test-only helpers. Small setup/readback helpers are acceptable when they keep tests readable and avoid brittle UI-only bootstrapping.

## Decisions

### 1. Provider credentials will be injected automatically during test boot

The E2E contract will require ambient environment variables for OpenRouter and Google Maps, and the app will import them automatically when running under `ELECTRON_TEST`.

The boot flow will remain:

```text
shell env / CI secrets
        ↓
Playwright fixture
        ↓
Electron process env
        ↓
test-only app bootstrap
        ↓
stub secrets repository seeded before services build
```

Rationale:

- This matches the desired user workflow: keys are always present for E2E and tests do not need a `withLiveKeys` fixture.
- It keeps the live-key contract explicit in environment setup while avoiding repetitive UI-based secret entry in every test.
- It fits the current architecture because test mode already uses a stub secrets repository.

Alternatives considered:

- Enter keys through the settings UI in every test. Rejected because it is repetitive, slower, and obscures the business flow under setup noise.
- Add a `withLiveKeys` helper fixture. Rejected because the suite should treat live credentials as mandatory ambient state, not optional per-test setup.
- Use the real encrypted secrets repository in E2E. Rejected because the requirement is CI-injected live keys, not encrypted-secret-path validation.

### 2. E2E will continue to use fresh ephemeral app state per test

Each E2E test will keep launching a new Electron instance backed by a temporary data directory and a fresh SQLite database. The fixture will remain responsible for creating and cleaning this state, and test boot will continue to mark setup as completed so flows can start at the real app pages.

Rationale:

- This preserves strong isolation and prevents cross-test leakage in local and CI runs.
- It allows live crawling and generation tests to fail independently without poisoning subsequent tests.

Alternatives considered:

- Share one app instance across the suite. Rejected because live crawl and live provider tests are stateful and would become order-dependent.
- Reuse persisted data between tests. Rejected because it would make failures harder to diagnose and reduce confidence in isolation.

### 3. The live-flow suite will replace the current E2E suite and cover major business flows with bounded real crawl scenarios

The suite will replace the current E2E tests with a small set of comprehensive, focused tests that cover major business flows. These tests will create a real applicant with a meaningful city, create a real job search through the UI, set `Max. Ergebnisse` to `5`, and crawl a real source. Assertions will wait on real crawl/enrichment lifecycle signals instead of sleep-based timing.

The preferred default live source is `arbeitsagentur` because it uses a public API and is less brittle than HTML-scraping sites.

Expected flow:

```text
Applicant with city = Berlin
        ↓
Job search for a dense term
        ↓
Source = arbeitsagentur
        ↓
Max. Ergebnisse = 5
        ↓
Aktualisieren
        ↓
assert 1..5 vacancies loaded
        ↓
open vacancy
        ↓
assert summary + commute
        ↓
generate cover letter
        ↓
assert non-empty content
```

Rationale:

- This replaces weak smoke-style E2E coverage with a concise set of business-flow tests that prove the product works end-to-end.
- This exercises the real product path instead of a mostly seeded simulation.
- The existing `maxResults` pipeline already provides a natural runtime bound.
- Using one stable real source keeps the suite more reliable while still validating live crawl behavior.

Alternatives considered:

- Depend on multiple real job sites in the default flow. Rejected because scraper-driven sources are more fragile and would multiply PR noise.
- Keep seeded vacancy fixtures as the primary proof of business flows. Rejected because the main gap is confidence in live crawling and provider-backed generation.

### 4. Test ergonomics will improve through higher-level domain helpers, not through more generic page objects alone

The suite will add higher-level helpers for common setup and verification paths such as creating an applicant with a city, creating a job search with bounded results, starting a crawl, and waiting for the app to return to a stable post-crawl state. Existing low-level helpers may remain for cleanup or narrow readback needs, but business-path tests should read as user stories rather than IPC scripts.

Rationale:

- The current page objects are serviceable, but many tests still express setup in mechanical terms.
- Domain helpers make live-flow tests shorter and easier to maintain without forcing everything through slow UI-only setup.

Alternatives considered:

- Move all setup into page objects only. Rejected because it tends to blur page modeling with domain orchestration.
- Remove all IPC helpers. Rejected because cleanup and targeted readback are still useful and less brittle than overusing UI assertions.

### 5. Package scripts, Playwright config, and CI gating will be aligned to the actual E2E runtime contract

`npm run test:e2e` will be treated as a self-contained command that ensures the Electron app is built and runs the intended E2E flow suite. The Playwright fixture will validate required live-key environment variables before Electron launches and fail early when the contract is not satisfied. CI will run live E2E for trusted PRs and same-repository branches, but skip the E2E job for forked PRs that cannot access secrets. The Playwright configuration will be simplified so test discovery matches the intended flow tests directly, while visual tests remain separate from the live Electron flow contract.

Rationale:

- The current harness launches `out/main/main.cjs`, but the current script does not build first.
- The current Electron Playwright config mixes flow and visual project declarations in a way that should be simplified to make discovery and execution obvious.
- Playwright already owns Electron process startup, so validating required environment variables there keeps failure mode clear and immediate.

Alternatives considered:

- Keep build as an undocumented prerequisite for local E2E runs. Rejected because it makes `npm run test:e2e` unreliable.
- Keep visual and live-flow concerns mixed in the same default E2E contract. Rejected because the live-flow suite has different runtime and dependency expectations.
- Make the app process itself validate missing E2E credentials on boot. Rejected because that produces a later and less targeted failure than failing in the Playwright fixture before launch.

## Risks / Trade-offs

- [Live external dependencies can fail or slow down] → Prefer the least brittle real source (`arbeitsagentur`), cap crawl results at `5`, and fail fast when required keys are missing.
- [PR validation becomes slower] → Concentrate live assertions into a small number of high-value business-flow tests instead of many overlapping smoke checks.
- [Forked GitHub PRs may not receive repository secrets] → Skip live E2E for forked PRs and keep the workflow behavior explicit in CI configuration.
- [Ambient key injection may hide which provider a test depends on] → Keep the suite contract narrow: OpenRouter and Google Maps are required defaults, and tests should state when they rely on generation or commute output.
- [Keeping the stub secrets repo means E2E still does not cover encrypted persistence] → Preserve that gap explicitly and continue to rely on lower-level tests for secret-storage behavior.

## Migration Plan

1. Tighten the E2E runtime contract by ensuring the Electron app is built before Playwright runs and by validating required environment variables early.
2. Add test-mode startup seeding so required provider keys are loaded automatically into the app before services are constructed.
3. Introduce domain-level E2E helpers and migrate the highest-value business-path tests first.
4. Replace fake-key and weak smoke assertions with bounded live-flow assertions that confirm crawl output, enrichment output, commute data, and cover-letter content.
5. Update CI to pass live credentials into the E2E job for trusted PRs and same-repository branches, skip forked PRs, and run the same command used locally.

Rollback strategy:

- Revert the script and fixture contract to the previous fake-key/seed-heavy suite if live E2E proves too unstable.
- Keep deterministic E2E tests as a fallback baseline while refining the live-flow path.

## Open Questions

- None currently. Proceed to specs using the decisions above.
