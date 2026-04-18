## Context

The app is an Electron + React (Vite) desktop application for job seekers. It uses a SQLite database for entities (applicants, job searches, vacancies, cover letters), an encrypted JSON file for secrets (LLM API keys, Google Maps key), and an `electron-store` JSON file for config (LLM provider/model selection). The renderer uses React Router with `BrowserRouter` and React Query for IPC data fetching.

Currently there is no onboarding flow. When a new user opens the app they see an empty applicant list with no LLM configuration, no applicant, and no job search. The existing applicant and job-search creation wizards are standalone pages that navigate to the entity overview on finish. The wizard layout component (`DraftWizardPage`) provides a sidebar with step progression, Next/Back/Finish/Cancel footer, and an optional resume-prompt for drafts.

Key files:
- App entry: `src/app/main.ts` (Electron main), `src/ui/main.tsx` (renderer)
- Routes: `src/ui/app.tsx`
- Config: `src/app/config/electron-store.ts` (electron-store JSON)
- Secrets: `src/app/secrets/` (encrypted file via `safeStorage`)
- Database: `src/utils/node/database.ts` (SQLite via `DatabaseSync`)
- Data paths: `src/app/data-paths.ts` (`userData/data/`)

## Goals / Non-Goals

**Goals:**
- Guide new users through essential setup (LLM config, Google Maps, applicant creation, job search creation) on first launch
- Allow resuming the wizard if the app is closed mid-setup
- Allow skipping the wizard with an informed warning
- Never show the wizard again once completed or explicitly skipped on restart
- Provide a "clear all data" action in settings with confirmation and post-deletion screen

**Non-Goals:**
- Changing the existing applicant-wizard or job-search-wizard specs or internal behavior
- Migrating existing users who already have data (they simply never see the wizard)
- Supporting partial re-run of only one phase (settings, applicant, or job search) after initial setup is complete — users edit those individually later
- Offline-first wizard (LLM key verification requires network)

## Decisions

### 1. Setup state persistence via existing `electron-store`

Store `AppSetupState` alongside the existing `AppConfig` in the same `electron-store` instance, keyed separately.

**Rationale:** `electron-store` is already used for config. Adding a `setup` key avoids introducing a new persistence mechanism. The store is JSON, human-readable, and synced on write.

**Alternative considered:** SQLite table for setup state — rejected because setup state is a single record with no relational queries and electron-store is simpler.

**Shape:**
```ts
interface AppSetupState {
  completed: boolean
  lastPhase?: SetupPhase
  lastStep?: string
}
type SetupPhase = "settings" | "applicant" | "job-search"
```

- `completed: false` with `lastPhase`/`lastStep` set means the user was mid-wizard — resume prompt expected.
- `completed: false` with no `lastPhase` means fresh start — show wizard from beginning.
- `completed: true` means never show wizard again on launch.

### 2. IPC-based setup state access

Add IPC handlers under a `setup:` namespace:
- `setup:state:load` — returns `AppSetupState`
- `setup:state:save` — accepts partial updates, merges into existing state
- `setup:state:complete` — sets `completed: true`, clears `lastPhase`/`lastStep`
- `setup:clear-data` — deletes database file, resets config, clears secrets

**Rationale:** Consistent with the existing pattern (`settings:config:load`, `settings:config:save`, etc.). The main process owns file I/O; the renderer communicates via IPC.

### 3. First-start wizard as a routing-level orchestrator

Add a top-level route `/first-start` with sub-routes for each phase:
```
/first-start/settings
/first-start/applicant
/first-start/job-search
```

These phase-level routes are sufficient because the existing applicant and job-search wizards manage their internal steps via component state (`useState`), not via URL segments. The applicant wizard's steps (`personal`, `experience`, `education`, `certifications`, `other`) and the job-search wizard's steps (`parameters`, `mode`, `sources`, `preferences`, `cover-letter`) are all driven by `DraftWizardPage`'s `currentStep`/`setStep` props — there are no per-step URL routes today and none are needed.

The `FirstStartWizard` component is an orchestrator that:
1. Loads `AppSetupState` via React Query
2. If `completed: true` on app launch, the app routes normally (no wizard redirect)
3. If `completed: false` on app launch, the app redirects `/` → the route for `lastPhase` (or `/first-start/settings` if no `lastPhase` — i.e. fresh start)
4. Renders the current phase, persists `lastPhase`/`lastStep` on the setup state whenever the user advances
5. On phase completion, advances to next phase (or sets `completed: true` if last phase)
6. On app close mid-wizard, state is already persisted (auto-save pattern)

**Rationale:** Using React Router keeps the wizard navigable, supports deep-linking to a specific phase, and keeps each phase as a self-contained route that can be tested independently.

**Alternative considered:** Single-page state machine without route changes — rejected because the applicant and job-search wizard pages already use routes and `useNavigate`, so embedding them inside a non-routed container would require refactoring their navigation logic.

### 4. Resume behavior: setup state vs. draft state

When the app relaunches with an incomplete setup, two resume mechanisms could conflict:
- **Setup state** tracks `lastPhase`/`lastStep` and wants to resume the first-start wizard
- **Draft state** tracks meaningful drafts for applicant/job-search wizards and shows a "resume draft?" prompt

