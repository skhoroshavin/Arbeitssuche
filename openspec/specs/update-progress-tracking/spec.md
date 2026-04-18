# update-progress-tracking Specification

## Purpose

Defines how scan and enrichment progress is tracked, reported, and displayed — including independent dual progress indicators, progress event shape, queue concurrency, scan-time parallelism, enrichment state model, eligibility rules, and legacy crawl log removal.

## Requirements

### Requirement: Two independent progress indicators

The global progress area SHALL render two separate progress rows — one for scan progress and one for analysis (enrichment) progress — that are independently visible and updated.

#### Scenario: Only scan is active

- **WHEN** a scan is running and no enrichment is in progress
- **THEN** the scan progress row SHALL be visible showing the scan label, and the enrichment row SHALL be hidden

#### Scenario: Only analysis is active

- **WHEN** enrichment is running and no scan is in progress
- **THEN** the enrichment progress row SHALL be visible showing the enrichment label and progress bar, and the scan row SHALL be hidden

#### Scenario: Both scan and analysis are active concurrently

- **WHEN** both scan and enrichment are running in parallel
- **THEN** both rows SHALL be visible simultaneously, each with its own label, progress information, and abort button

#### Scenario: Neither is active

- **WHEN** no scan or enrichment is running
- **THEN** the global progress area SHALL be hidden

#### Scenario: User navigates away during active work

- **WHEN** the user navigates from the job search page to settings while a scan or enrichment is running
- **THEN** the progress area SHALL remain visible and continue updating

### Requirement: Scan progress row content

The scan progress row SHALL display a "Wird gescannt..." label, an animated indicator, and an abort button.

#### Scenario: Scan in progress

- **WHEN** a scan is running
- **THEN** the scan row SHALL show "Wird gescannt..." with a pulsing dot and an "Abbrechen" abort button that stops the crawl

#### Scenario: Scan completes

- **WHEN** a scan finishes (receives a done/complete event with source "crawl")
- **THEN** the scan row SHALL dismiss

#### Scenario: Abort during scan

- **WHEN** the user clicks abort while scanning is in progress
- **THEN** both crawling and any queued/in-flight enrichments SHALL be stopped

#### Scenario: State after abort during scan

- **WHEN** abort completes during a scan
- **THEN** the progress area SHALL dismiss, vacancies that were not enriched SHALL retain `enrichmentDirty=true` for later recovery

### Requirement: Enrichment progress row content

The enrichment progress row SHALL display a "Wird analysiert..." label, a progress bar with completed/total counts, and an abort button.

#### Scenario: Enrichment in progress

- **WHEN** enrichment is running
- **THEN** the enrichment row SHALL show "Wird analysiert..." with the enrich progress bar (completed/total) and an "Abbrechen" abort button that stops enrichments

#### Scenario: Enrichment completes

- **WHEN** enrichment finishes (receives a done event with source "enrich")
- **THEN** the enrichment row SHALL dismiss

#### Scenario: Abort during enrichment-only phase

- **WHEN** the user clicks abort while only enrichment is running (scan already finished)
- **THEN** all queued and in-flight enrichments SHALL be stopped

#### Scenario: State after abort during enrichment

- **WHEN** abort completes during enrichment
- **THEN** the enrichment row SHALL dismiss, vacancies that were not enriched SHALL retain `enrichmentDirty=true` for later recovery

### Requirement: Independent event routing

Scan and enrichment progress events from the `job:progress` channel SHALL be routed to their respective states based on the event `phase` field.

#### Scenario: Scan phase event received

- **WHEN** a `job:progress` event arrives with `phase: "search"` or `phase: "scan"`
- **THEN** only the scan progress state SHALL be updated

#### Scenario: Enrich phase event received

- **WHEN** a `job:progress` event arrives with `phase: "enrich"`
- **THEN** only the enrichment progress state SHALL be updated

#### Scenario: Done event with source field

- **WHEN** a `job:progress` event arrives with `phase: "done"` and `source: "crawl"`
- **THEN** only the scan progress state SHALL be cleared

- **WHEN** a `job:progress` event arrives with `phase: "done"` and `source: "enrich"`
- **THEN** only the enrichment progress state SHALL be cleared

#### Scenario: Done event without source field

- **WHEN** a `job:progress` event arrives with `phase: "done"` without a `source` field
- **THEN** both scan and enrichment progress states SHALL be cleared

### Requirement: Source field on progress events

`ProgressEvent` SHALL include an optional `source` field with value `"crawl"` or `"enrich"` to identify which subsystem emitted the event. The `source` field SHALL be included by `ipc-crawl.ts` and `ipc-vacancies.ts` on completion events.

#### Scenario: Crawl completion event

