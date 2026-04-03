## ADDED Requirements

### Requirement: Per-vacancy re-enrich via IPC

A `vacancies:re-enrich` IPC channel SHALL accept a job search ID and vacancy hash, set `enrichmentDirty=true`, run the enricher directly (not through the scan pipeline), save the enriched vacancy, and notify the UI.

#### Scenario: Re-enrich a single enriched vacancy

- **WHEN** the user triggers re-enrich for a vacancy that is in `enriched` state
- **THEN** `enrichmentDirty` SHALL be set to `true`, enrichment SHALL run, and on completion `enriched=true` and `enrichmentDirty=false` SHALL be saved

#### Scenario: Re-enrich a stale vacancy

- **WHEN** the user triggers re-enrich for a vacancy that is in `stale` state (`enriched=true`, `enrichmentDirty=true`)
- **THEN** enrichment SHALL run using the current description and the result SHALL overwrite the old summary

#### Scenario: Re-enrich fails

- **WHEN** the enricher throws an error during re-enrichment
- **THEN** `enrichmentDirty` SHALL remain `true` and the error SHALL be reported to the UI

### Requirement: Batch enrich unenriched via IPC

A `vacancies:enrich-unenriched` IPC channel SHALL accept a job search ID, query the vacancy repository for all vacancies where `enriched=false` OR `enrichmentDirty=true`, and process them through an `EnrichQueue`.

#### Scenario: Batch enrich after crash recovery

- **WHEN** the user clicks "enrich all unenriched" and there are vacancies with `enrichmentDirty=true` from a prior interrupted session
- **THEN** all such vacancies SHALL be queued for enrichment with progress reported via the global progress indicator

#### Scenario: Batch enrich after first LLM setup

- **WHEN** the user configures an LLM provider for the first time and clicks "enrich all unenriched"
- **THEN** all vacancies with `enriched=false` SHALL be queued for enrichment

#### Scenario: No vacancies need enrichment

- **WHEN** "enrich all unenriched" is called and no vacancies have `enriched=false` or `enrichmentDirty=true`
- **THEN** the operation SHALL complete immediately with no work done

### Requirement: Abort batch enrichment via IPC

A `vacancies:enrich:abort` IPC channel SHALL stop a running batch enrichment, clearing the queue and letting in-flight tasks finish.

#### Scenario: Abort running batch

- **WHEN** abort is called while batch enrichment is in progress
- **THEN** queued enrichments SHALL be discarded, in-flight tasks SHALL finish, and unenriched vacancies SHALL retain `enrichmentDirty=true`

### Requirement: Re-enrich button on vacancy cards and detail view

A re-enrich button SHALL be shown on vacancy cards in the list view (`vacancy-card.tsx`) and on the vacancy detail view (`vacancy-detail.tsx`).

#### Scenario: Button visible on enriched vacancy

- **WHEN** a vacancy is in `enriched` state
- **THEN** the re-enrich button SHALL be visible

#### Scenario: Button visible on stale vacancy

- **WHEN** a vacancy is in `stale` state
- **THEN** the re-enrich button SHALL be visible

#### Scenario: Button hidden on plain vacancy

- **WHEN** a vacancy is in `plain` state (never enriched, not dirty)
- **THEN** the re-enrich button SHALL NOT be shown (the vacancy will be picked up by "enrich all unenriched")

#### Scenario: Button hidden on pending vacancy

- **WHEN** a vacancy is in `pending` state (enrichment already queued)
- **THEN** the re-enrich button SHALL NOT be shown

#### Scenario: Spinner during re-enrichment

- **WHEN** the user clicks the re-enrich button
- **THEN** the button SHALL show a spinner until enrichment completes or fails

### Requirement: Enrich all unenriched button on vacancy list

An "enrich all unenriched" button SHALL be shown on the vacancy list view (`vacancy-list.tsx`) in the filter bar or header area.

#### Scenario: Button visible when unenriched vacancies exist

- **WHEN** the current job search has vacancies with `enriched=false` or `enrichmentDirty=true`
- **THEN** the button SHALL be visible

#### Scenario: Button hidden when all vacancies enriched

- **WHEN** all vacancies for the current job search have `enriched=true` and `enrichmentDirty=false`
- **THEN** the button SHALL be hidden

#### Scenario: Button becomes abort during batch

- **WHEN** batch enrichment is running
- **THEN** the button SHALL change to an abort button that stops the batch
