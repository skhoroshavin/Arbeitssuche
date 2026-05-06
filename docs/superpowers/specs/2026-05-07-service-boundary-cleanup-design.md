# Service Boundary Cleanup Design

## Purpose

Restructure the service layer to eliminate reverse inter-service dependencies, clarify naming and roles, and make the scan pipeline self-documenting.

## Current Problems

1. **Reverse dependencies**: `formatError` in `vacancy-scanner` is imported by `site-crawler` and `vacancy-enricher` — leaf services depending on their orchestrator. Same pattern for `mergeAddresses` (in `vacancy-processor`, imported by `vacancy-enricher`).
2. **Confusing naming**: `vacancy-scanner` doesn't scan (it orchestrates). `vacancy-processor` and `vacancy-enricher` sound like synonyms — hard to guess which is lower-level.
3. **Tightly coupled services**: `site-crawler` and `vacancy-processor` are only used together and called back-to-back in the orchestrator callback.

## Target Architecture

```
src/services/
├── scan-pipeline/          (orchestrator — was vacancy-scanner)
│   ├── enrich-queue.ts
│   ├── mark-unseen.ts      (was in vacancy-processor)
│   └── scan-pipeline.ts
├── site-crawler/           (crawl + build Vacancy models — merged)
│   ├── paginate.ts
│   ├── resolve-search-parameters.ts
│   ├── site-crawler.ts
│   ├── process.ts          (VacancyDetails -> Vacancy)
│   ├── markdown.ts
│   └── vacancy-hash.ts
├── commute-computer/       (new — was enricher/commute.ts)
├── vacancy-enricher/       (LLM assessment + contact extraction)
│   ├── assess.ts
│   └── extract-contact.ts
│
├── cover-letter-writer/    (unchanged)
├── job-consultant/         (unchanged)
├── llm/                    (unchanged)
├── resume-renderer/        (unchanged)
```

### Dependency Graph

```
scan-pipeline
├── -> site-crawler
├── -> commute-computer
└── -> vacancy-enricher

site-crawler         -> utils (formatError, mergeAddresses)
vacancy-enricher     -> utils (formatError, mergeAddresses)
commute-computer     -> utils (formatError)
```

No reverse inter-service dependencies. No leaf service depends on its orchestrator.

### Pipeline Flow

```
crawl (-> Vacancy models) -> commute (batch) -> enrich (per-vacancy)
```

1. **Crawl**: `site-crawler` crawls job sites, converts results to `Vacancy` domain models. Emits `{ vacancy, hash }` per result. No raw `VacancyDetails` leak out.
2. **Commute**: `commute-computer` batch-computes commute times for all vacancies with addresses. Returns vacancies with commute data added.
3. **Enrich**: `vacancy-enricher` runs LLM assessment and contact extraction per vacancy via an enrich queue.

## Changes

### New: commute-computer service

Extracted from `vacancy-enricher/commute.ts`. Exposes a single function:

```
computeCommutes(vacancies, origin, commuteClient, signal) -> vacancies with commute
```

Returns vacancies unchanged if commute client is unavailable or API fails.

### Modified: scan-pipeline (was vacancy-scanner)

- Renamed to communicate orchestrator role
- Takes `commute-computer` as additional dependency
- Pipeline order: crawl -> batch commute -> enrich
- `mark-unseen.ts` logic moves here (was in `vacancy-processor`)
- Dedup/merge logic lives here (it owns the `existingByHash` state)

### Modified: site-crawler (absorbs vacancy-processor)

- Absorbs `process.ts`, `markdown.ts`, `vacancy-hash.ts` from `vacancy-processor`
- `onResult` callback now yields `{ vacancy: Vacancy, hash: string }` instead of `VacancyDetails`
- `mergeAddresses` moves to `utils` (used by both crawler and enricher)

### Modified: vacancy-enricher

- No longer handles commute — that's a separate pipeline step
- Removes `commute.ts`
- Imports `formatError` and `mergeAddresses` from `utils`

### Deleted: vacancy-processor / vacancy-ingester

- Service module deleted entirely
- Logic absorbed by `site-crawler` and `scan-pipeline`

### New in utils

- `formatError` (consumers: site-crawler, vacancy-enricher, commute-computer — 3 >= 2 ✓)
- `mergeAddresses` (consumers: site-crawler, vacancy-enricher — 2 >= 2 ✓)

### eslint config

- Add architecture entries for `scan-pipeline`, `commute-computer`
- Remove `vacancy-scanner`, `vacancy-processor`

## Error Handling

| Step | Behavior |
|------|----------|
| site-crawler | Catches per-URL fetch errors, logs with `formatError`, continues |
| commute-computer | Catches API errors, returns vacancies unchanged, logs warning |
| vacancy-enricher | Catches per-vacancy LLM errors, logs, continues |
| scan-pipeline | Handles abort signals, rethrows unexpected errors |

No step crashes the pipeline.

## Testing

- Each service tested through public surface (`index.ts`)
- `site-crawler` tests cover merged conversion logic
- `commute-computer` gets standalone tests (logic was previously tested through enricher)
- Pipeline integration tests verify crawl -> commute -> enrich sequence
- All imports follow architecture rules (public surfaces only)

## Non-Goals

- Renaming standalone services (cover-letter-writer, job-consultant, llm, resume-renderer)
- Changing plugin or repository layers
- Changing UI layer
