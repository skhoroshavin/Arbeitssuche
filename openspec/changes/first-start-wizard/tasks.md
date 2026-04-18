## 1. Setup State Model and Persistence

- [ ] 1.1 Define `AppSetupState` type and `SetupPhase` union in `src/models/setup/` (exported from `index.ts`): `completed: boolean`, `lastPhase?: SetupPhase`, `lastStep?: string`
- [ ] 1.2 Add `setup` key support to `electron-store` config repository, or create a dedicated `SetupRepository` with `load()`, `save()`, `complete()`, `reset()` methods backed by `electron-store`
- [ ] 1.3 Add IPC handlers under `setup:` namespace in a new `src/app/ipc-setup.ts` file: `setup:state:load`, `setup:state:save`, `setup:state:complete`
- [ ] 1.4 Register `ipc-setup` handlers in `src/app/main.ts` alongside existing IPC registrations
- [ ] 1.5 Add React Query hooks in `src/ui/data/` for `useSetupState` (loads via `setup:state:load`) and `useSaveSetupState` (saves via `setup:state:save`)

## 2. Startup Redirect Logic

- [ ] 2.1 Add a `SetupGuard` component that queries `AppSetupState` on mount and redirects to `/first-start/settings` or the `lastPhase` route when `completed` is `false`
- [ ] 2.2 Implement legacy-user detection: if `setup:state:load` returns `null`, check whether any applicant exists; if yes, auto-set `completed: true`; if no, treat as `completed: false`
- [ ] 2.3 Wire `SetupGuard` into the root route (`/`) in `src/ui/app.tsx` so that the normal app only renders when setup is complete

## 3. First-Start Wizard Orchestrator

- [ ] 3.1 Create `FirstStartWizard` orchestrator component that loads `AppSetupState`, renders the current phase, and persists `lastPhase`/`lastStep` on advance
- [ ] 3.2 Add `/first-start` routes in `src/ui/app.tsx`: `/first-start/settings`, `/first-start/applicant`, `/first-start/job-search`
- [ ] 3.3 Implement the resume prompt screen shown on restart when `completed: false` and `lastPhase` is set — "Resume setup" vs "Skip setup" options
- [ ] 3.4 When "Resume setup" is chosen, navigate to the `lastPhase` route and set `skipDraftResume: true` in the `FirstStartWizardContext`
- [ ] 3.5 When "Skip setup" is chosen, invoke `setup:state:complete` and navigate to `/`

## 4. FirstStartWizardContext and Wizard Integration

- [ ] 4.1 Define and export `FirstStartWizardContext` with shape `{ isInFirstStart: boolean; onPhaseComplete: (result) => void; skipDraftResume: boolean }`
- [ ] 4.2 Wrap `FirstStartWizard`'s phase routes with the `FirstStartWizardContext` provider
- [ ] 4.3 Modify applicant wizard page (`src/ui/pages/applicant/views/wizard.tsx`) to check `FirstStartWizardContext` — on finish, call `onPhaseComplete` if `isInFirstStart`, otherwise navigate to applicant overview as before
- [ ] 4.4 Modify job-search wizard page (`src/ui/pages/job-search/views/wizard.tsx`) to check `FirstStartWizardContext` — on finish, call `onPhaseComplete` if `isInFirstStart`, otherwise navigate to vacancy list as before
- [ ] 4.5 Modify `useDraftWizardInitialization` to respect `skipDraftResume` from `FirstStartWizardContext` — when `skipDraftResume` is `true`, skip the `"resume-prompt"` phase and proceed directly to `"editing"`

## 5. Settings Phase in First-Start Wizard

- [ ] 5.1 Create `FirstStartSettingsStep` component at `/first-start/settings` that renders LLM provider and Google Maps configuration forms within the wizard layout
- [ ] 5.2 Wire the provider/secret forms from existing `SettingsAI` and `SettingsMaps` as wizard steps (AI as first step, Maps as second step)
- [ ] 5.3 On settings completion (Next on last settings sub-step), persist `lastPhase: "applicant"` and navigate to `/first-start/applicant`

## 6. Skip Button in Wizard Layout

- [ ] 6.1 Add optional `onSkip` prop to `DraftWizardPage` in `src/ui/layout/draft-wizard-page.tsx` — when provided, render a Skip button in the footer; when absent, no Skip button
- [ ] 6.2 Pass `onSkip` handler from `FirstStartSettingsStep` that opens a warning dialog explaining that core features will not work without configuration
- [ ] 6.3 On skip confirmation, persist `lastPhase: "applicant"` and navigate to `/first-start/applicant`

## 7. Applicant Phase in First-Start Wizard

- [ ] 7.1 Create the applicant phase route component that renders `ApplicantWizardPage` wrapped in `FirstStartWizardContext` with `isInFirstStart: true`
- [ ] 7.2 On `onPhaseComplete` from the applicant wizard, store the created applicant ID, persist `lastPhase: "job-search"` and `lastStep`, then navigate to `/first-start/job-search/:applicantId`

## 8. Job-Search Phase in First-Start Wizard

- [ ] 8.1 Create the job-search phase route component that renders `JobSearchWizardPage` for the applicant ID from the previous phase, wrapped in `FirstStartWizardContext` with `isInFirstStart: true`
- [ ] 8.2 On `onPhaseComplete` from the job-search wizard, invoke `setup:state:complete` and navigate to the vacancy list for the created job search (`/job-searches/:id/vacancies`)

## 9. Data Clear Feature

- [ ] 9.1 Add `setup:clear-data` IPC handler in `src/app/ipc-setup.ts` that closes DB, deletes `arbeitssuche.db`, resets config store to `{}`, deletes `secrets.enc`, resets setup state to `{ completed: false }`, re-opens DB, and returns success
- [ ] 9.2 Add React Query mutation hook `useClearAllData` in `src/ui/data/` that invokes `setup:clear-data`
- [ ] 9.3 Add "Clear all data" button in settings UI (new sub-section in `src/ui/pages/settings/`)
- [ ] 9.4 Create confirmation dialog component for clear-all-data warning
- [ ] 9.5 Create post-deletion screen component with "All data deleted" message, "Close the app" button (invokes `app:close` IPC), and "Start configuration" button (navigates to `/first-start/settings`)
- [ ] 9.6 Add a `app:close` IPC handler (or reuse existing) that calls `app.quit()` in the main process
- [ ] 9.7 Add `/data-cleared` route in `src/ui/app.tsx` for the post-deletion screen

## 10. Tests

- [ ] 10.1 Unit tests for `AppSetupState` model and `SetupRepository` (load, save, complete, reset, merge logic)
- [ ] 10.2 Unit tests for `setup:state:load`, `setup:state:save`, `setup:state:complete` IPC handlers
- [ ] 10.3 Unit tests for `setup:clear-data` IPC handler (verify DB file deletion, config reset, secrets deletion, DB re-open)
- [ ] 10.4 Component tests for `SetupGuard` redirect logic (completed, not completed, legacy user, new user)
- [ ] 10.5 Component tests for resume prompt (resume navigates to lastPhase, skip marks completed)
- [ ] 10.6 Component tests for `FirstStartWizardContext` integration (applicant finish advances to job-search, job-search finish marks completed)
- [ ] 10.7 Component tests for skip button in wizard layout footer (shown when `onSkip` provided, absent when not)
- [ ] 10.8 Component tests for draft resume suppression (`skipDraftResume: true` skips resume prompt)
- [ ] 10.9 Component tests for clear-all-data confirmation, cancellation, and post-deletion screen