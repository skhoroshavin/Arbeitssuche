# Split Vacancy Scanner into Focused Services with Concurrent Enrichment

## Why

The vacancy-scanner service is a 420-line monolith that braids four distinct responsibilities into a single per-URL loop: crawling job sites, processing raw results into vacancies, enriching vacancies via LLM and commute APIs, and persisting results. This makes it hard to test, hard to change, and slow — enrichment blocks the crawler even though they have no data dependency after the initial crawl.

Enrichment (LLM assessment + contact extraction + commute) takes 5-10 seconds per vacancy and runs sequentially today. With 50 vacancies, that's 5-10 minutes of wall time where the crawler sits idle.

## What Changes

### 1. Decompose into four services

Split `services/vacancy-scanner/` into focused services:

- **`site-crawler`** — Fetches search pages from job sites, paginates, yields raw `VacancyDetails`. Owns pagination logic, search mode resolution, and URL deduplication.
- **`vacancy-processor`** — Normalizes `VacancyDetails` into `Vacancy` objects. Owns hashing, deduplication, markdown conversion, and merge-with-existing logic.
- **`vacancy-enricher`** — Takes a `Vacancy`, returns an enriched `Vacancy`. Owns commute computation, LLM assessment, and LLM contact extraction. Stateless — no concurrency awareness.
- **`vacancy-scanner`** — Thin orchestrator (~50-80 lines) that composes the above three services with a bounded enrichment queue.

### 2. Run enrichment concurrently with crawling

Introduce an `EnrichQueue` in the scanner that processes enrichments with bounded concurrency (2 parallel) while the crawler continues fetching new vacancies. Raw vacancies are saved immediately so the user sees results fast; enriched versions overwrite them as enrichment completes.

After the crawler finishes, the enrichment queue keeps draining. Enrichment progress is visible in the UI with a stop button.

Abort (user-initiated) kills both the crawler and the enrichment queue. Incomplete enrichments can be recovered via "enrich unenriched" button.

### 3. Add enrichment state to the Vacancy model

Add two boolean fields:

- `enriched: boolean` — has been successfully enriched at least once
- `enrichmentDirty: boolean` — needs (re-)enrichment

This produces four UI states:

| enriched | dirty | State | UI treatment |
|----------|-------|-------|-------------|
| false | false | plain | Header only, "not analyzed" label |
| false | true | pending | Header only, spinner |
| true | true | stale | Show old summary, "outdated" badge |
| true | false | enriched | Full card with summary + match score |

The "stale" state preserves the old summary while re-enrichment runs, which is better UX than today (where the old summary is discarded on description change).

Crash recovery is automatic: on next scan or "enrich unenriched", find all vacancies with `enrichmentDirty=true` and queue them.

### 4. Global progress indicator with abort

Crawl and enrichment progress must remain visible as the user navigates between pages (since enrichment continues after the crawler finishes and the user may leave the vacancy list). Add a persistent progress indicator in the app layout (not page-scoped) that shows:

- Current phase (crawling / enriching / done)
- Progress (e.g. "Enriching 12/47")
- An abort button that kills both crawl and enrichment

The indicator appears when a scan starts and disappears when all work (including enrichment) completes or is aborted.

### 5. Add re-enrichment UI actions

- **Per-vacancy "re-enrich" button** — sets `enrichmentDirty=true`, calls enricher directly (independent of scan pipeline).
- **"Enrich all unenriched" button** — finds all vacancies where `enriched=false OR enrichmentDirty=true` for the current job search, queues them through the enrichment queue. Covers: crash recovery, first-time setup after configuring LLM, and manual trigger.

## Non-Goals

- Changing the crawling logic itself (pagination, site plugins, URL deduplication).
- Batching LLM calls across vacancies (enrichment remains per-vacancy).
- Introducing a persistent job/task queue (the enrichment queue is in-memory).
- Changing the LLM prompts or assessment schema.

## Expected Outcome

- Vacancy scanner reduced from 420 lines to ~50-80 line orchestrator.
- Each service independently testable with appropriate fixtures/mocks.
- Crawl-to-first-result latency drops significantly (no enrichment blocking).
- Total scan time drops (crawl and enrichment overlap).
- Users see vacancies immediately, with enrichment "lighting up" results progressively.
- Robust recovery from interrupted enrichment via explicit state tracking.
