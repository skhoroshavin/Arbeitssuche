## MODIFIED Requirements

### Requirement: Job search creation starts in a wizard

The system SHALL navigate to a dedicated job-search creation wizard page instead of creating a persisted job search immediately.

#### Scenario: New search navigates to wizard

- **WHEN** the user initiates job search creation from the applicant overview
- **THEN** the system navigates to the job-search creation wizard for that applicant
- **THEN** the system SHALL NOT create a persisted job search before the wizard is finished

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

## ADDED Requirements

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
