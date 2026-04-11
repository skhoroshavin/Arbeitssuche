# applicant-creation-wizard Specification

## Purpose

TBD - created by archiving change add-applicant-creation-wizard. Update Purpose after archive.

## Requirements

### Requirement: Applicant creation starts in a wizard

The system SHALL open an applicant creation wizard from the applicant list instead of creating a persisted applicant immediately.

#### Scenario: New applicant opens wizard

- **WHEN** the user starts creating a new applicant and no resumable applicant draft is selected
- **THEN** the system opens an applicant creation wizard
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
