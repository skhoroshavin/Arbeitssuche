# Life-like E2E Tests

## Goal

Make the Electron E2E suite behave like a real user session:

1. No E2E test uses direct IPC calls.
2. No API keys are injected into app storage before launch.
3. The app starts with empty config and enters the first-start wizard.
4. Live credentials still come from `.env` locally and environment variables in CI, but Playwright uses them only as text input for the UI.
5. Add one focused wizard spec that proves invalid keys fail and valid keys succeed.
6. Keep the changeset scoped to E2E infrastructure, E2E specs/page objects/helpers, and only minimal app-side locator/stability changes if strictly necessary.

## Current State

- `e2e/electron-fixtures.ts` prewrites `config.json` with `setup.completed: true`, so E2E starts past the wizard.
- Live key values are read in Playwright, but existing live setup writes them through settings flows after bypassing first-start.
- `e2e/helpers/electron-api-helper.ts` exposes direct `window.electronAPI.invoke(...)` access.
- `e2e/helpers/live-flow-helper.ts` and several live specs depend on IPC for setup, state inspection, and polling.

This makes the suite faster, but it no longer matches the real first-run experience.

## Design

### 1. E2E bootstrap starts empty

File: `e2e/electron-fixtures.ts`

Change the Electron fixture to create an empty test data directory and stop prewriting setup completion.

### Startup rules

- Launch the built app against a fresh temp data dir.
- Do not write `config.json` or secrets before launch.
- Keep `NODE_ENV=production`, `ELECTRON_TEST=1`, and `ELECTRON_TEST_DATA_DIR` as they are today.
- Keep `.env` loading for local development, but only in the Playwright process.

### Result

Every live E2E test begins at the first-start wizard unless the test itself completes setup through the UI.

## 2. Credential sourcing stays in the test harness only

Files: `e2e/electron-fixtures.ts`, `e2e/helpers/live-e2e-setup.ts`

Use the existing env-loading behavior as a test-input source, not as hidden app configuration.

### Rules

- Local runs: if `.env` exists, load `OPENROUTER_API_KEY` and `GOOGLE_MAPS_API_KEY` into the Playwright process.
- CI runs: read the same values from process environment.
- Before launching Electron, remove those variables from the child app environment exactly as today.
- Tests type the values into wizard/settings fields through the UI.

### Guarding

Required-env checks stay only on specs that need live provider validation. Visual tests and non-live tests must not be blocked by missing live credentials.

## 3. E2E interaction model becomes UI-only

Files: `e2e/helpers/electron-api-helper.ts`, `e2e/helpers/live-flow-helper.ts`, `e2e/helpers/live-e2e-setup.ts`, `e2e/electron-fixtures.ts`, `e2e/pages/*`, and live specs under `e2e/tests-flow/`

Direct IPC is out of bounds for E2E tests in this changeset.

### Affected specs and helpers

The UI-only conversion applies to every current IPC-using E2E path, specifically:

- `e2e/tests-flow/live-flow.spec.ts`
- `e2e/tests-flow/live-enrichment-diagnostics.spec.ts`
- `e2e/tests-flow/runtime-contract.spec.ts`
- `e2e/helpers/live-flow-helper.ts`
- `e2e/helpers/live-e2e-setup.ts`
- `e2e/electron-fixtures.ts`
- `e2e/helpers/electron-api-helper.ts`

If any other E2E spec or helper still depends on `ElectronApiHelper` or `window.electronAPI.invoke(...)`, it is in scope for the same cleanup.

### Structural change

- Remove `ElectronApiHelper` from the live-flow test path.
- Refactor `LiveFlowHelper` so it composes page objects only.
- Extend page objects where needed so all required actions are driven by visible controls.

### Required page-object capabilities

#### First-start / settings wizard

A dedicated page object or a focused extension of `SettingsPage` must support:

- asserting the first-start wizard is visible
- entering AI and Maps keys
- clicking each provider `Testen` button
- asserting failure text after invalid input
- asserting success text after valid input
- moving from AI to Maps
- finishing the settings phase when a longer live-flow spec needs to enter the main app

#### Applicant creation

`ApplicantListPage` already covers most applicant wizard actions. Keep creation UI-driven and read the created applicant id from the URL after navigation.

#### Job-search creation

`ApplicantPage` already covers the job-search wizard. Keep creation UI-driven, select `arbeitsagentur` through the visible button, and read the created job-search id from the resulting URL.

#### Vacancy flow assertions

`JobSearchPage` should gain any small UI locators needed to observe crawl/enrichment progress from visible state instead of repository reads.

## 4. Live-flow waiting and assertions move to visible UI state

Existing IPC polling must be replaced with user-visible checkpoints.

### Acceptable checkpoints

