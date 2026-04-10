## ADDED Requirements

### Requirement: Job search creation starts in a wizard
The system SHALL open a job-search creation wizard from the applicant overview instead of creating a persisted job search immediately.

#### Scenario: New search opens wizard
- **WHEN** the user starts a new job search for an applicant and no resumable draft is selected
- **THEN** the system opens a job-search creation wizard for that applicant
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
The system SHALL present explicit draft handling choices when the user cancels the wizard after meaningful progress exists.

#### Scenario: Cancel offers draft choices
- **WHEN** the user cancels a wizard that has a meaningful draft
- **THEN** the system offers a way to continue editing the wizard
- **THEN** the system offers a way to keep the draft for later
- **THEN** the system offers a way to discard the draft

### Requirement: Finishing the wizard creates a real job search and opens the vacancy list
The system SHALL finalize the wizard into a persisted job search and transition the user into the normal vacancy-list workflow.

#### Scenario: Finish creates job search and opens vacancies
- **WHEN** the user finishes the wizard successfully
- **THEN** the system creates one persisted job search for the applicant from the wizard state
- **THEN** the system opens the vacancy list view for the created job search

#### Scenario: Finish starts initial update
- **WHEN** the user finishes the wizard successfully
- **THEN** the system starts the initial vacancy update automatically for the created job search
