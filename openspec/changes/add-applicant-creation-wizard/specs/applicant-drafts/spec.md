## ADDED Requirements

### Requirement: Applicant drafts are globally unique
The system SHALL maintain at most one in-progress applicant draft for applicant creation.

#### Scenario: Saving draft replaces existing applicant draft
- **WHEN** the system saves applicant wizard progress while an applicant draft already exists
- **THEN** the system updates the existing applicant draft
- **THEN** the system SHALL NOT create a second concurrent applicant draft

### Requirement: Meaningful applicant drafts can be resumed before starting a new wizard
The system SHALL detect a meaningful saved applicant draft and ask the user whether to resume or discard it before starting a fresh applicant wizard.

#### Scenario: Existing meaningful draft prompts for resume choice
- **WHEN** the user starts creating a new applicant while a meaningful applicant draft exists
- **THEN** the system asks whether to resume the draft, discard it and start over, or stop starting a new applicant wizard

#### Scenario: Resuming draft restores wizard state
- **WHEN** the user chooses to resume an existing applicant draft
- **THEN** the system opens the applicant wizard with the saved draft state restored

### Requirement: Blank untouched applicant drafts are not resumable
The system SHALL NOT interrupt new applicant creation with a resume prompt for a stored applicant draft that has no meaningful user changes.

#### Scenario: Empty draft does not trigger resume prompt
- **WHEN** a stored applicant draft has no meaningful user changes
- **THEN** the system starts a fresh applicant wizard without showing a resume prompt

### Requirement: Applicant wizard progress is autosaved to draft storage
The system SHALL persist in-progress applicant wizard edits as draft state so the wizard can recover from interruption.

#### Scenario: Closing wizard after edits preserves draft
- **WHEN** the user closes the applicant wizard without discarding a meaningful in-progress draft
- **THEN** the system keeps the saved applicant draft for later recovery

#### Scenario: Discard removes applicant draft
- **WHEN** the user chooses to discard the applicant draft from the wizard cancel flow or resume prompt
- **THEN** the system deletes the saved applicant draft

### Requirement: Wizard cancellation offers keep or discard choices for meaningful drafts
The system SHALL present explicit draft handling choices when the user cancels the applicant wizard after meaningful progress exists.

#### Scenario: Cancel offers draft choices
- **WHEN** the user cancels an applicant wizard that has a meaningful draft
- **THEN** the system offers a way to continue editing the wizard
- **THEN** the system offers a way to keep the draft for later
- **THEN** the system offers a way to discard the draft
