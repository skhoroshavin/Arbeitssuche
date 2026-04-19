# live-e2e-flows Specification

## Purpose

TBD - synced from change improve-e2e. Refine after archive.

## Requirements

### Requirement: E2E runs use isolated app state

The E2E system MUST launch each test run against a fresh isolated app instance with no shared persisted application state from other E2E runs.

#### Scenario: Fresh app state for each test run

- **WHEN** an E2E test starts
- **THEN** the app launches with a fresh temporary data directory and fresh persisted state
- **AND** data created by that test run is not reused by later E2E runs

### Requirement: E2E credentials are injected automatically

The E2E system MUST treat OpenRouter and Google Maps credentials as required ambient input, inject them automatically into test runs from environment variables, and validate that contract before Electron launches.

#### Scenario: Required credentials are available

- **WHEN** `npm run test:e2e` starts with valid OpenRouter and Google Maps environment variables
- **THEN** the Playwright harness validates that the required variables are present before launching Electron
- **AND** the launched app has both provider credentials available without manual setup inside the test

#### Scenario: Required credentials are missing

- **WHEN** `npm run test:e2e` starts without one or more required provider environment variables
- **THEN** the Playwright harness fails the run before Electron launches
- **AND** the failure reports which E2E credentials are missing

### Requirement: Live E2E covers major business flows with bounded real crawl

The E2E suite MUST replace the current flow tests with a small set of comprehensive tests that exercise the real application stack, including applicant setup, job-search creation, live crawling, enrichment, commute lookup, and cover-letter generation.

#### Scenario: Major live flow succeeds

- **WHEN** the live E2E suite runs in a trusted environment with required credentials
- **THEN** it creates a real applicant with a meaningful city
- **AND** it creates a real job search through the UI
- **AND** it configures the crawl to use `arbeitsagentur` with `Max. Ergebnisse` set to `5`
- **AND** it starts a real crawl and waits for the real crawl lifecycle to finish
- **AND** it verifies that between 1 and 5 vacancies are loaded
- **AND** it opens a crawled vacancy and verifies enrichment output and commute data
- **AND** it generates a cover letter and verifies that non-empty content is produced

### Requirement: Live E2E runs only on trusted CI contexts

The CI system MUST run live E2E only when provider secrets are available, and MUST skip the live E2E job for forked pull requests that cannot access those secrets.

#### Scenario: Same-repository branch or trusted PR

- **WHEN** CI runs for a same-repository branch or other trusted pull request context with provider secrets available
- **THEN** the live E2E job runs

#### Scenario: Forked pull request

- **WHEN** CI runs for a pull request from a fork without access to repository secrets
- **THEN** the live E2E job is skipped
