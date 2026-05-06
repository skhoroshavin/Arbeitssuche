# Service Boundary Cleanup Design

## Purpose

Restructure the service layer to eliminate reverse inter-service dependencies, clarify naming and roles, make the scan pipeline self-documenting, and tighten architecture rules so inter-service imports are denied by default.

## Current Problems

1. **Reverse dependencies**: `formatError` in `vacancy-scanner` is imported by `site-crawler` and `vacancy-enricher` — leaf services depending on their orchestrator. Same pattern for `mergeAddresses` (in `vacancy-processor`, imported by `vacancy-enricher`).
2. **Confusing naming**: `vacancy-scanner` doesn't scan (it orchestrates). `vacancy-processor` and `vacancy-enricher` sound like synonyms — hard to guess which is lower-level.
3. **Tightly coupled services**: `site-crawler` and `vacancy-processor` are only used together and called back-to-back in the orchestrator callback.
4. **Permissive inter-service imports**: The ESLint config allows all services to import all other services (`services/*` in imports list). This hides unwanted dependencies.

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
├── resume-renderer/        (unchanged)
```

### Dependency Graph

```
scan-pipeline
├── -> site-crawler
├── -> commute-computer
└── -> vacancy-enricher

site-crawler         -> utils (formatError, mergeAddresses, ensureLlmAvailable?)
vacancy-enricher     -> utils (formatError, mergeAddresses)
commute-computer     -> utils (formatError)
cover-letter-writer  -> utils (ensureLlmAvailable)
job-consultant       -> utils (ensureLlmAvailable)
```

No inter-service dependencies except `scan-pipeline` (the only orchestrator). All leaf services only depend on utils and outer layers (repositories, plugins, models).

### Pipeline Flow

```
crawl (-> Vacancy models) -> commute (batch) -> enrich (per-vacancy)
```

1. **Crawl**: `site-crawler` crawls job sites, converts results to `Vacancy` domain models. Emits `{ vacancy, hash }` per result. No raw `VacancyDetails` leak out.
2. **Commute**: `commute-computer` batch-computes commute times for all vacancies with addresses. Returns vacancies with commute data added.
3. **Enrich**: `vacancy-enricher` runs LLM assessment and contact extraction per vacancy via an enrich queue.

## Service Class Convention

Every service module SHALL export a single class as its public API. Dependencies SHALL be injected through the constructor. Helper functions MAY be used internally but SHALL NOT be the primary export.

### Scenario: Service with dependencies

- **WHEN** a service depends on repositories, plugins, or other non-leaf services
- **THEN** those dependencies SHALL be constructor parameters
- **AND** the class name SHALL match the module name (e.g. `ScanPipeline` in `scan-pipeline/`)

### Scenario: Service has internal helpers

- **WHEN** a service needs helper functions for its implementation
- **THEN** helpers SHALL be non-exported or exported only within the module
- **AND** the public surface (`index.ts`) SHALL export only the class

## ESLint Architecture Rules

Inter-service imports SHALL be denied by default. Only explicitly configured non-leaf services MAY import other services.

### Default (leaf) service rule

```
"services/*": {
  imports: ["repositories/+", "plugins/+", "models/+", "utils/+"],
}
```

### Non-leaf exceptions

Only `scan-pipeline` (the orchestrator) MAY import other services:

```
"services/scan-pipeline": {
  imports: [
    "services/site-crawler",
    "services/commute-computer",
    "services/vacancy-enricher",
    "repositories/+",
    "plugins/+",
    "models/+",
    "utils/+",
  ],
}
```

### Scenario: Leaf service tries to import another service

- **WHEN** `vacancy-enricher` imports from `@/services/scan-pipeline`
- **THEN** ESLint reports an `unslop/import-control` error

### Scenario: Orchestrator imports allowed service

- **WHEN** `scan-pipeline` imports from `@/services/site-crawler`
- **THEN** the import is accepted (explicitly configured)

## Changes

### New: commute-computer service

Extracted from `vacancy-enricher/commute.ts`. Exposes a class:

```
class CommuteComputer {
  constructor(commuteClient?: CommuteClient) {}
  async compute(vacancies: Vacancy[], applicant: Applicant, signal?: AbortSignal): Promise<Vacancy[]>
}
```

Returns vacancies unchanged if commute client is unavailable or API fails.

### Modified: scan-pipeline (was vacancy-scanner)

- Renamed to `ScanPipeline` class
- Takes `CommuteComputer` as additional constructor dependency
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

### Deleted: vacancy-processor

- Service module deleted entirely
- Logic absorbed by `site-crawler` and `scan-pipeline`

### Deleted: llm

- `ensureLlmAvailable` moves to `utils` (consumers: cover-letter-writer, job-consultant — 2 >= 2 ✓)
- The `services/llm/` module is deleted — it was just a thin assertion wrapper

### New in utils

- `formatError` (consumers: site-crawler, vacancy-enricher, commute-computer — 3 >= 2 ✓)
- `mergeAddresses` (consumers: site-crawler, vacancy-enricher — 2 >= 2 ✓)
- `ensureLlmAvailable` (consumers: cover-letter-writer, job-consultant — 2 >= 2 ✓)

### eslint config

- Remove `services/*` from the `"services/*"` imports allow list (default deny)
- Add `"services/scan-pipeline"` with explicit service imports
- Add entries for `scan-pipeline`, `commute-computer`
- Remove entries for `vacancy-scanner`, `vacancy-processor`, `llm`

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

- Renaming standalone services (cover-letter-writer, job-consultant, resume-renderer)
- Changing plugin or repository layers
- Changing UI layer
