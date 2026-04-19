## Why

The current E2E suite launches isolated Electron instances, but it still relies heavily on test-only setup helpers and fake-key smoke checks instead of proving the real product path. This leaves `npm run test:e2e`, `npm run test:all`, and PR validation short of confirming that live crawling, enrichment, commute lookup, and cover-letter generation work end-to-end with injected provider credentials.

## What Changes

- Rework the E2E harness so every run boots a fresh isolated app instance with OpenRouter and Google Maps credentials injected automatically from environment variables.
- Make the default E2E suite verify the main business flows against the real app stack, including applicant setup, job-search creation, live crawling, vacancy enrichment, commute calculation, and cover-letter generation.
- Bound live crawl scenarios through the existing job-search configuration so tests stay readable and stable while using real sources, with a maximum of 5 results per crawl.
- Improve E2E readability and authoring by adding higher-level test setup helpers that express business flows instead of low-level IPC seeding in each spec.
- Align local scripts and CI so `npm run test:e2e` and `npm run test:all` run the same live-key E2E contract consistently.

## Capabilities

### New Capabilities
- `live-e2e-flows`: Defines isolated end-to-end runs that automatically inject provider keys, execute bounded live crawls, and verify the core applicant, job-search, vacancy, and cover-letter flows through the real application.

### Modified Capabilities
- `package-scripts`: Extend script requirements so `test:e2e` and `test:all` reliably prepare and run the live E2E suite in both local development and CI.

## Impact

- `e2e/` Playwright configuration, Electron fixtures, page objects, and higher-level test helpers
- `package.json` test scripts and CI workflow environment wiring
- Test-only app bootstrap behavior for importing required provider keys from environment variables
- Live E2E coverage for applicant creation, job-search creation, crawl/update progress, vacancy enrichment with commute data, and cover-letter generation
- PR validation time and failure modes, because the suite will depend more directly on live external services and job sources
