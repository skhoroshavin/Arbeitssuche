# E2E Main Flow Design

## Summary

Replace the current `e2e/tests-flow` split live specs with one serial live happy-path suite at `e2e/tests-flow/main-flow.spec.ts`.

The new suite should model real app usage in three grouped phases:
- `describe("first-start")`
- `describe("follow-up start")`
- `describe("vacancy view")`

It should use visible UI only, always. No internal assertions, no direct state inspection, and no hidden app contracts.

## Goals

- Make `main-flow.spec.ts` the single live end-to-end happy-path contract for the app
- Cover first start, normal follow-up start, and vacancy progression in one serial journey
- Split the journey into small checkpoint tests without duplicating adjacent assertions
- Fill real forms with realistic data instead of only checking navigation
- Preserve real integrations: live OpenRouter validation, live Google Maps validation, live crawling, and live cover-letter generation

## Non-Goals

- Exhaustive persistence verification
- Deep resume-content verification
- Non-happy-path coverage beyond invalid-then-valid API key checks
- Extra regression coverage for every field permutation
- C-level "assert everything persisted everywhere" checks

## Current Context

Current `e2e/tests-flow` coverage is spread across:
- `first-start-wizard.spec.ts`
- `live-enrichment-diagnostics.spec.ts`
- `live-flow.spec.ts`
- `runtime-contract.spec.ts`

The existing page objects already reflect the major user-facing areas:
- first-start settings
- applicant wizard
- job-search wizard
- vacancy list/detail

The current live helper methods bundle several checkpoints together. The new suite needs finer-grained ownership per `it(...)`.

## Target File Changes

### Rename
- `e2e/tests-flow/first-start-wizard.spec.ts` → `e2e/tests-flow/main-flow.spec.ts`

### Delete
- `e2e/tests-flow/live-enrichment-diagnostics.spec.ts`
- `e2e/tests-flow/live-flow.spec.ts`
- `e2e/tests-flow/runtime-contract.spec.ts`

## Test Suite Architecture

`main-flow.spec.ts` should be one serial live journey with grouped checkpoints.

### Top-level shape
- one serial suite
- nested groups:
  - `describe("first-start")`
  - `describe("follow-up start")`
  - `describe("vacancy view")`

### Execution model
- `first-start` creates the persisted application state
- `follow-up start` relaunches the app with the same state folder and reuses that state
- `vacancy view` continues from the state created earlier in the same suite
- this suite should intentionally share one live Electron app/page context across its serial `it(...)` blocks instead of resetting fixtures per test
- the shared context should live until the explicit relaunch checkpoint, where the app is closed and reopened against the same state folder, then continue serving the remaining `it(...)` blocks
- if the cleanest implementation is one fully serial journey under the hood, that is acceptable as long as the grouped structure remains

### Assertion model
Each test should prove the new behavior introduced at that checkpoint:
- do the visible user action for that checkpoint
- verify the visible UI result of that action
- avoid repeating the same adjacent screen assertions unless needed for reliability

"Key action works" includes actual form entry where relevant, not only reachability.

## Detailed Scenario Breakdown

### `describe("first-start")`

1. `it("first asks to fill in OpenRouter API key, and allows checking its validity")`
   - start on first-start AI settings
   - enter invalid OpenRouter key, test, observe failure
   - replace with live OpenRouter key, test, observe success
   - click `Weiter`

2. `it("then asks to fill in Google Maps API key, and allows checking its validity")`
   - confirm the Maps step is now shown
   - enter invalid Google Maps key, test, observe failure
   - replace with live Google Maps key, test, observe success
   - finish settings

3. `it("then asks for user personal data")`
   - confirm applicant wizard starts
   - fill realistic personal data
   - continue to work experience

4. `it("then asks for work experience")`
   - fill at least one realistic work-experience entry
   - continue to education

5. `it("then asks for education")`
   - fill at least one education entry
   - continue to certification

6. `it("then asks for certification")`
   - fill at least one certification entry
   - continue to miscellaneous

7. `it("then asks for miscellaneous")`
   - fill useful miscellaneous data that can influence downstream generation
   - finish applicant wizard

Use stable seed data for the happy path:
- applicant address in Berlin
- search term `Sachbearbeiter`
- max search results per source `3`
- enabled sources only: Agentur für Arbeit and Xing

8. `it("then asks for job search parameters")`
   - confirm job-search wizard opens
   - fill search term `Sachbearbeiter`
   - set max search results per source to `3`
   - limit enabled sources to:
     - Agentur für Arbeit
     - Xing
   - continue past the parameters checkpoint without duplicating later checks

9. `it("then proposes to generate a cover letter template")`
   - continue through the remaining job-search wizard steps
   - reach the final cover-letter-template step
   - verify the wizard proposes generating a template before finish

10. `it("then starts job search")`
   - finish the job-search wizard
   - confirm crawling starts automatically
   - verify visible crawl progress/status is shown, ideally via the top status line / progress bar
   - wait until the visible search/analysis progress UI is no longer shown
   - then assert that at least `1` visible vacancy exists and the list is usable for opening a vacancy
   - if live results stay at `0`, fail explicitly: this happy path requires at least one vacancy to proceed

### `describe("follow-up start")`

11. `it("shows applicant list")`
   - relaunch the app using the same state folder
   - verify normal startup instead of first-start
   - show the applicant list

12. `it("allows to select an applicant")`
   - open the first applicant through visible UI selectors

