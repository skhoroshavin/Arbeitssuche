# enrichment-state Specification

## Purpose

Defines how vacancy enrichment state is modeled, derived for UI display, and used for recovery after interrupted enrichment.

## Requirements

### Requirement: Vacancy model tracks enrichment state with two booleans

`VacancyDTO` and `Vacancy` SHALL include two new fields: `enriched: boolean` (has been successfully enriched at least once) and `enrichmentDirty: boolean` (needs enrichment or re-enrichment).

#### Scenario: New vacancy from crawl

- **WHEN** a new vacancy is created by the processor
- **THEN** it SHALL have `enriched=false` and `enrichmentDirty=false`

#### Scenario: Vacancy successfully enriched

- **WHEN** the enricher completes enrichment of a vacancy
- **THEN** the vacancy SHALL have `enriched=true` and `enrichmentDirty=false`

#### Scenario: Description changes on re-crawl

- **WHEN** a previously enriched vacancy is re-crawled with a changed description
- **THEN** the vacancy SHALL have `enriched=true` (preserving old summary) and `enrichmentDirty=true`

#### Scenario: User triggers re-enrichment

- **WHEN** a user requests re-enrichment of a vacancy
- **THEN** `enrichmentDirty` SHALL be set to `true` before enrichment begins

### Requirement: Four derived UI states from enrichment booleans

The UI SHALL derive a display state from the two boolean fields:

| enriched | dirty | Display state |
| -------- | ----- | ------------- |
| false    | false | plain         |
| false    | true  | pending       |
| true     | false | enriched      |
| true     | true  | stale         |

#### Scenario: Plain state display

- **WHEN** a vacancy has `enriched=false` and `enrichmentDirty=false`
- **THEN** the UI SHALL show the vacancy header only with a "not analyzed" label

#### Scenario: Pending state display

- **WHEN** a vacancy has `enriched=false` and `enrichmentDirty=true`
- **THEN** the UI SHALL show the vacancy header only with a spinner indicator

#### Scenario: Stale state display

- **WHEN** a vacancy has `enriched=true` and `enrichmentDirty=true`
- **THEN** the UI SHALL show the old summary with an "outdated" badge

#### Scenario: Enriched state display

- **WHEN** a vacancy has `enriched=true` and `enrichmentDirty=false`
- **THEN** the UI SHALL show the full card with summary and match score badge

### Requirement: descriptionChanged field is removed

The existing `descriptionChanged` boolean on `VacancyDTO` SHALL be removed. Its purpose is subsumed by `enrichmentDirty`.

#### Scenario: Migration of existing vacancies

- **WHEN** the application starts with existing vacancy data
- **THEN** vacancies with a non-empty `summary` SHALL have `enriched=true`, all others `enriched=false`. All vacancies SHALL have `enrichmentDirty=false`.

### Requirement: Crash recovery via enrichment state

On scan start or "enrich all unenriched", the system SHALL identify vacancies needing enrichment by querying for `enrichmentDirty=true` or `enriched=false`.

#### Scenario: App crash during enrichment

- **WHEN** the app crashes while enrichment is in progress (vacancies have `enrichmentDirty=true`)
- **THEN** on next scan or "enrich all unenriched", those vacancies SHALL be re-queued for enrichment automatically
