## ADDED Requirements

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