13. `it("allows to download a resume")`
   - trigger resume download for that applicant through the UI
   - use one visible resume template option as the action target
   - allow one explicit exception to the UI-only rule here: assert that Electron/Playwright reports a PDF download was initiated
   - verify the downloaded file has a `.pdf` filename and is non-empty

14. `it("allows to select a job search")`
   - open the first job search for that applicant through the UI

15. `it("then shows list of found vacancies")`
   - verify the vacancy list is visible with existing results from the persisted search state

16. `it("allows to update them")`
   - trigger refresh/update
   - verify the vacancy list remains usable after the update

### `describe("vacancy view")`

17. `it("proposes to generate personalised cover letter")`
   - open the first available vacancy
   - verify vacancy detail UI
   - generate a personalized cover letter
   - wait for a visible non-empty generated result

18. `it("allows to mark it as applied")`
   - transition the currently opened vacancy to `applied`
   - verify the next visible state/action becomes available

19. `it("then allows to mark it as invited, and asks for appointment date")`
   - transition the same vacancy to `invited`
   - verify appointment date is requested via visible UI
   - fill the appointment date

20. `it("then allows to mark it as interviewed")`
   - transition the same vacancy to `interviewed`
   - verify the next visible state/action becomes available

21. `it("then allows to mark it as offered")`
   - transition the same vacancy to `offered`
   - verify the final visible state/action becomes available

## Component and Helper Design

### Keep
- `readRequiredLiveCredentials`

### Stop relying on for this suite
- bundled helpers that jump across several checkpoints at once
- especially helpers that complete whole first-start or job-search flows in one call

### Preferred helper style
Add small page-object methods that do one user-facing action at a time:
- fill one wizard step
- click the next step button
- select one source
- trigger one refresh
- trigger one status transition
- assert one visible UI outcome

## Page Object Changes

### `ApplicantListPage`
Add helpers for:
- filling the personal-data step
- filling the work-experience step
- filling the education step
- filling the certification step
- filling the miscellaneous step
- opening the first applicant

### `ApplicantPage`
Add helpers/selectors for:
- filling job-search parameters
- setting max results per source to `3`
- enabling only Agentur für Arbeit and Xing
- progressing through later wizard steps
- opening the first job search

### `JobSearchPage`
Add helpers/selectors for:
- detecting visible crawl progress/status
- opening the first vacancy
- refreshing/updating vacancies
- generating a personalized cover letter
- stepping through vacancy status transitions
- filling the invited appointment date UI

### Fixture/helper layer
Add shared-fixture and relaunch support that:
- gives this spec one shared Electron app/page context across its serial `it(...)` blocks
- preserves one state folder for the whole file
- closes the Electron app after the first-start phase
- reopens it with the same persisted state folder before `follow-up start`
- proves successful restart through visible UI only

## UI-Only Assertion Rule

These tests should use visible UI only by default:
- no internal assertions
- no direct store/database/state inspection
- no hidden contracts
- no reading app internals to verify progress

All proof should come from what a user can see and interact with.

### Explicit exception
The resume-download checkpoint may use Playwright/Electron download assertions to prove that a PDF download is actually offered and emitted:
- assert a download event is triggered from the visible template-selection action
- assert the suggested/downloaded filename ends with `.pdf`
- assert the downloaded file is non-empty

No other exceptions are in scope for this suite.

## Async and Waiting Strategy

Use polling only for live async UI outcomes:
- API key validation results
- crawl/progress appearance and meaningful progress
- vacancy list availability after crawling or refresh
- generated cover-letter content becoming non-empty

When waiting:
- wait for meaningful visible outcomes
- avoid arbitrary sleeps
- avoid assertions on invisible internal state transitions

## Failure Handling

Failure diagnosis should stay user-visible:
- failed key validation → visible invalid result does not change as expected
- failed wizard progression → expected next step never appears
- failed crawl start → visible progress/status never appears
- failed crawl completion → vacancy list never becomes usable
- failed generation → cover-letter field stays empty
- failed status transition → next visible action/state never appears

The suite should not assert speculative implementation details such as backend events, hidden flags, or persistence internals.

## Test Hygiene Rules

- keep the file serial
- keep each `it(...)` incremental
- do just enough work per test to establish that checkpoint
- do not duplicate adjacent checks unnecessarily
- do not hide covered steps inside opaque helper methods
- keep selectors and repetitive form interactions inside page objects, not as raw locator soup in the spec

## Risks and Expected Work

Most likely non-trivial implementation work:
1. finding stable selectors for applicant wizard fields beyond the currently covered personal step
2. finding stable selectors for job-search source configuration and per-source limits
3. finding a stable visible crawl-progress indicator
4. finding selectors for vacancy status workflow and invited appointment date
5. implementing shared app/page fixtures for this serial spec without per-test resets
6. implementing clean app relaunch with the same state folder in the E2E fixture layer

## Scope Guard

This refactor should stay focused on:
- replacing the current `tests-flow` split with one main live happy-path suite
- adding only the page-object and fixture support needed for that suite

It should not expand into:
- extra persistence tests
- exhaustive resume verification
- exhaustive vacancy-history verification
- non-happy-path scenarios beyond the invalid-then-valid credential checks
- broader architectural refactors outside what this suite needs

## Recommendation for Next Step

After this spec is approved, the next step should be a focused implementation plan for the refactor. This design appears scoped for a single detailed plan rather than a multi-phase roadmap.