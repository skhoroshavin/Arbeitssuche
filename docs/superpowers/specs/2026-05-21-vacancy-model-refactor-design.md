# Vacancy Model & Repository Refactor

## Objective

Bring the `Vacancy` model and its repository to the same pattern as `Applicant` and `JobSearch`: a simple mutable class with a `static parse(data: unknown)` factory backed by a private Zod schema. Use the opportunity to simplify the domain by:

- Making the vacancy-specific cover letter a property of `Vacancy` (not stored separately)
- Making `status` and `sources` read-only getters computed from `activityHistory`
- Eliminating the `VacancyDTO` / `VacancyWithStatus` split
- Replacing the separate `commute` record with commute data attached directly to addresses
- Removing dead-weight metadata (`latestCrawl`, `generatedAt`) from the repository layer

## 1. Vacancy Model

### 1.1 Class Shape

```ts
export class Vacancy {
  hash = ""
  title = ""
  company = ""
  addresses: VacancyAddress[] = []
  contact: VacancyContact = { name: "", email: "", phone: "" }
  startDate = ""
  description = ""
  enriched = false
  enrichmentDirty = false
  summary = ""
  matchScore: MatchScore = "unknown"
  activityHistory: Activity[] = []
  active = true
  coverLetter = ""

  static parse(data: unknown): Vacancy

  get status(): VacancyStatus
  get sources(): VacancySource[]

  addActivity(activity: Activity): void
  getMinCommuteMinutes(): number | undefined
  getLatestActivityDate(): string
}
```

- All properties are **mutable** (no `readonly`, no `with()`).
- Default `matchScore` is `"unknown"` (not `"ok"`).
- `status` is a getter that derives the current status from `activityHistory` and `active`.
- `sources` is a getter that derives deduplicated sources from `found` activities.
- `addActivity` pushes to `activityHistory`.

### 1.2 VacancyAddress

`VacancyAddress` extends the existing `Address` class from `@/models/common`:

```ts
export class VacancyAddress extends Address {
  commute?: CommuteInfo

  static fromString(value: string): VacancyAddress
  static parse(data: unknown): VacancyAddress
}
```

- `fromString` does best-effort parsing: the whole string goes into `street`, `zip` and `city` are empty.
- `parse` handles `{ street, zip, city, commute? }`, delegating the address part to `Address.parse`.

### 1.3 Type Consolidation

All types move into `src/models/vacancy/vacancy.ts`:

- `Activity`, `FoundActivity`, `NotFoundActivity`, `AppliedActivity`, `InvitedActivity`, `InterviewedActivity`, `OfferedActivity`, `RejectedActivity`, `NotInterestedActivity`
- `VacancyContact`, `VacancySource`, `CommuteInfo`, `CommuteDurations`
- `MatchScore`, `VacancyStatus`, `ActivityType`

`src/models/vacancy/index.ts` re-exports them. The following files are **deleted**:

- `src/models/vacancy/schemas.ts`
- `src/models/vacancy/resolve.ts`

`VacancyDTO` and `VacancyWithStatus` types are **deleted** — consumers use `Vacancy` directly.

`src/models/vacancy/constants.ts` is kept for UI labels/colors/transitions but imports types from `./vacancy.js`.

### 1.4 Backward-Compatible Parsing

`Vacancy.parse` uses a private Zod schema with `.default()` for every field. It also handles legacy data shapes:

- `urls: string[]` → ignored (sources are derived from `found` activities)
- `addresses: string[]` → mapped with `VacancyAddress.fromString`
- `commute: Record<string, CommuteInfo>` → merged into matching legacy address by string key
- `matchScore` missing or invalid → `"unknown"`
- `coverLetter` missing → `""`

## 2. Repository

### 2.1 Interface

```ts
export interface VacancyRepository {
  allForJobSearch(jobSearchId: JobSearchID): Vacancy[]
  save(jobSearchId: JobSearchID, vacancies: Vacancy[]): void
  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined
}
```

- `loadAll` is renamed to `allForJobSearch` and returns `Vacancy[]` directly.
- `addActivity`, `loadCoverLetter`, `saveCoverLetter` are **removed**.
- `latestCrawl` and `generatedAt` are **removed** from all signatures and outputs.

### 2.2 Deleted Files

- `src/repositories/vacancy/output.ts` — `VacancyListOutput` and `createVacancyListOutput` are no longer needed.

### 2.3 SqliteVacancyRepository

- Single `vacancies` table: `(job_search_id TEXT, hash TEXT, data TEXT, PRIMARY KEY (job_search_id, hash))`.
- `vacancy_meta` and `cover_letters` tables are **dropped**.
- Migration on init:
  1. If `cover_letters` exists, read each row, find the matching vacancy, inject `coverLetter` into its JSON, update the row.
  2. Drop `cover_letters`.
  3. Drop `vacancy_meta`.
- `hydrateVacancy` becomes `Vacancy.parse(data)` (no more `resolveVacancy`, no more `VacancyDTOSchema.partial().loose()`).

