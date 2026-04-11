# enrichment-progress Specification

## Purpose

Defines global progress reporting for crawl and enrichment phases, including abort behavior and progress event shape.

## Requirements

### Requirement: Global progress indicator in AppLayout

A persistent progress indicator SHALL be rendered in `AppLayout` (between the header and the page outlet) that remains visible regardless of which page the user is on.

#### Scenario: No active work

- **WHEN** no crawl or enrichment is running
- **THEN** the progress indicator SHALL be hidden

#### Scenario: Crawl in progress

- **WHEN** a crawl is running
- **THEN** the indicator SHALL show the "crawling" phase label and crawl progress messages

#### Scenario: Enrichment in progress after crawl

- **WHEN** the crawl has finished but enrichment tasks are still running
- **THEN** the indicator SHALL show the "enriching" phase label with progress (for example, "Enriching 12/47")

#### Scenario: All work complete

- **WHEN** both crawl and enrichment finish
- **THEN** the indicator SHALL auto-dismiss

#### Scenario: User navigates away during enrichment

- **WHEN** the user navigates from the job search page to settings while enrichment is running
- **THEN** the progress indicator SHALL remain visible and continue updating

### Requirement: Abort button in progress indicator

The global progress indicator SHALL include an abort button that stops all active work for the current job search.

#### Scenario: Abort during crawl

- **WHEN** the user clicks abort while crawling is in progress
- **THEN** both crawling and any queued/in-flight enrichments SHALL be stopped

#### Scenario: Abort during enrichment-only phase

- **WHEN** the user clicks abort while only enrichment is running (crawl already finished)
- **THEN** all queued and in-flight enrichments SHALL be stopped

#### Scenario: State after abort

- **WHEN** abort completes
- **THEN** the progress indicator SHALL dismiss, vacancies that were not enriched SHALL retain `enrichmentDirty=true` for later recovery

### Requirement: ProgressEvent extended with enrichment data

`ProgressEvent` SHALL include an optional `enrichProgress` field with `completed` and `total` counts, and the `phase` field SHALL support `"enrich"` as a value.

#### Scenario: Enrichment progress events emitted

- **WHEN** an enrichment task completes in the queue
- **THEN** a `ProgressEvent` SHALL be emitted with `phase: "enrich"`, `enrichProgress: { completed, total }`, and `vacanciesUpdated: true`

#### Scenario: Backward compatibility

- **WHEN** existing UI components receive a `ProgressEvent` with the new `enrichProgress` field
- **THEN** they SHALL continue to function correctly (the field is optional)
