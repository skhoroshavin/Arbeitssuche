## 1. Model Changes

- [ ] 1.1 Add `enriched: boolean` and `enrichmentDirty: boolean` to `VacancyDTO` in `models/vacancy/types.ts`
- [ ] 1.2 Add the new fields to `Vacancy` class in `models/vacancy/vacancy.ts` and `resolveVacancy`
- [ ] 1.3 Remove `descriptionChanged` from `VacancyDTO`, `Vacancy`, and all references
- [ ] 1.4 Add `JobSearchCriteria` type to `models/job-search/types.ts` (location, query, radiusKm, mode, limit)
- [ ] 1.5 Update vacancy repository SQLite serialization to persist `enriched` and `enrichmentDirty`, drop `descriptionChanged`
- [ ] 1.6 Add migration logic: existing vacancies with non-empty `summary` get `enriched=true`, all get `enrichmentDirty=false`
- [ ] 1.7 Update vacancy model tests for new fields and removed `descriptionChanged`

## 2. Extract SiteCrawler Service

- [ ] 2.1 Create `services/site-crawler/` directory with `index.ts`, `site-crawler.ts`, `paginate.ts`
- [ ] 2.2 Move pagination logic from `scan.ts` into `paginate.ts` (scanSitePages, fetchSearchPage, collectNewUrls, sliceToLimit, shouldContinuePaging, resolveEffectiveMode)
- [ ] 2.3 Move `resolve-search-parameters.ts` from `vacancy-scanner/` to `site-crawler/`, update to return `JobSearchCriteria`
- [ ] 2.4 Implement `SiteCrawler.crawl()` accepting `CrawlOptions` with `JobSearchCriteria` and `onResult` callback
- [ ] 2.5 Add logic to derive plugin-level `SearchCriteria` from `JobSearchCriteria` inside the crawler
- [ ] 2.6 Add unit tests for SiteCrawler (pagination, limit, abort, mode fallback, error handling)

## 3. Extract VacancyProcessor Service

- [ ] 3.1 Create `services/vacancy-processor/` directory with `index.ts`, `process.ts`, `mark-unseen.ts`
- [ ] 3.2 Move `processOneCrawlResult` and merge logic from `unify.ts` into `process.ts`
- [ ] 3.3 Move `markUnseenAsGone` from `unify.ts` into `mark-unseen.ts`
- [ ] 3.4 Move `vacancy-hash.ts` and `markdown.ts` from `vacancy-scanner/` to `vacancy-processor/`
- [ ] 3.5 Update `process.ts` to set `enrichmentDirty=true` on new vacancies and on description change (instead of `descriptionChanged`)
- [ ] 3.6 Ensure merge logic preserves `enriched`, `enrichmentDirty`, `summary`, `matchScore`, `commute` from existing vacancy
- [ ] 3.7 Add unit tests for VacancyProcessor (new vacancy, merge unchanged, merge changed description, mark unseen)

## 4. Extract VacancyEnricher Service

- [ ] 4.1 Create `services/vacancy-enricher/` directory with `index.ts`, `vacancy-enricher.ts`
- [ ] 4.2 Move `assess.ts`, `extract-contact.ts`, `commute.ts` from `vacancy-scanner/` to `vacancy-enricher/`
- [ ] 4.3 Implement `VacancyEnricher` class with `constructor(deps: EnricherDeps)` and `enrich(vacancy, context): Promise<Vacancy>`
- [ ] 4.4 Derive commute origin from `applicant.personal.address` inside the enricher (remove `commuteOrigin` parameter)
- [ ] 4.5 Set `enriched=true` and `enrichmentDirty=false` on the returned vacancy after successful enrichment
- [ ] 4.6 Add unit tests for VacancyEnricher (full enrichment, no LLM, commute failure, LLM failure)

## 5. Implement EnrichQueue

- [ ] 5.1 Create `services/vacancy-scanner/enrich-queue.ts` with `EnrichQueue` class
- [ ] 5.2 Implement bounded concurrency: submit, drain, abort, pending/completed/total getters
- [ ] 5.3 Wire `onEnriched`, `onError`, `onProgress` callbacks
- [ ] 5.4 Ensure failed enrichments leave vacancy with `enrichmentDirty=true`
- [ ] 5.5 Add unit tests for EnrichQueue (concurrency limit, drain, abort, error handling, progress reporting)

