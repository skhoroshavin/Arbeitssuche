# Design: Split Vacancy Scanner with Concurrent Enrichment

## Context

The current `services/vacancy-scanner/` is a single service with ~420 LOC in `scan.ts` that interleaves crawling, processing, enrichment, and persistence in one per-URL loop. Enrichment (LLM + commute API) blocks the crawler, making scans unnecessarily slow.

The existing architecture has clean layer boundaries enforced by dependency-cruiser: `services` may import from `plugins`, `models`, `utils`, `repositories`, and other `services`. IPC handlers in `app/` orchestrate services for the renderer. The renderer communicates via `electronAPI.invoke()` (request/response) and `electronAPI.on()` (push events).

Today, crawl progress uses a single push channel (`job:progress`) with a `ProgressEvent { message, phase?, vacanciesUpdated? }`. The `crawl-manager.ts` in `app/` manages active crawls with `AbortController` per job search.

## Goals / Non-Goals

**Goals:**

- Decompose vacancy-scanner into independently testable services with single responsibilities
- Run enrichment concurrently with crawling so users see raw results fast and enriched results progressively
- Track enrichment state on the Vacancy model for crash recovery and re-enrichment
- Provide a global progress indicator visible across all pages
- Support per-vacancy and batch re-enrichment independent of the scan pipeline

**Non-Goals:**

- Persistent job queue (enrichment queue is in-memory, crash recovery uses model state)
- Batching multiple vacancies into a single LLM call
- Changing LLM prompts, assessment schema, or crawl/pagination logic
- Parallelizing the crawler itself (sites are still crawled sequentially)

## Decisions

### 1. Service decomposition: four services under `services/`

**Decision:** Create three new services (`site-crawler`, `vacancy-processor`, `vacancy-enricher`) and keep `vacancy-scanner` as a thin orchestrator.

**Alternative considered:** Keep two services (crawler + enricher) with processing inline. Rejected because processing (hashing, markdown conversion, merge logic) is a distinct testable concern that neither crawling nor enrichment should own.

**Alternative considered:** Move enrichment into a plugin rather than a service. Rejected because enrichment orchestrates multiple plugins (LLM + commute) and applies domain logic (should-enrich checks), which is service-level responsibility.

**Service boundaries:**

```
site-crawler/
  site-crawler.ts        SiteCrawler class
  paginate.ts            pagination helpers (from scan.ts)
  resolve-search-parameters.ts  (moved from vacancy-scanner/)

vacancy-processor/
  process.ts             processOneCrawlResult (from unify.ts)
  mark-unseen.ts         markUnseenAsGone (from unify.ts)
  vacancy-hash.ts        (moved)
  markdown.ts            (moved)

vacancy-enricher/
  vacancy-enricher.ts    VacancyEnricher class
  assess.ts              (moved)
  extract-contact.ts     (moved)
  commute.ts             (moved)

vacancy-scanner/
  vacancy-scanner.ts     thin orchestrator
  enrich-queue.ts        bounded concurrent queue
  format-error.ts        (stays)
```

### 2. Enrichment state: two booleans on VacancyDTO

**Decision:** Add `enriched: boolean` and `enrichmentDirty: boolean` to `VacancyDTO` and `Vacancy`.

**Why two booleans instead of a single enum:** A single `"plain" | "pending" | "stale" | "enriched"` enum would force "pending" (transient runtime state) into persisted storage, creating stuck states on crash. Two booleans keep the model purely about persisted facts. The "pending" state is derived at the UI layer by combining `enrichmentDirty=true` with runtime knowledge of the enrichment queue.

**How `descriptionChanged` relates:** The existing `descriptionChanged` field currently drives re-assessment. With the new model, when the processor detects a description change during re-crawl, it sets `enrichmentDirty=true` (and keeps `enriched=true` so the old summary is preserved as "stale"). The `descriptionChanged` field can be removed — `enrichmentDirty` subsumes its purpose.

**Default values for existing data:** Migration sets `enriched=true` for vacancies that already have a summary, `false` otherwise. `enrichmentDirty=false` for all existing vacancies.

### 3. SiteCrawler yields VacancyDetails via callback, not async iterator

**Decision:** `SiteCrawler.crawl()` takes an `onResult` callback rather than returning an async iterable.

```typescript
class SiteCrawler {
  async crawl(options: CrawlOptions): Promise<CrawlSummary>
}

interface CrawlOptions {
  sites: JobSite[]
  criteria: JobSearchCriteria  // domain type from models/job-search
  signal?: AbortSignal
  onProgress?: (event: ProgressEvent) => void
  onResult: (details: VacancyDetails, siteName: string) => void
}
```

