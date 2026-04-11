# job-search-drafts Specification

## Purpose

TBD - created by archiving change job-search-wizard. Update Purpose after archive.

## Requirements

### Requirement: Job search drafts are unique per applicant

The system SHALL maintain at most one in-progress job-search draft for each applicant.

#### Scenario: Saving draft replaces existing draft for applicant

- **WHEN** the system saves draft progress for an applicant that already has a job-search draft
- **THEN** the system updates that applicant's existing draft
- **THEN** the system SHALL NOT create a second concurrent job-search draft for the same applicant

### Requirement: Meaningful drafts can be resumed before starting a new wizard

The system SHALL detect resumable job-search drafts for an applicant and ask the user whether to resume or discard them before starting a fresh wizard.

#### Scenario: Existing meaningful draft prompts for resume choice

- **WHEN** the user starts a new job search for an applicant who has a meaningful saved draft
- **THEN** the system asks whether to resume the draft, discard it and start over, or stop starting a new wizard

#### Scenario: Resuming draft restores wizard state

- **WHEN** the user chooses to resume an existing draft
- **THEN** the system opens the wizard with the saved draft state restored

### Requirement: Blank untouched drafts are not resumable

The system SHALL NOT interrupt new job-search creation with resume prompts for drafts that do not contain meaningful user changes.

#### Scenario: Empty draft does not trigger resume prompt

- **WHEN** a stored draft has no meaningful user changes
- **THEN** the system starts a fresh wizard without showing a resume prompt

### Requirement: Wizard progress is autosaved to draft storage

The system SHALL persist in-progress wizard edits as job-search draft state so the wizard can recover from interruption.

#### Scenario: Closing wizard after edits preserves draft

- **WHEN** the user closes the wizard without discarding a meaningful in-progress draft
- **THEN** the system keeps the saved draft for later recovery

#### Scenario: Discard removes draft

- **WHEN** the user chooses to discard the draft from the wizard cancel flow or resume prompt
- **THEN** the system deletes the applicant's saved job-search draft

### Requirement: Cover-letter generation works from draft state

The system SHALL allow the wizard cover-letter step to generate cover-letter content from the current applicant and draft job-search state.

#### Scenario: Generate cover letter from draft

- **WHEN** the user requests cover-letter generation in the wizard
- **THEN** the system generates cover-letter content using the applicant and current draft job-search state
- **THEN** the generated content becomes available in the wizard cover-letter step
