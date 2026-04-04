## ADDED Requirements

### Requirement: SiteCrawler service fetches vacancy details from job sites

The `site-crawler` service SHALL accept a list of job sites and a `JobSearchCriteria`, iterate through search result pages, and invoke an `onResult` callback for each `VacancyDetails` retrieved. It SHALL derive the plugin-level `SearchCriteria` from `JobSearchCriteria` internally when calling job site plugins.

#### Scenario: Crawl multiple sites sequentially

- **WHEN** `SiteCrawler.crawl()` is called with two job sites
- **THEN** the crawler SHALL process each site sequentially, paginating through results, and call `onResult` for every vacancy detail fetched from both sites

#### Scenario: Respect limit from criteria

- **WHEN** `JobSearchCriteria.limit` is set to 10 and a site returns more than 10 URLs
- **THEN** the crawler SHALL stop processing URLs for that site after 10

#### Scenario: Abort via signal

- **WHEN** the `AbortSignal` is triggered during crawling
- **THEN** the crawler SHALL stop fetching pages and return without processing further URLs

#### Scenario: Site does not support requested search mode

- **WHEN** a site does not support the requested search mode and no fallback mode is available
- **THEN** the crawler SHALL skip that site and continue to the next

#### Scenario: Search page fetch fails

- **WHEN** fetching a search page throws an error
- **THEN** the crawler SHALL stop pagination for that site and continue to the next site

#### Scenario: Single vacancy detail fetch fails

- **WHEN** fetching vacancy details for a single URL throws an error
- **THEN** the crawler SHALL skip that URL, report the error via `onProgress`, and continue to the next URL

### Requirement: VacancyProcessor normalizes crawl results into Vacancy objects

The `vacancy-processor` service SHALL convert raw `VacancyDetails` into `Vacancy` domain objects, handling hashing, deduplication, markdown conversion, and merging with existing vacancies.

#### Scenario: New vacancy

- **WHEN** `process()` is called with `VacancyDetails` whose hash does not exist in the existing vacancies map
- **THEN** a new `Vacancy` SHALL be created with `enriched=false`, `enrichmentDirty=false`, and a "found" activity entry

#### Scenario: Existing vacancy with unchanged description

- **WHEN** `process()` is called with `VacancyDetails` whose hash matches an existing vacancy and the description has not changed
- **THEN** the existing vacancy SHALL be updated with merged URLs, addresses, and a new "found" activity, preserving `enriched` and `enrichmentDirty` flags

#### Scenario: Existing vacancy with changed description

- **WHEN** `process()` is called with `VacancyDetails` whose hash matches an existing vacancy and the description has changed
- **THEN** the vacancy SHALL be updated with the new description, `enrichmentDirty` set to `true`, and existing `enriched` flag preserved (so old summary is kept as "stale")

### Requirement: VacancyProcessor marks unseen vacancies as gone

The `vacancy-processor` service SHALL provide a `markUnseenAsGone` function that marks active vacancies not seen in the current crawl as inactive.

#### Scenario: Active vacancy not seen in crawl

- **WHEN** an active vacancy's hash is not in the seen hashes set
- **THEN** the vacancy SHALL be marked `active=false` with a "not-found" activity entry

#### Scenario: Already inactive vacancy not seen

- **WHEN** an already inactive vacancy's hash is not in the seen hashes set
- **THEN** the vacancy SHALL remain unchanged

### Requirement: VacancyEnricher enriches a single vacancy

The `vacancy-enricher` service SHALL take a `Vacancy` and an `EnrichContext` (applicant + preferences), run commute computation, LLM assessment, and LLM contact extraction, and return the enriched vacancy.

#### Scenario: Full enrichment with all dependencies available

- **WHEN** `enrich()` is called with an LLM client and commute client configured, and the vacancy has addresses and a description
- **THEN** the enricher SHALL compute commute, assess the vacancy via LLM, extract contacts via LLM, and return a vacancy with updated commute, summary, matchScore, and contact fields

#### Scenario: No LLM client configured

- **WHEN** `enrich()` is called without an LLM client
- **THEN** the enricher SHALL only compute commute (if commute client is available) and return the vacancy without assessment or contact extraction

#### Scenario: Commute computation fails

- **WHEN** commute API call throws an error
- **THEN** the enricher SHALL continue with LLM enrichment and return the vacancy without commute data

#### Scenario: LLM assessment fails

- **WHEN** the LLM assessment call throws an error
- **THEN** the enricher SHALL continue with contact extraction and return the vacancy without updated summary/matchScore

#### Scenario: Commute origin derived from applicant address

- **WHEN** `enrich()` is called with an applicant that has a personal address
- **THEN** the enricher SHALL derive the commute origin from `applicant.personal.address` without requiring a separate origin parameter

### Requirement: VacancyScanner orchestrates crawl, process, and enrich

The `vacancy-scanner` service SHALL compose `SiteCrawler`, `VacancyProcessor`, `VacancyEnricher`, and `EnrichQueue` into a single scan operation. It SHALL save raw vacancies immediately and queue enrichment in the background.

#### Scenario: Full scan pipeline

- **WHEN** `scan()` is called for a job search
- **THEN** the scanner SHALL crawl sites, process each result into a vacancy, save the raw vacancy, submit eligible vacancies to the enrichment queue, drain the queue after crawling completes, mark unseen vacancies as gone, and perform a final save

#### Scenario: Scanner is thin orchestrator

- **WHEN** the scanner is implemented
- **THEN** it SHALL contain no crawling, processing, or enrichment logic — only composition and coordination of the three services plus the enrich queue

### Requirement: JobSearchCriteria domain type in models

A `JobSearchCriteria` type SHALL be defined in `models/job-search/types.ts` containing `location`, `query`, `radiusKm`, `mode`, and `limit`. This replaces the `SearchParameters` type previously in `scan.ts`. The plugin-level `SearchCriteria` in `plugins/job-site/types.ts` SHALL remain unchanged and minimal.

#### Scenario: Crawler derives plugin SearchCriteria from JobSearchCriteria

- **WHEN** the site-crawler calls `site.getVacancyList()`
- **THEN** it SHALL pass a `SearchCriteria` derived from `JobSearchCriteria` (excluding `limit`, which is a crawler-level concern)