To avoid a double prompt (setup asking "resume setup?" + wizard asking "resume draft?"), the first-start orchestrator will:
1. On restart with `completed: false` and `lastPhase` set, show the setup-level resume prompt: "You were partway through setup. Resume from where you left off, or skip setup and use the app directly."
2. If the user chooses "resume", navigate to the correct phase route based on `lastPhase`
3. Within that phase, the embedded wizard page should **skip its own draft resume prompt** and go straight to `"editing"` phase with the existing draft snapshot loaded

This works because:
- The `FirstStartWizardContext` already provides `isInFirstStart: true`
- The existing `useDraftWizardInitialization` can detect `isInFirstStart` and suppress the `"resume-prompt"` phase, proceeding directly to `"editing"` with the saved snapshot
- The user already answered "resume" at the setup level, so a second prompt is redundant

If the user chooses "skip setup" on restart, the setup state is marked `completed: true` and the normal app loads. The next time the user opens the applicant or job-search wizard independently, the draft resume prompt works as usual.

**Alternative considered:** Always show both prompts — rejected because it creates a confusing double-prompt experience for a new user.

### 5. Reusing existing wizard pages as embedded routes

The applicant creation wizard (`ApplicantWizardPage`) and job-search creation wizard (`JobSearchWizardPage`) are full page components that call `useNavigate` on finish. Instead of modifying them, the first-start wizard will:

- Mount them at their existing routes (`/applicants/new`, `/applicants/:applicantId/job-searches/new`)
- Intercept navigation on finish by wrapping them with a context provider that overrides the post-finish destination

Introduce a `FirstStartWizardContext` that provides:
```ts
{ isInFirstStart: boolean; onPhaseComplete: (result) => void; skipDraftResume: boolean }
```

`skipDraftResume` is `true` when the setup-level resume prompt was accepted, signaling embedded wizards to skip their own draft resume prompt and go directly to editing.

When the applicant or job-search wizard finishes and detects this context, it calls `onPhaseComplete` instead of navigating to its default destination. When no context is present (normal usage), existing behavior is preserved.

**Rationale:** Minimally invasive to existing wizard components. Only a one-line conditional check at the finish handler in each wizard page.

**Alternative considered:** Duplicated wizard components under `/first-start/` — rejected because it creates two copies to maintain.

### 6. Settings phase as a wizard step (not linking to `/settings`)

The settings phase of the first-start wizard renders the existing `SettingsAI` and `SettingsMaps` components inline within the wizard layout, rather than redirecting to `/settings`.

This requires:
- A new `FirstStartSettingsStep` route under `/first-start/settings`
- It renders the provider/secret forms from `SettingsAI` and `SettingsMaps` as wizard steps
- A "Skip" button in the layout footer (wizard-layout enhancement)
- A warning dialog when skip is pressed

**Rationale:** Navigating to `/settings` would leave the first-start flow and confuse the user. Embedding the settings forms keeps the user inside the guided flow.

**Alternative considered:** Deep-linking to `/settings` with a "return to setup" banner — rejected because it breaks the sequential wizard flow and the sidebar step tracker.

### 7. Data clearing in the main process

The `setup:clear-data` IPC handler in the main process will:
1. Close the database connection
2. Delete the `arbeitssuche.db` file
3. Reset the `electron-store` config to `{}`
4. Delete the secrets file (`secrets.enc`)
5. Reset the setup state to `{ completed: false }` (no `lastPhase`)
6. Re-open the database (creates fresh file)
7. Send a response back to the renderer

The renderer then shows the post-deletion screen with "Close the app" and "Start configuration" buttons. The latter navigates to `/first-start/settings` (which triggers `setup:state:load`, sees `completed: false`, and starts the wizard).

**Rationale:** All file I/O must happen in the main process. Closing/reopening the database cleanly is essential to avoid locked-file errors on SQLite.

**Alternative considered:** Using separate IPC calls for each data type — rejected because partial deletion would leave inconsistent state. Clearing must be atomic from the user's perspective.

## Risks / Trade-offs

- **SQLite file lock during clear-data** → The handler closes the DB connection before deleting and re-opens after. If any IPC call arrives mid-clear, it will fail. Mitigation: block the renderer with a loading state during clear-data and show the post-deletion screen before any other interaction.
- **Config store race** → `setup:state:save` merges partial state. If two renderer tabs save concurrently (unlikely in Electron single-window), last-write-wins. This is acceptable since setup state is single-user and only written during the wizard.
- **Existing users with no setup state** → On first deploy of this feature, `setup:state:load` returns `null`. The app should check: if `setupState === null` AND the database already has at least one applicant, treat as `completed: true` (legacy user). This avoids surprising existing users with the wizard.
- **Wizard-layout "Skip" button** → Adding a Skip action modifies the `wizard-layout` spec. The Skip button is only visible during the settings phase of the first-start wizard. This is a minor addition to an existing spec.
- **Draft resume prompt suppression** → When the first-start orchestrator resumes into a wizard phase, it suppresses that wizard's own draft resume prompt (via `FirstStartWizardContext.skipDraftResume`). If this context is not wired correctly, the user sees a confusing double prompt. Mitigation: the `skipDraftResume` flag is derived from the same setup-state query that drives the resume prompt, so they are inherently consistent.