## 6. Rewrite VacancyScanner Orchestrator

- [ ] 6.1 Rewrite `vacancy-scanner.ts` to compose SiteCrawler, VacancyProcessor, VacancyEnricher, and EnrichQueue
- [ ] 6.2 Wire crawler `onResult` → processor.process → save raw → queue.submit
- [ ] 6.3 Wire queue `onEnriched` → save enriched → emit progress
- [ ] 6.4 After crawler completes, call `queue.drain()`, then `markUnseenAsGone`, then final save
- [ ] 6.5 Remove old `scan.ts`, `unify.ts` and all moved files from `vacancy-scanner/`
- [ ] 6.6 Update `app/index.ts` to construct the new services and pass them to VacancyScanner
- [ ] 6.7 Verify existing scan behavior works end-to-end (manual or integration test)

## 7. Extend ProgressEvent and Crawl Manager

- [ ] 7.1 Add `enrichProgress?: { completed: number; total: number }` and `"enrich"` phase to `ProgressEvent` in `models/events.ts`
- [ ] 7.2 Update `crawl-manager.ts` to track phase (`crawling` / `enriching` / `done`) and enrichment progress per job search
- [ ] 7.3 Emit `ProgressEvent` with `phase: "enrich"` and `enrichProgress` from the enrichment queue callbacks

## 8. Re-enrichment IPC Channels

- [ ] 8.1 Add `vacancies:re-enrich` IPC handler: load vacancy, set `enrichmentDirty=true`, call enricher directly, save result
- [ ] 8.2 Add `vacancies:enrich-unenriched` IPC handler: query dirty/unenriched vacancies, run through EnrichQueue, report progress via `job:progress`
- [ ] 8.3 Add `vacancies:enrich:abort` IPC handler: abort a running batch enrichment
- [ ] 8.4 Register new handlers in `ipc-handlers/index.ts`

## 9. Global Progress Indicator UI

- [ ] 9.1 Create a progress indicator component that subscribes to `job:progress` IPC events
- [ ] 9.2 Render the indicator in `AppLayout` between the header and `<Outlet />`
- [ ] 9.3 Show phase label (crawling/enriching), progress bar with enrichment counts, and abort button
- [ ] 9.4 Auto-dismiss when phase becomes "done"
- [ ] 9.5 Wire abort button to `job-searches:crawl:abort` during crawl or `vacancies:enrich:abort` during enrichment-only

## 10. Enrichment State UI Indicators

- [ ] 10.1 Add enrichment state derivation helper (two booleans → plain/pending/stale/enriched)
- [ ] 10.2 Update vacancy card (`vacancy-card.tsx`) to show state-appropriate indicators: "not analyzed" label, spinner, "outdated" badge, or match score
- [ ] 10.3 Update vacancy detail view (`vacancy-detail.tsx`) with the same state indicators

## 11. Re-enrich Buttons

- [ ] 11.1 Add re-enrich button to `vacancy-card.tsx`, visible in `enriched` and `stale` states, with spinner during enrichment
- [ ] 11.2 Add re-enrich button to `vacancy-detail.tsx`, visible in `enriched` and `stale` states, with spinner during enrichment
- [ ] 11.3 Add "enrich all unenriched" button to `vacancy-list.tsx` filter bar/header, visible when unenriched vacancies exist
- [ ] 11.4 Toggle "enrich all unenriched" button to abort button while batch enrichment is running
- [ ] 11.5 Wire buttons to IPC channels (`vacancies:re-enrich`, `vacancies:enrich-unenriched`, `vacancies:enrich:abort`)

## 12. Cleanup and Verification

- [ ] 12.1 Remove dead `SearchParameters` type from old `scan.ts`
- [ ] 12.2 Update dependency-cruiser config if new service directories need boundary rules
- [ ] 12.3 Run `npm run verify` (lint, knip, depcruise, build) and fix any issues
- [ ] 12.4 Run `npm test` and fix any broken tests
- [ ] 12.5 Manual end-to-end test: start scan, observe concurrent enrichment, abort, re-enrich single, enrich all unenriched
