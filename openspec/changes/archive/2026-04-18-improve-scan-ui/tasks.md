## 1. Event model update

- [x] 1.1 Add optional `source` field (`"crawl" | "enrich"`) to `ProgressEvent` model (`src/models/progress/index.ts`)
- [x] 1.2 Add `source: "crawl"` to completion and error events in `src/app/ipc-crawl.ts`
- [x] 1.3 Add `source: "enrich"` to completion events in `src/app/ipc-vacancies.ts`

## 2. Dual progress state in GlobalProgressIndicator

- [x] 2.1 Replace single `useState` in `useGlobalProgress` with two independent states: `scanState` and `enrichState`
- [x] 2.2 Route `job:progress` events to the correct state based on `phase` (search/scan → scanState, enrich → enrichState)
- [x] 2.3 On `done`/`complete` events, clear only the matching state when `source` is present; clear both when absent

## 3. Render two progress rows

- [x] 3.1 Extract `ScanProgressRow` component from `GlobalProgressIndicator` with label "Wird gescannt...", pulsing dot, and per-row abort button
- [x] 3.2 Extract `EnrichProgressRow` component from `GlobalProgressIndicator` with label "Wird analysiert...", EnrichProgressBar, and per-row abort button
- [x] 3.3 Update `GlobalProgressIndicator` to render both rows conditionally (hidden when state is undefined)
- [x] 3.4 Wire per-row abort: `ScanProgressRow` abort calls `job-searches:crawl:abort`, `EnrichProgressRow` abort calls `vacancies:enrich:abort`

## 4. Remove legacy crawl log

- [x] 4.1 Remove `CrawlProgressCard` rendering from `src/ui/pages/job-search/views/vacancy-list.tsx`
- [x] 4.2 Remove `CrawlProgressCard` import from `vacancy-list.tsx`
- [x] 4.3 Remove crawl-progress-card events/done/onAbort/onClose props from `useCrawlControl` in `vacancy-list.tsx`
- [x] 4.4 Delete `src/ui/pages/job-search/views/crawl-progress-card.tsx`
- [x] 4.5 Delete `src/ui/pages/job-search/components/progress-log.tsx`
- [x] 4.6 Remove `ProgressLog` and `CrawlProgressCard` from their barrel exports (`index.ts` files)

## 5. Clean up and verify

- [x] 5.1 Update `src/ui/pages/job-search/views/index.ts` to remove `CrawlProgressCard` export
- [x] 5.2 Update `src/ui/pages/job-search/components/index.ts` to remove `ProgressLog` export
- [x] 5.3 Run `npm run fix` and resolve any lint/type errors