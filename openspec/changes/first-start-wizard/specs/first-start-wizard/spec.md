## ADDED Requirements

### Requirement: App detects whether initial setup has been completed

The system SHALL persist an `AppSetupState` record that tracks whether the first-start wizard has been completed, the last active phase and step if it was interrupted, and the created applicant ID once the applicant phase is finished.

#### Scenario: Fresh install with no setup state

- **WHEN** the app launches and `AppSetupState.completed` is `false` and no `lastPhase` is set
- **THEN** the system SHALL redirect to `/first-start/settings`
- **THEN** the first-start wizard begins from the settings phase

#### Scenario: Interrupted setup with persisted phase

- **WHEN** the app launches and `AppSetupState.completed` is `false` and `lastPhase` is set
- **THEN** the system SHALL show a resume prompt offering to continue from the last active phase or skip setup entirely

#### Scenario: Completed setup

- **WHEN** the app launches and `AppSetupState.completed` is `true`
- **THEN** the system SHALL NOT show the first-start wizard
- **THEN** the system SHALL load the normal app routes

#### Scenario: Existing user with no setup state record

- **WHEN** the app launches and no `AppSetupState` record exists
- **AND** the database already contains at least one applicant
- **THEN** the system SHALL treat the setup as completed (`completed: true`)
- **THEN** the system SHALL NOT show the first-start wizard

#### Scenario: Existing user with no setup state and no data

- **WHEN** the app launches and no `AppSetupState` record exists
- **AND** the database contains no applicants
- **THEN** the system SHALL treat the setup as incomplete (`completed: false`)
- **THEN** the system SHALL redirect to `/first-start/settings`

### Requirement: First-start wizard sequences three phases

The system SHALL guide the user through three sequential phases: settings configuration, applicant creation, and job search creation.

#### Scenario: Phase order

- **WHEN** the first-start wizard starts
- **THEN** the system SHALL present the phases in order: settings, applicant, job-search
- **THEN** each phase MUST complete before the next phase begins

#### Scenario: Advancing from settings phase

- **WHEN** the user completes or skips the settings phase
- **THEN** the system SHALL advance to the applicant creation phase
- **THEN** the system SHALL persist `lastPhase: "applicant"` to the `AppSetupState`

#### Scenario: Advancing from applicant phase

- **WHEN** the user completes the applicant creation wizard
- **THEN** the system SHALL advance to the job-search creation phase using the newly created applicant
- **THEN** the system SHALL persist `lastPhase: "job-search"` to the `AppSetupState`
- **THEN** the system SHALL persist the created applicant ID to the `AppSetupState`

#### Scenario: Completing the job-search phase

- **WHEN** the user completes the job-search creation wizard
- **THEN** the system SHALL set `AppSetupState.completed` to `true`
- **THEN** the system SHALL clear `lastPhase` and `lastStep` from `AppSetupState`
- **THEN** the system SHALL navigate to the normal app view for the created job search

### Requirement: Settings phase is skippable with a warning

The system SHALL allow the user to skip the settings configuration phase, but only after displaying a warning.

#### Scenario: Skip button shown on settings phase

- **WHEN** the first-start wizard is on the settings phase
- **THEN** the footer SHALL show a Skip button

#### Scenario: Skip triggers a warning

- **WHEN** the user presses the Skip button on the settings phase
- **THEN** the system SHALL display a warning dialog explaining that core features (LLM analysis, cover letter generation, commute calculation) will not function without configuration

#### Scenario: User confirms skip

- **WHEN** the user confirms the skip warning
- **THEN** the system SHALL advance to the applicant creation phase
- **THEN** the system SHALL persist `lastPhase: "applicant"` to the `AppSetupState`

#### Scenario: User cancels skip

- **WHEN** the user dismisses the skip warning without confirming
- **THEN** the system SHALL remain on the settings phase

### Requirement: Setup persists progress for resumption

The system SHALL persist the current phase and step to `AppSetupState` whenever the user advances within the first-start wizard.

#### Scenario: Phase progress persisted on advance

- **WHEN** the user advances from one phase to the next within the first-start wizard
- **THEN** the system SHALL update `lastPhase` in `AppSetupState` to reflect the new phase

#### Scenario: Step progress persisted within a phase

- **WHEN** the user advances a step within a wizard phase
- **THEN** the system SHALL update `lastStep` in `AppSetupState` to reflect the new step

### Requirement: Interrupted setup offers resume or skip on restart

When the app relaunches with an incomplete setup, the system SHALL ask the user whether to resume or skip.

#### Scenario: Resume prompt shown on restart

- **WHEN** the app launches and `AppSetupState.completed` is `false` and `lastPhase` is set
- **THEN** the system SHALL display a prompt informing the user that setup was interrupted
- **THEN** the prompt SHALL offer a "Resume setup" option that continues from the last active phase
- **THEN** the prompt SHALL offer a "Skip setup" option that marks setup as completed and loads the normal app

#### Scenario: User chooses to resume

- **WHEN** the user selects "Resume setup"
- **THEN** the system SHALL navigate to the route corresponding to `lastPhase`
- **THEN** embedded wizard phases SHALL skip their own draft resume prompt and proceed directly to editing with the saved draft snapshot

#### Scenario: User chooses to skip

- **WHEN** the user selects "Skip setup"
- **THEN** the system SHALL set `AppSetupState.completed` to `true`
- **THEN** the system SHALL clear `lastPhase` and `lastStep`
- **THEN** the system SHALL load the normal app routes

### Requirement: First-start wizard embeds existing creation wizards

The first-start wizard SHALL embed the existing applicant and job-search creation wizards within its flow.

#### Scenario: Applicant wizard embedded in first-start

- **WHEN** the first-start wizard is on the applicant phase
- **THEN** the system SHALL render the applicant creation wizard
- **THEN** on finish, the system SHALL advance to the job-search phase instead of navigating to the applicant overview
- **THEN** the created applicant's ID SHALL be passed to the job-search phase

#### Scenario: Job-search wizard embedded in first-start

- **WHEN** the first-start wizard is on the job-search phase
- **THEN** the system SHALL render the job-search creation wizard for the applicant created in the previous phase
- **THEN** on finish, the system SHALL mark setup as completed instead of navigating to the vacancy list
- **THEN** the system SHALL then navigate to the normal app view for the created job search

#### Scenario: Draft resume prompt suppressed in first-start context

- **WHEN** a wizard phase is rendered within the first-start flow
- **AND** a meaningful draft exists for that wizard
- **AND** the user resumed setup from the setup-level prompt
- **THEN** the wizard SHALL skip its own draft resume prompt
- **THEN** the wizard SHALL proceed directly to editing with the saved draft snapshot

### Requirement: Setup state is accessible via IPC

The system SHALL provide IPC handlers for reading and writing the setup state.

#### Scenario: Load setup state

- **WHEN** the renderer invokes `setup:state:load`
- **THEN** the main process SHALL return the current `AppSetupState`

#### Scenario: Save setup state

- **WHEN** the renderer invokes `setup:state:save` with a partial state update
- **THEN** the main process SHALL merge the partial update into the existing `AppSetupState`
- **THEN** the main process SHALL persist the merged state

#### Scenario: Complete setup

- **WHEN** the renderer invokes `setup:state:complete`
- **THEN** the main process SHALL set `completed: true` and clear `lastPhase` and `lastStep`
