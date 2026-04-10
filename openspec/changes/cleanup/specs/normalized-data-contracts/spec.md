## ADDED Requirements

### Requirement: Shared normalization helpers define canonical optional-text handling

The system MUST define canonical shared helpers for optional-text normalization so internal callers do not reimplement trimming, empty-string rejection, or sentinel-value rejection independently.

#### Scenario: Plugin normalizes extracted text
- **WHEN** a job-site plugin normalizes extracted address or contact text
- **THEN** it MUST use the shared normalization behavior for trimming and empty-value suppression
- **AND** duplicated plugin-local copies of the same optional-text normalization logic are not required

### Requirement: Shared helpers assemble addresses and suppress empty contacts consistently

The system MUST provide shared helpers for assembling normalized address strings from optional parts and for collapsing contacts with no remaining fields to `undefined`.

#### Scenario: Address parts contain blanks
- **WHEN** a caller passes optional address parts with blanks, `null`, or missing values
- **THEN** the shared address helper MUST omit the empty parts
- **AND** it MUST return `undefined` when no normalized parts remain

#### Scenario: Contact contains no normalized values
- **WHEN** a caller passes a contact whose name, email, and phone normalize to empty values
- **THEN** the shared contact helper MUST return `undefined`

### Requirement: Domain helpers consume domain-valid shapes only

Model-layer formatting and normalization helpers MUST consume only domain-valid types, while UI form hooks MUST own conversion between form-only representations and domain representations.

#### Scenario: Applicant formatter receives highlights
- **WHEN** applicant model formatting code receives `highlights` or `personalNotes`
- **THEN** it MUST treat them according to the applicant domain types
- **AND** it MUST NOT require unions that exist only for textarea form state

### Requirement: UI view-model hooks expose stable collection defaults

UI data hooks that exist to support list or collection views MUST expose stable empty collections when data has not loaded yet, so page components do not need repeated `undefined` guards for the collection shape itself.

#### Scenario: Applicant list view renders before query completion
- **WHEN** a list-view hook is consumed before its backing query resolves
- **THEN** the hook MUST still expose the expected collection field with an empty collection value
- **AND** page components can read the collection without first checking for `undefined`
