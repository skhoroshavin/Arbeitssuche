## Why

New users have no guided onboarding experience — the app opens into its normal state without configuring LLM provider/keys or Google Maps, and without creating an applicant or job search. This leads to a confusing first-run where essential settings are missing and no data exists yet. A first-start wizard that walks users through configuration and initial data creation would make the app immediately usable and reduce setup friction.

## What Changes

- Introduce a first-start wizard that launches automatically when the app detects it has never completed initial setup
- The wizard guides users through three sequential phases: (1) settings configuration (LLM provider + Google Maps), (2) applicant creation, (3) job search creation
- Settings phase is skippable with a warning that core features will not work without configuration
- If the user closes the app mid-wizard and relaunches, they are asked whether to resume the wizard at the last active page or skip it and use the app directly
- Once the first-start wizard completes (or the user chooses to skip it on restart), it never appears again
- Add a "clear all data" option in settings that deletes all stored app data (database, config, secrets), shows a confirmation warning, and then offers either closing the app or restarting the first-start wizard

## Capabilities

### New Capabilities

- `first-start-wizard`: Orchestrates the first-start experience — detecting whether initial setup has been completed, sequencing the settings/applicant/job-search phases, handling skip/resume logic, and persisting the completion state so the wizard does not reappear
- `data-clear`: Provides the ability to delete all user data (database, config, secrets) from within the app, with a confirmation step and a post-deletion screen offering to close the app or restart the first-start wizard

### Modified Capabilities

- `wizard-layout`: The first-start wizard reuses the wizard layout pattern but needs to support a multi-phase orchestrator that chains independent wizards together, and a "skip" action on the settings phase
- `applicant-creation-wizard`: No requirement changes — the applicant wizard is embedded as a step inside the first-start wizard, but its own spec stays unchanged
- `job-search-creation-wizard`: No requirement changes — the job search wizard is embedded as a step inside the first-start wizard, but its own spec stays unchanged

## Impact

- **App startup flow** (`src/app/main.ts`, renderer entry): Needs to check persisted setup-completion state before deciding whether to show the wizard or the normal app
- **Config/repository layer**: New persistence for the "first setup completed" flag and the current wizard phase (for resume), likely in the existing config store or a new lightweight store
- **Routing** (`src/ui/app.tsx`): New routes for the first-start wizard phases and the post-data-clear screen
- **Settings UI** (`src/ui/pages/settings/`): New "clear all data" action and its confirmation/delete/post-delete views
- **IPC handlers**: New handler for clearing all data (database file deletion, config reset, secrets reset) and for reading/writing the setup state
- **Existing wizards**: Applicant and job-search creation wizards are reused as embedded steps; no spec-level changes needed but minor integration work to support being launched from the first-start orchestrator