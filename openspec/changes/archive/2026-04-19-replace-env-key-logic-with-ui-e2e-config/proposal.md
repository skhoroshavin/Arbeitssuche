## Why

Live E2E runs currently depend on test-only environment injection and raw secret IPC helpers instead of the same settings flow real users use. That makes the app carry test-specific secret bootstrap logic and leaves the end-to-end coverage gap around adding provider keys through the UI.

## What Changes

- Remove test-only startup logic that copies provider secrets from environment variables into application state.
- Stop relying on raw secret save/load helpers for live E2E setup when the same outcome can be achieved through the Settings screens.
- Add UI-driven live E2E setup that enters the required provider keys in Settings before running crawl, enrichment, commute, and cover-letter flows.
- Keep live E2E isolation so each run starts from a clean persisted config and proves the app can be configured from the UI alone.

## Capabilities

### New Capabilities
- `settings-provider-secrets`: Manage provider API keys through the Settings UI and have runtime behavior depend on the persisted secrets instead of test-only environment injection.
- `live-e2e-ui-setup`: Prepare live E2E scenarios by navigating the app UI to save required provider keys before validating the main workflow.

### Modified Capabilities
- None.

## Impact

- Affected code: `src/app/main.ts`, `src/app/ipc-settings.ts`, `e2e/electron-fixtures.ts`, `e2e/helpers/electron-api-helper.ts`, `e2e/pages/settings.page.ts`, and live E2E specs under `e2e/tests-flow/`.
- Removes app-level test secret bootstrap and reduces test-only IPC surface area.
- Shifts live E2E setup responsibility into Playwright page flows and fixture orchestration.
