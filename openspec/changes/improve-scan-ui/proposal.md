## Why

Scan and analysis progress bars share a single banner in `GlobalProgressIndicator`, using one mutable state fed by a shared `job:progress` event stream. When both phases run in parallel (as they do during concurrent enrichment), interleaved events cause the banner to flicker between "Wird gescannt..." and "Wird analysiert...". A legacy crawl log window also persists without purpose and should be removed.

## What Changes

- Split the single progress banner into two independent progress indicators: one for scan, one for analysis
- Both indicators SHALL be visible simultaneously when their respective phases are active
- Add a `source` field to progress events so completion events can be attributed to the correct phase
- Remove the legacy crawl log window (`CrawlProgressCard` and `ProgressLog` components)
- Replace three existing specs (`enrichment-progress`, `enrichment-state`, `concurrent-enrichment`) with a single consolidated `update-progress-tracking` spec

## Capabilities

### New Capabilities

- `update-progress-tracking`: Consolidated spec covering dual independent progress indicators, progress event shape with source, enrichment state model, queue concurrency, scan-time parallelism, and legacy crawl log removal

### Modified Capabilities

### Removed Capabilities

- `enrichment-progress`: Replaced by `update-progress-tracking`
- `enrichment-state`: Replaced by `update-progress-tracking`
- `concurrent-enrichment`: Replaced by `update-progress-tracking`

## Impact

- `src/ui/layout/global-progress-indicator.tsx` — major rewrite to track two progress states independently
- `src/ui/layout/app-layout.tsx` — render two indicator rows instead of one
- `src/ui/pages/job-search/views/crawl-progress-card.tsx` — deleted
- `src/ui/pages/job-search/components/progress-log.tsx` — deleted
- `src/ui/pages/job-search/views/vacancy-list.tsx` — remove crawl-progress-card rendering
- `src/ui/pages/job-search/hooks/job-progress.ts` — update to separate scan vs analysis events
- `src/models/progress/index.ts` — add `source` field to event type
- `src/app/ipc-crawl.ts`, `src/app/ipc-vacancies.ts` — add `source` to completion events