- wizard headings and step transitions
- visible provider validation result text (`Gültig`, provider error text)
- enabled/disabled state of action buttons
- vacancy cards appearing in the list
- vacancy detail page rendering summary, commute, sources, and generated cover letter content
- cover-letter textarea/value updates after generation

### Not allowed

- `window.electronAPI.invoke(...)`
- direct repository reads
- direct config/secrets inspection
- pre-seeding app state through hidden channels

### Practical note

URL parsing is still acceptable for extracting created resource ids after the UI navigates there, because the ids are part of visible browser state rather than hidden app internals.

## 5. New focused wizard validation spec

Add one simple live E2E spec that covers only first-start key validation.

### Flow

1. Launch app with empty config.
2. Assert the first-start wizard is shown.
3. In the AI step:
   - enter an invalid key
   - save it
   - click `Testen`
   - assert failure
   - replace it with the valid env-backed key
   - click `Testen`
   - assert success
4. Continue to the Maps step.
5. In the Maps step:
   - enter an invalid key
   - save it
   - click `Testen`
   - assert failure
   - replace it with the valid env-backed key
   - click `Testen`
   - assert success
6. Stop after successful Maps validation. The spec does not need to finish the remaining first-start flow or create domain data.

### Purpose

This spec becomes the narrow regression test for the most important realism gap: first-start configuration through UI only.

## 6. Existing live specs keep their business intent, but enter through the wizard

Files: `e2e/tests-flow/live-flow.spec.ts`, `e2e/tests-flow/live-enrichment-diagnostics.spec.ts`, `e2e/tests-flow/runtime-contract.spec.ts`, related helpers/pages

The existing live specs should continue to validate live integrations, but their setup path changes.

### `live-flow.spec.ts`

Keep the end-to-end business flow the same, but use this setup sequence:

- start app
- complete the settings wizard with valid env-backed keys through the UI
- continue into the app
- create applicant through the applicant wizard
- create job search through the job-search wizard
- run crawl, enrichment, commute, and cover-letter flows using visible controls and visible assertions

### `live-enrichment-diagnostics.spec.ts`

Keep this as a diagnostics-style live smoke test, but rewrite the assertions to visible UI checks instead of config/model/IPC inspection.

Expected replacement assertions:

- AI settings shows the configured provider card as selected
- AI settings shows the saved secret in masked form
- Maps settings shows the saved secret in masked form
- clicking `Testen` for the saved AI key shows `Gültig`
- clicking `Testen` for the saved Maps key shows `Gültig`
- the three AI model selectors show non-empty selected values after configuration

This replaces hidden-state checks such as `getConfig()`, `getLlmModels()`, and direct provider test IPC helpers.

### `runtime-contract.spec.ts`

Keep this as the isolation contract for the E2E harness.

Expected coverage:

- a clean launch shows the first-start wizard rather than a preconfigured app state
- after finishing wizard-based configuration in one test, the next isolated test starts clean again
- missing-key notices are verified through normal UI navigation, not through hidden-state setup

### Constraint

Do not widen product scope, add mock layers, or change feature behavior to make this easier.

## 7. Minimal app-side changes only if the UI is not stably testable

App code changes are allowed only when one of these is true:

- a required user-visible control has no stable semantic locator
- a status transition cannot be observed from the UI at all
- an existing UI bug prevents the real first-start flow from being exercised

Any such change must be:

- minimal
- user-visible or accessibility-improving
- directly justified by the E2E scenario
- unrelated refactor free

## 8. Error handling and failure diagnostics

Because the suite stays live, failures must remain diagnosable.

### Keep

- console error capture in the long live flow spec
- explicit env-var error messages for missing live credentials
- page-object helpers that throw focused errors when expected UI state never appears

### Add/adjust

When waiting on long-running UI state, include enough context in helper-thrown errors to show what visible state was last observed (for example, button state, count of vacancy cards, or visible status text).

## 9. Testing scope and acceptance

### In scope

- E2E fixture/bootstrap changes
- E2E credential-handling changes
- E2E page objects/helpers/specs
- minimal app-side locator/stability changes if required

### Out of scope

- non-E2E refactors
- new test backdoors
- mock providers
- product feature changes unrelated to test realism

### Acceptance criteria

- The new wizard spec starts from an empty app state and passes without IPC.
- `live-flow.spec.ts`, `live-enrichment-diagnostics.spec.ts`, and `runtime-contract.spec.ts` no longer use `ElectronApiHelper` or `window.electronAPI.invoke(...)`.
- No helper or fixture on the active E2E path uses direct IPC to inspect or seed app state.
- Live diagnostics coverage has been rewritten to UI-visible assertions rather than dropped silently.
- Live credentials are never written into app storage before launch.
- The suite still works locally with `.env` and in CI with environment variables.
- No unrelated app behavior changes land in the same changeset.

## Planning implication

This design is focused enough for a single implementation plan. No roadmap decomposition is needed.
