## Context

Live E2E currently launches Electron with required provider API keys in the process environment, and the app converts those environment values into a stub secrets repository during startup. The E2E suite then validates and mutates secrets through test-only IPC helpers instead of driving the Settings UI end to end. This makes app bootstrap depend on test mode branches in `src/app/main.ts` and `src/app/ipc-settings.ts`, while the Settings page objects already expose most of the interactions needed to configure provider keys through the renderer.

## Goals / Non-Goals

**Goals:**
- Remove app-side test secret bootstrap based on `OPENROUTER_API_KEY` and `GOOGLE_MAPS_API_KEY`.
- Keep live E2E runs isolated by starting from a clean data directory and proving the required keys are absent before setup.
- Move live E2E setup to reusable Playwright UI helpers that add provider keys through the Settings screens.
- Preserve existing live-flow coverage after the new setup path configures the app.

**Non-Goals:**
- Redesign the Settings UI or change how users manage provider keys outside the existing add/replace/clear controls.
- Remove all test-specific IPC; only the raw secret bootstrap helpers in scope for this change need to go.
- Change provider validation behavior, model selection, or unrelated settings flows.

## Decisions

### Remove environment-to-secrets bootstrap from the app
The app will always construct its secrets repository from persisted storage, including in E2E mode. Test isolation will continue to come from `ELECTRON_TEST_DATA_DIR`, but provider credentials will no longer be copied from process environment into repository state at startup.

Alternative considered: keep the bootstrap and only add extra UI assertions. Rejected because it still leaves the production app carrying test-only secret initialization logic and does not prove that a clean install can be configured from the UI.

### Keep environment variables in the Playwright runner, not in app runtime logic
The E2E fixture will still require the live keys from the shell or `.env` file so CI and local runs can supply real credentials. Those values will be consumed only by the Playwright test process and passed into Settings UI form fields, not by Electron main-process bootstrap.

Alternative considered: store test credentials in a fixture file under the temp data directory before launch. Rejected because it duplicates the persistence format and recreates the same out-of-band setup path this change is trying to remove.

### Replace raw secret IPC setup with page-object driven UI setup
Add a reusable helper around `SettingsPage` that can navigate to the relevant settings sections, assert each key is initially unset, save the provided value, and verify the UI switches to the "replace" state. Live-flow tests can call that helper during setup, and the runtime-contract test can shift from asserting injected secrets to asserting clean-start plus successful UI configuration.

Alternative considered: continue using `settings:secrets:save` or `settings:secrets:load-raw` behind helper methods. Rejected because it bypasses the product UI and leaves unused test-only main-process APIs.

## Risks / Trade-offs

- Fresh live E2E runs spend more time in Settings before the main workflow starts -> Mitigation: keep setup in a reusable helper and only configure the two required providers.
- UI selectors for provider secret cards can become brittle if copy changes -> Mitigation: centralize interactions in `SettingsPage` and use existing accessible labels like `OpenRouter API-Schlüssel` and `Google Maps API-Schlüssel`.
- Removing raw secret IPC can reduce observability in tests -> Mitigation: assert the visible add/replace button states before and after save, and keep workflow-level assertions that missing-key warnings disappear after setup.
- Persisted-storage-only startup could expose hidden assumptions in test fixtures -> Mitigation: update the runtime-contract spec to verify clean launch behavior explicitly before live-flow tests rely on it.
