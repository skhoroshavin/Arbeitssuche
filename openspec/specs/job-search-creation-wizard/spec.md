# job-search-creation-wizard Specification

## Purpose

TBD - created by archiving change job-search-wizard. Update Purpose after archive.

## Requirements

### Requirement: Job search creation starts in a wizard

The system SHALL navigate to a dedicated job-search creation wizard page instead of creating a persisted job search immediately.

#### Scenario: New search navigates to wizard

- **WHEN** the user initiates job search creation from the applicant overview
- **THEN** the system navigates to the job-search creation wizard for that applicant
- **THEN** the system SHALL NOT create a persisted job search before the wizard is finished

### Requirement: Wizard exposes a two-step creation flow

The system SHALL provide a two-step job-search creation flow consisting of a search-configuration step followed by a cover-letter step.

#### Scenario: Wizard starts on configuration step

- **WHEN** the wizard opens
- **THEN** the first step shows the job-search configuration inputs
- **THEN** the first step offers a way to continue or cancel the wizard

#### Scenario: Wizard advances to cover-letter step

- **WHEN** the user continues from the configuration step
- **THEN** the wizard shows the cover-letter step
- **THEN** the cover-letter step offers a way to go back, finish, or cancel the wizard

### Requirement: Wizard cancellation offers keep or discard choices

The system SHALL present explicit draft handling choices when the user cancels the wizard after meaningful progress exists, and SHALL navigate to the applicant overview once the choice is resolved.

#### Scenario: Cancel with meaningful draft presents choices

- **WHEN** the user cancels a wizard that has a meaningful draft
- **THEN** the system offers a way to continue editing the wizard
- **THEN** the system offers a way to keep the draft and return to the applicant overview
- **THEN** the system offers a way to discard the draft and return to the applicant overview

#### Scenario: Keep draft navigates to applicant overview

- **WHEN** the user chooses to keep the draft after cancelling
- **THEN** the system saves the current draft state
- **THEN** the system navigates to the applicant overview

#### Scenario: Discard draft navigates to applicant overview

- **WHEN** the user chooses to discard the draft after cancelling
- **THEN** the system deletes the draft
- **THEN** the system navigates to the applicant overview

#### Scenario: Cancel with no meaningful draft

- **WHEN** the user cancels a wizard that has no meaningful draft
- **THEN** the system discards the empty draft
- **THEN** the system navigates to the applicant overview

### Requirement: Job-search wizard handles existing draft on entry

When the user navigates to the job-search creation wizard and a meaningful draft already exists for that applicant, the wizard SHALL present options to resume or discard it before proceeding to the editing flow.

#### Scenario: Meaningful draft found on entry

- **WHEN** the user navigates to the job-search creation wizard
- **AND** a meaningful job-search draft exists for the applicant
- **THEN** the wizard page SHALL present an option to resume the existing draft
- **THEN** the wizard page SHALL present an option to discard the draft and start fresh

#### Scenario: No meaningful draft found on entry

- **WHEN** the user navigates to the job-search creation wizard
- **AND** no meaningful job-search draft exists for the applicant
- **THEN** the wizard proceeds directly to the editing flow with a fresh draft

### Requirement: Finishing the wizard creates a real job search and opens the vacancy list

The system SHALL finalize the wizard into a persisted job search and transition the user into the normal vacancy-list workflow.

#### Scenario: Finish creates job search and opens vacancies

- **WHEN** the user finishes the wizard successfully
- **THEN** the system creates one persisted job search for the applicant from the wizard state
- **THEN** the system opens the vacancy list view for the created job search

#### Scenario: Finish starts initial update

- **WHEN** the user finishes the wizard successfully
- **THEN** the system starts the initial vacancy update automatically for the created job search
