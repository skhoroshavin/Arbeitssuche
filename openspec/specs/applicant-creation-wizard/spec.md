# applicant-creation-wizard Specification

## Purpose

TBD - created by archiving change add-applicant-creation-wizard. Update Purpose after archive.

## Requirements

### Requirement: Applicant creation starts in a wizard

The system SHALL navigate to a dedicated applicant creation wizard page instead of creating a persisted applicant immediately.

#### Scenario: New applicant navigates to wizard

- **WHEN** the user initiates applicant creation from the applicant list
- **THEN** the system navigates to the applicant creation wizard page
- **THEN** the system SHALL NOT create a persisted applicant before the wizard is finished

### Requirement: Applicant wizard exposes a multi-step creation flow

The system SHALL provide a multi-step applicant creation flow that guides the user through the applicant sections before finish.

#### Scenario: Wizard starts on personal step

- **WHEN** the applicant creation wizard opens
- **THEN** the first step shows the personal applicant inputs
- **THEN** the first step offers a way to continue or cancel the wizard

#### Scenario: Wizard advances through applicant sections

- **WHEN** the user continues through the applicant creation wizard
- **THEN** the wizard shows the applicant sections in sequence
- **THEN** each non-initial step offers a way to go back

#### Scenario: Final step offers finish

- **WHEN** the user reaches the last applicant creation step
- **THEN** the wizard offers a way to go back, finish, or cancel the wizard

### Requirement: Finishing the wizard creates a real applicant and opens the applicant workflow

The system SHALL finalize the applicant wizard into one persisted applicant and transition the user into the normal applicant experience.

#### Scenario: Finish creates applicant and opens overview

- **WHEN** the user finishes the applicant wizard successfully
- **THEN** the system creates one persisted applicant from the wizard state
- **THEN** the system opens the overview for the created applicant

#### Scenario: Persisted applicant uses wizard data

- **WHEN** the user finishes the applicant wizard successfully
- **THEN** the created applicant contains the data entered across the wizard steps
- **THEN** the created applicant can be edited through the existing applicant routes

### Requirement: Applicant wizard handles existing draft on entry

When the user navigates to the applicant creation wizard and a meaningful draft already exists, the wizard SHALL present options to resume or discard it before proceeding to the editing flow.

#### Scenario: Meaningful draft found on entry

- **WHEN** the user navigates to the applicant creation wizard
- **AND** a meaningful applicant draft exists
- **THEN** the wizard page SHALL present an option to resume the existing draft
- **THEN** the wizard page SHALL present an option to discard the draft and start fresh

#### Scenario: No meaningful draft found on entry

- **WHEN** the user navigates to the applicant creation wizard
- **AND** no meaningful applicant draft exists
- **THEN** the wizard proceeds directly to the editing flow with a fresh draft

### Requirement: Cancelling the applicant wizard navigates to the applicant list

The system SHALL navigate the user back to the applicant list when the wizard is cancelled, after resolving any draft handling choices.

#### Scenario: Cancel with no meaningful draft

- **WHEN** the user cancels the applicant creation wizard
- **AND** no meaningful draft exists
- **THEN** the system discards the empty draft
- **THEN** the system navigates to the applicant list

#### Scenario: Cancel with meaningful draft presents choices

- **WHEN** the user cancels the applicant creation wizard
- **AND** a meaningful draft exists
- **THEN** the system presents draft handling choices: continue editing, keep draft, or discard draft

#### Scenario: Keep draft navigates to applicant list

- **WHEN** the user chooses to keep the draft after cancelling
- **THEN** the system saves the current draft state
- **THEN** the system navigates to the applicant list

#### Scenario: Discard draft navigates to applicant list

- **WHEN** the user chooses to discard the draft after cancelling
- **THEN** the system deletes the draft
- **THEN** the system navigates to the applicant list