**Two SearchCriteria types, different layers:**

- `plugins/job-site/types.ts` keeps its existing `SearchCriteria` — the minimal interface that job site plugins need (`location`, `query`, `radiusKm`, `mode`). Plugin layer stays domain-agnostic.
- `models/job-search/types.ts` gets a new `JobSearchCriteria` — the domain-level type that adds `limit` and represents the full search configuration as the UI and services see it. This replaces the `SearchParameters` type currently in `scan.ts`.

The crawler accepts `JobSearchCriteria` and derives the plugin-level `SearchCriteria` when calling `site.getVacancyList()`. This keeps the plugin boundary clean while giving services and UI a single domain type for all search parameters.
```

**Why not async iterators:** The crawler already has side effects (progress reporting) and the consumer needs to process results synchronously within the pagination loop (to track URL deduplication counts for the limit). A callback keeps the flow explicit and matches the existing pattern. Async iterators would add complexity without clear benefit here.

### 4. VacancyEnricher is stateless, takes explicit dependencies

**Decision:** `VacancyEnricher` receives its dependencies (LLM client, commute client, applicant, preferences) at construction time and exposes a single method.

```typescript
class VacancyEnricher {
  constructor(deps: EnricherDeps)
  async enrich(vacancy: Vacancy, context: EnrichContext): Promise<Vacancy>
}

interface EnricherDeps {
  llmClient?: LlmClient
  commuteClient?: CommuteClient
}

interface EnrichContext {
  applicant: Applicant
  preferences: SearchPreferences
}
```

Construction-time deps are infrastructure (LLM client, commute client) that don't change across calls. Per-call context is the applicant and their preferences — these are domain inputs that may differ between invocations (e.g., re-enriching after editing an applicant profile, or enriching for a different applicant).

The enricher internally runs commute, assessment, and contact extraction (the same logic as today), returns the enriched vacancy. It has no awareness of queuing or concurrency.

### 5. EnrichQueue: bounded concurrency with Promise-based workers

**Decision:** `EnrichQueue` manages a pool of concurrent enrichment tasks with a configurable concurrency limit (default: 2).

```typescript
class EnrichQueue {
  constructor(options: EnrichQueueOptions)
  submit(vacancy: Vacancy, hash: string): void
  async drain(): Promise<void>
  abort(): void
  get pending(): number
  get completed(): number
  get total(): number
}

interface EnrichQueueOptions {
  enricher: VacancyEnricher
  concurrency: number
  onEnriched: (vacancy: Vacancy, hash: string) => void
  onError: (hash: string, error: Error) => void
  onProgress?: (event: EnrichProgressEvent) => void
  signal?: AbortSignal
}
```

**Implementation:** Simple array-based queue with a running counter. On `submit()`, if running < concurrency, start immediately; otherwise push to queue. Each completed task pulls the next from the queue. `drain()` returns a promise that resolves when both the queue is empty and all running tasks complete. `abort()` clears the queue and lets in-flight tasks finish (they check the signal).

**Alternative considered:** Using a third-party queue library (e.g., p-queue). Rejected — the implementation is ~40-50 lines, and avoiding an external dependency is preferable for this scope.

### 6. Scanner orchestrator: compose services in a callback loop

**Decision:** The scanner's `scan()` method wires crawler, processor, enricher, and queue together:

```
crawler.crawl({
  onResult(details, siteName) {
    vacancy = processor.process(details, existingByHash, crawlDate)
    save(vacancy)                          // raw, visible immediately
    if (shouldEnrich(vacancy)) {
      queue.submit(vacancy, hash)          // enrichment starts in background
    }
  }
})