### 2.4 StubVacancyRepository

- Store is `Map<string, Vacancy[]>` (no extra `coverLetters` Map).
- No metadata fields.

## 3. Consumer Changes

### 3.1 Vacancy Processor (`src/services/vacancy-processor/process.ts`)

- `new Vacancy({ ... })` → create a `Vacancy` instance and set fields, or use `Vacancy.parse({ ... })`.
- `mergeWithExisting` mutates the existing `Vacancy` directly instead of calling `with()`.
- `urls` removed — no separate URL list.
- `addresses` is `VacancyAddress[]`.
- `mergeAddresses` updated to operate on `VacancyAddress[]` (compares via `format()`).

### 3.2 Vacancy Enricher (`src/services/vacancy-enricher/`)

- `vacancy-enricher.ts`: mutate fields directly (`vacancy.enriched = true`, etc.) instead of `with()`.
- `commute.ts`: commute is stored on `address.commute`. `address.format()` is the destination string for the commute API.
- `extract-contact.ts`: `mergeContactInfo` mutates `vacancy.addresses` and `vacancy.contact` directly.

### 3.3 Cover Letter Writer (`src/services/cover-letter-writer/cover-letter-writer.ts`)

- Replace `vacancyRepo.saveCoverLetter(...)` with:
  ```ts
  const vacancies = this.vacancyRepo.allForJobSearch(jobSearchId)
  const vacancy = vacancies.find(v => v.hash === vacancyHash)
  vacancy.coverLetter = content
  this.vacancyRepo.save(jobSearchId, vacancies)
  ```

### 3.4 IPC Handlers (`src/app/ipc-vacancies.ts`)

- `VacancyWithStatusSchema` is deleted. Responses use `Vacancy` directly (getters compute `status` and `sources` on access).
- `job-searches:vacancies:seed` drops the `latestCrawl` parameter.
- `job-searches:vacancies:add-activity`: load all, find by hash, call `vacancy.addActivity(activity)`, save all.
- `vacancies:cover-letter:load`: `findByHash` then return `vacancy.coverLetter`.
- `vacancies:cover-letter:save`: load all, find by hash, mutate `coverLetter`, save all.
- `vacancies:re-enrich` / `vacancies:enrich-unenriched`: stop reading `latestCrawl`.

### 3.5 UI Data Layer (`src/ui/data/job-searches.ts`)

- `VacancyWithStatus` type → `Vacancy` (imported from `@/models/vacancy`).
- `VacancyWithStatusSchema` deleted.
- `VacancyListResponseSchema` drops `generatedAt` and `latestCrawl`.
- Cover letter hooks query the vacancy directly (cover letter is part of the vacancy data).

### 3.6 UI Components

- `vacancy-detail.tsx`: `data.status` and `data.sources` come from getters.
- `vacancy-card.tsx`: `v.addresses` is `VacancyAddress[]`; display uses `address.format()`.

### 3.7 IPC Serialization Boundaries

Class instances with getters do not survive Electron's structured clone. IPC handlers that return vacancy data must explicitly copy getter values into plain objects:

```ts
return {
  ...vacancy,
  status: vacancy.status,
  sources: vacancy.sources,
}
```

The UI data layer validates with a plain Zod schema matching the serialized shape (all `Vacancy` fields plus `status` and `sources`). On the UI side, `Vacancy.parse()` is used to reconstruct the class instance so getters are available for components.

## 4. Testing

### 4.1 Unit Tests (`src/models/vacancy/vacancy.test.ts`)

- Rewrite all tests to use `Vacancy.parse()` instead of `new Vacancy({...})`.
- Add `coverLetter` default assertion.
- Add `VacancyAddress` parsing tests (from string, from object with commute).
- Verify `status` getter (same coverage as current `deriveStatus`).
- Verify `sources` getter (same coverage as current `deriveSources`).
- Add `addActivity` helper test.
- Legacy migration tests: old `urls`, old `addresses: string[]`, old `commute: Record<string, CommuteInfo>`.

### 4.2 Integration Tests (`src/repositories/vacancy/integration.test.ts`)

- Rewrite to use `allForJobSearch`.
- Drop `latestCrawl` / `generatedAt` assertions.
- Remove `addActivity`, `loadCoverLetter`, `saveCoverLetter` tests.
- Add cover letter persistence test via `save` / `allForJobSearch` round-trip.
- Add migration test: existing `cover_letters` data injected into vacancy on first load.

### 4.3 E2E

No changes expected — UI behavior remains identical.

## 5. Migration

### SQLite (one-time, automatic)

1. Check for `cover_letters` table on repository init.
2. For each row `(job_search_id, vacancy_hash, content)`, load the vacancy JSON, set `coverLetter`, save back.
3. Drop `cover_letters` table.
4. Drop `vacancy_meta` table.

### Stub

No migration needed — `coverLetter` defaults to `""`.