- **WHEN** the crawl completes or errors in `ipc-crawl.ts`
- **THEN** the `job:progress` event SHALL include `source: "crawl"`

#### Scenario: Enrichment completion event

- **WHEN** enrichment finishes in `ipc-vacancies.ts`
- **THEN** the `job:progress` event SHALL include `source: "enrich"`

#### Scenario: Backward compatibility

- **WHEN** existing UI components receive a `ProgressEvent` without the `source` field
- **THEN** they SHALL continue to function correctly (the field is optional)

### Requirement: ProgressEvent extended with enrichment data

`ProgressEvent` SHALL include an optional `enrichProgress` field with `completed` and `total` counts, and the `phase` field SHALL support `"enrich"` as a value.

#### Scenario: Enrichment progress events emitted

- **WHEN** an enrichment task completes in the queue
- **THEN** a `ProgressEvent` SHALL be emitted with `phase: "enrich"`, `enrichProgress: { completed, total }`, and `vacanciesUpdated: true`

### Requirement: EnrichQueue runs enrichments with bounded concurrency

The `EnrichQueue` SHALL process submitted vacancies through the `VacancyEnricher` with a configurable maximum concurrency (default: 2 parallel enrichments).

#### Scenario: Submit while under concurrency limit

- **WHEN** a vacancy is submitted and fewer than `concurrency` enrichments are running
- **THEN** enrichment SHALL start immediately

#### Scenario: Submit while at concurrency limit

- **WHEN** a vacancy is submitted and `concurrency` enrichments are already running
- **THEN** the vacancy SHALL be queued and enrichment SHALL start when a running task completes

#### Scenario: Drain waits for all work

- **WHEN** `drain()` is called
- **THEN** it SHALL return a promise that resolves only when all queued and in-flight enrichments have completed

#### Scenario: Abort clears queue and signals in-flight tasks

- **WHEN** `abort()` is called
- **THEN** all queued (not yet started) enrichments SHALL be discarded and the abort signal SHALL be set for in-flight tasks

#### Scenario: Enrichment error does not block queue

- **WHEN** an enrichment task throws an error
- **THEN** the `onError` callback SHALL be invoked, the vacancy SHALL remain with `enrichmentDirty=true`, and the queue SHALL continue processing remaining items

### Requirement: Enrichment runs concurrently with crawling

During a scan, the `EnrichQueue` SHALL accept vacancy submissions while the `SiteCrawler` is still running. Crawling and enrichment SHALL proceed in parallel.

#### Scenario: Crawler produces results while enrichment runs

- **WHEN** the crawler finds a new vacancy while 2 enrichments are already in progress
- **THEN** the raw vacancy SHALL be saved immediately and queued for enrichment without waiting for in-flight enrichments to complete

#### Scenario: Crawler finishes before enrichment queue drains

- **WHEN** the crawler completes but enrichment tasks are still pending
- **THEN** the scanner SHALL wait for `queue.drain()` before marking unseen vacancies as gone and performing the final save

### Requirement: Skip enrichment when not needed

The scanner SHALL NOT submit a vacancy to the enrichment queue if it does not need enrichment.

#### Scenario: Re-crawled vacancy with unchanged description already enriched

- **WHEN** a re-crawled vacancy has `enriched=true` and `enrichmentDirty=false`
- **THEN** the scanner SHALL NOT submit it to the enrichment queue

#### Scenario: New vacancy eligible for enrichment

- **WHEN** a new vacancy is created by the processor
- **THEN** the scanner SHALL set `enrichmentDirty=true` and submit it to the enrichment queue

### Requirement: Vacancy model tracks enrichment state with two booleans

`VacancyDTO` and `Vacancy` SHALL include two fields: `enriched: boolean` (has been successfully enriched at least once) and `enrichmentDirty: boolean` (needs enrichment or re-enrichment).

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

### Requirement: Crash recovery via enrichment state

On scan start or "enrich all unenriched", the system SHALL identify vacancies needing enrichment by querying for `enrichmentDirty=true` or `enriched=false`.

#### Scenario: App crash during enrichment

- **WHEN** the app crashes while enrichment is in progress (vacancies have `enrichmentDirty=true`)
- **THEN** on next scan or "enrich all unenriched", those vacancies SHALL be re-queued for enrichment automatically

### Requirement: Legacy crawl log removed

The `CrawlProgressCard` component and `ProgressLog` component SHALL be removed. No page-level crawl log window SHALL be rendered.

#### Scenario: Crawl progress card no longer rendered

- **WHEN** a scan is running
- **THEN** no `CrawlProgressCard` or `ProgressLog` SHALL be rendered in the vacancy list page; all progress information is shown in the global progress area