## Context

The `GlobalProgressIndicator` in `app-layout.tsx` uses a single mutable state fed by the `job:progress` IPC channel. Both scan and analysis events flow through the same `job:progress` stream with a `phase` discriminator. When both phases are active concurrently (concurrent enrichment during crawl), incoming events overwrite each other, causing the banner to flicker between "Wird gescannt..." and "Wird analysiert...".

Additionally, a legacy `CrawlProgressCard` (with `ProgressLog`) is rendered in `vacancy-list.tsx` and is no longer needed.

Three existing specs (`enrichment-progress`, `enrichment-state`, `concurrent-enrichment`) overlap with the new requirements. They are consolidated into a single `update-progress-tracking` spec to avoid duplication and fragmentation.

## Goals / Non-Goals

**Goals:**

- Display scan and analysis progress as two independent, simultaneously visible bars in the global layout area
- Remove the legacy crawl log card and progress log components
- Preserve the abort functionality for both scan and analysis (per-row abort buttons)
- Preserve the existing event model (`job:progress` channel) to minimize IPC changes
- Consolidate three overlapping specs into one

**Non-Goals:**

- Changing the `job:progress` IPC channel name
- Adding per-site or per-vacancy progress bars in the global indicator
- Changing how `EnrichQueue` or `SiteCrawler` emit events (they already emit with correct `phase` values)
- Redesigning the progress bar visual style (keep the existing Tailwind styling)
- Changing the `Vacancy` model or `EnrichQueue` behavior (those requirements carry forward unchanged)

## Decisions

### Separate state tracking in `GlobalProgressIndicator`

Track two independent states (`scanState` and `enrichState`) instead of one shared state. On each `job:progress` event, route to the appropriate state based on `phase`:

- `phase === "search" | "scan"` → update `scanState`
- `phase === "enrich"` → update `enrichState`
- `phase === "done" | "complete"` → clear the matching state based on `source` field

**Alternative considered**: Separate IPC channels (`scan:progress`, `enrich:progress`) — rejected because it requires changing `SafeSend` contracts and all emitter sites.

### Disambiguation strategy for `done` events

Add an optional `source` field to the progress payload: `"crawl"` or `"enrich"`. When present, only clear the matching state. When absent, fall back to clearing both states. This is backward-compatible.

**Alternative considered**: Use event ordering heuristics — fragile and unreliable.

### Layout: stack both bars vertically

When both scan and analysis are active, render two rows in the progress indicator area. Each row has its own label, progress bar, and abort button. When only one is active, a single row displays.

**Alternative considered**: Side-by-side horizontal layout — rejected because it wastes horizontal space and is harder to read on narrow viewports.

### Spec consolidation

Merge `enrichment-progress`, `enrichment-state`, and `concurrent-enrichment` into a single `update-progress-tracking` spec. Requirements that are still valid carry forward; the shared-banner and single-abort-button requirements are replaced by the dual-row model.

## Risks / Trade-offs

- [Existing event contract changes slightly] A new optional `source` field is added to the progress payload. → Mitigation: field is optional; missing `source` falls back to clearing both states.
- [Done events from crawl and enrich look identical] Without `source`, both get cleared on any `done`. → Mitigation: add `source` to the two known emission sites (`ipc-crawl.ts` and `ipc-vacancies.ts`).
- [Removal of `CrawlProgressCard` may surprise users who relied on the log] → Mitigation: the crawl log was legacy and redundant with the global indicator; no user-facing data is lost.
- [Spec consolidation may lose nuance] Three specs become one. → Mitigation: all still-valid requirements are carried forward verbatim; only the shared-banner requirements are replaced.