await queue.drain()                        // wait for remaining enrichments
markUnseenAsGone(...)
finalSave()
```

The `onEnriched` callback from the queue saves the enriched vacancy and emits a progress event. This keeps the orchestrator thin (~60-80 lines) with no enrichment or crawl logic.

### 7. Crawl manager handles both crawl and enrichment lifecycle

**Decision:** Expand `crawl-manager.ts` in `app/` to manage enrichment state alongside crawl state. The manager tracks per-job-search state: `{ abortController, phase: "crawling" | "enriching" | "done", enrichProgress: { completed, total } }`.

Abort kills both. The IPC handler for abort doesn't change signature, just gains broader effect.

**New IPC channels:**

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `job:progress` | main→renderer | Existing. Extended with enrichment progress fields |
| `vacancies:re-enrich` | renderer→main | Re-enrich a single vacancy by hash |
| `vacancies:enrich-unenriched` | renderer→main | Batch-enrich all dirty/unenriched for a job search |
| `vacancies:enrich:abort` | renderer→main | Stop a running enrichment batch |

### 8. ProgressEvent extended for enrichment phases

**Decision:** Extend `ProgressEvent` with optional enrichment counters rather than creating a separate event type.

```typescript
interface ProgressEvent {
  message: string
  phase?: "search" | "scan" | "enrich" | "complete" | "done"
  vacanciesUpdated?: boolean
  enrichProgress?: { completed: number; total: number }
}
```

The "enrich" phase is new. `enrichProgress` is sent with every enrichment completion so the UI can render a progress bar. This is backward-compatible — existing consumers ignore unknown fields.

### 9. Global progress indicator in AppLayout

**Decision:** Add a progress bar component to `AppLayout` (in the `MainArea` header area, between the header and the `<Outlet />`). It subscribes to `job:progress` events via a React context or hook at the layout level.

**Why layout-level, not page-level:** Enrichment continues after crawling finishes and after the user navigates away from the job search page. A page-scoped component would unmount and lose the connection.

**UI behavior:**
- Hidden when no active crawl/enrichment
- Shows phase label + progress bar during crawl and enrichment
- Shows abort button (calls `job-searches:crawl:abort` or `vacancies:enrich:abort` depending on context)
- Auto-dismisses when phase becomes "done"

The existing `crawl-progress-card.tsx` on the job search page can remain for detailed per-site progress. The global indicator is a compact summary.

### 10. Re-enrich uses VacancyEnricher directly, bypasses scanner

**Decision:** The "re-enrich" IPC handler constructs a `VacancyEnricher` and calls `enrich()` directly. It does not go through the scanner or the enrichment queue.

For "enrich all unenriched", the IPC handler queries the vacancy repository for dirty/unenriched vacancies and processes them through a new `EnrichQueue` instance (reusing the same queue implementation). This provides progress reporting and abort capability.

### 11. Re-enrich UI placement

**Per-vacancy "re-enrich" button:** Shown on vacancy cards in the list view (`vacancy-card.tsx`) and on the vacancy detail view (`vacancy-detail.tsx`), next to or below the summary section. Visible when the vacancy is in `enriched` or `stale` state. When clicked, sets `enrichmentDirty=true` and calls `vacancies:re-enrich` via IPC. The button shows a spinner while the enrichment is in flight.

**"Enrich all unenriched" button:** Shown on the vacancy list view (`vacancy-list.tsx`), in the filter bar or header area. Visible when there are vacancies with `enriched=false` or `enrichmentDirty=true` for the current job search. Clicking it calls `vacancies:enrich-unenriched` via IPC, which starts a batch enrichment through an `EnrichQueue`. Progress is shown in the global progress indicator; the button changes to an abort button while the batch is running.

## Risks / Trade-offs

**[Race condition on vacancy save]** The crawler saves raw vacancies, and the enrichment queue later saves enriched versions. If the crawler re-encounters a vacancy (different URL, same hash) and saves an update after enrichment completed, it could overwrite enriched data with raw data. **Mitigation:** The processor's merge logic preserves existing enrichment fields (`summary`, `matchScore`, `commute`) when merging a re-crawled vacancy. The `enriched` and `enrichmentDirty` flags are only modified by the enricher, not by the processor.

**[Enrichment queue memory]** The queue holds vacancy references in memory. With very large scans (hundreds of vacancies), this is a non-trivial amount of data. **Mitigation:** Vacancies are already held in `existingByHash` (the current behavior). The queue only adds hash references, not duplicate vacancy data. Not a new memory concern.

**[OpenRouter rate limits]** Running 2 concurrent enrichments means 4-6 concurrent LLM requests (assess + contact per vacancy). OpenRouter's rate limits vary by model and tier. **Mitigation:** Concurrency of 2 is conservative. Errors from rate limiting are caught per-vacancy and reported (vacancy stays dirty for retry). Could add backoff in a follow-up.

**[UI flicker on enrichment save]** When an enriched vacancy replaces a raw one, the React Query cache invalidation could cause the vacancy list to re-render. **Mitigation:** The `vacanciesUpdated` flag in progress events already triggers targeted invalidation. The enrichment save uses the same mechanism — no new flicker beyond what exists today.
