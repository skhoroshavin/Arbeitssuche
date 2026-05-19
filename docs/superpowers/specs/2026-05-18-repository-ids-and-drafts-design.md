# Repository-Owned IDs and Draft Simplification

## Summary

Eliminate `src/utils/id.ts` by moving ID generation into repositories. Remove `id` from `Applicant` and `id`/`applicantId` from `JobSearch` — domain models become pure data, identity lives in repository keys. Introduce `ApplicantID` and `JobSearchID` as lightweight wrappers. Simplify draft persistence by removing wrapper types and storing drafts in main tables under sentinel IDs. Move per-vacancy cover letter access from `JobSearchRepository` to `VacancyRepository`.

## Goals

1. Delete `src/utils/id.ts` and `src/utils/id.test.ts`
2. Remove `id` field from `Applicant` model
3. Remove `id` and `applicantId` fields from `JobSearch` model; flatten fields; add `coverLetter: string`
4. Introduce `ApplicantID` and `JobSearchID` as `{ value: string }` wrappers
5. Redesign repository interfaces: models without embedded IDs, repos return `(id, data)` tuples
6. Move `loadApplicationCoverLetter` / `saveApplicationCoverLetter` from `JobSearchRepository` to `VacancyRepository`
7. Delete separate draft tables; store drafts in main tables under sentinel IDs (`"$draft"` for applicant, `"$draft_<applicantId>"` for job search)
8. Delete `ApplicantDraft`, `ApplicantDraftSnapshot`, `JobSearchDraft`, `JobSearchEditorSnapshot` from models
9. Zero data loss for existing non-draft user data; old drafts are discarded during migration

## Non-Goals

- Changing `Vacancy` model
- Introducing a generic migration framework
- Moving drafts out of SQLite
- Changing the Electron app architecture or IPC transport

## 1. ID Types

Simple object wrappers.

```ts
export interface ApplicantID {
  value: string
}

export function ApplicantID(value: string): ApplicantID {
  return { value }
}

export interface JobSearchID {
  value: string
}

export function JobSearchID(value: string): JobSearchID {
  return { value }
}
```

Construction: `ApplicantID("1")`. Extraction: `id.value`.

## 2. Model Changes

### Applicant

```ts
export interface Applicant {
  personal: ApplicantPersonal
  disclose: ApplicantDisclose
  experience: ApplicantExperience[]
  education: ApplicantEducation[]
  skills: ApplicantSkill[]
  languages: ApplicantLanguage[]
  certifications: ApplicantCertification[]
  personalNotes: string
}
```

- `id` removed
- `personalNotes?: string[]` → `personalNotes: string`
- `ApplicantInfo` redefined as `{ id: ApplicantID; displayName: string }`

### JobSearch

```ts
export interface JobSearch {
  searchTerm: string
  radiusKm: number
  mode: SearchMode
  sources: SearchSource[]
  maxResultsPerSource: number
  maxCommuteMinutes: number
  notes: string
  coverLetter: string
}
```

- `id` removed, `applicantId` removed
- `SearchParameters` and `SearchPreferences` deleted — fields inlined
- `searchMode` → `mode`
- `sources` → `SearchSource[]`
- `maxResults?: number` → `maxResultsPerSource: number` (`0` = unlimited)
- `maxDistanceKm` removed
- `maxCommuteMinutes?: number` → `maxCommuteMinutes: number` (`0` = unlimited)
- `freeText: string[]` → `notes: string`
- `coverLetter` added
- `JobSearchInfo` redefined as `{ id: JobSearchID; displayName: string }`

### SearchSource

```ts
export interface SearchSource {
  value: string
}

export function SearchSource(value: string): SearchSource {
  return { value }
}
```

### Deleted Model Types

- `ApplicantDraft`, `ApplicantDraftSnapshot`
- `JobSearchDraft`, `JobSearchEditorSnapshot`
- `SearchParameters`, `SearchPreferences`

## 3. Repository Interfaces

### ApplicantRepository

```ts
export interface ApplicantRepository {
  list(): ApplicantInfo[]
  load(id: ApplicantID): Applicant
  save(id: ApplicantID, applicant: Applicant): void
  delete(id: ApplicantID): void

  loadDraft(): Applicant | undefined
  saveDraft(draft: Applicant): void
  deleteDraft(): void
  finalizeDraft(): ApplicantID
}
```

- `list()` excludes `"$draft"` sentinel
- `finalizeDraft()` generates ID, persists, clears draft, returns ID
- `loadDraft()` returns `undefined` when no draft or not meaningful

### JobSearchRepository

```ts
export interface JobSearchRepository {
  listByApplicant(applicantId: ApplicantID): JobSearchInfo[]
  load(id: JobSearchID): { jobSearch: JobSearch; applicantId: ApplicantID }
  save(id: JobSearchID, jobSearch: JobSearch): void
  delete(id: JobSearchID): void

  loadDraft(applicantId: ApplicantID): JobSearch | undefined
  saveDraft(applicantId: ApplicantID, draft: JobSearch): void
  deleteDraft(applicantId: ApplicantID): void
  finalizeDraft(applicantId: ApplicantID): JobSearchID
}
```

- `listByApplicant()` excludes `"$draft_*"` sentinels
- Cover letter methods removed (moved to `VacancyRepository`)

### VacancyRepository

```ts
export interface VacancyRepository {
  loadAll(jobSearchId: JobSearchID): VacancyListOutput
  save(jobSearchId: JobSearchID, vacancies: Vacancy[], latestCrawl: string): void
  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined
  addActivity(jobSearchId: JobSearchID, hash: string, activity: Activity): void

  loadCoverLetter(jobSearchId: JobSearchID, vacancyHash: string): string
  saveCoverLetter(jobSearchId: JobSearchID, vacancyHash: string, content: string): void
}
```

## 4. ID Generation

Sequential numeric strings (`"1"`, `"2"`) in `TEXT PRIMARY KEY`.

### SQLite

Seed on construction:

```ts
const result = database.prepare(
  "SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) AS max FROM table WHERE id GLOB '[0-9]*'"
).get()
this.nextId = Number(result.max)
```

```ts
private nextId: number

private generateId(): string {
  return String(++this.nextId)
}
```

`finalizeDraft()` calls `generateId()`, wraps with `ApplicantID()` / `JobSearchID()`.

### Stub

Seed from `Map.size`. Same logic.

## 5. Draft Persistence

### Applicant Draft

Sentinel ID `"$draft"` in `applicants` table:

- `loadDraft()` → `load("$draft")`, check meaningful, return `Applicant | undefined`
- `saveDraft(draft)` → `save("$draft", draft)`
- `deleteDraft()` → `delete("$draft")`
- `finalizeDraft()` → load, generate ID, save with real ID, delete sentinel
- `list()` excludes `"$draft"`

### Job Search Draft

Sentinel ID `"$draft_<applicantId>"` in `job_searches` table:

- `loadDraft(applicantId)` → load sentinel, check meaningful
- `saveDraft(applicantId, draft)` → save sentinel
- `deleteDraft(applicantId)` → delete sentinel
- `finalizeDraft(applicantId)` → load, generate ID, insert with real ID, delete sentinel
- `listByApplicant()` excludes sentinels
- `load()` throws for sentinels

### Migration

Drop old draft tables. Draft data is **not preserved**.

```sql
DROP TABLE IF EXISTS applicant_draft;
DROP TABLE IF EXISTS job_search_drafts;
```

## 6. SQLite Schema Changes

### `applicants`

No schema changes. `id TEXT PRIMARY KEY` supports all ID formats.

`data` JSON blob no longer contains `id`.

### `job_searches`

```sql
CREATE TABLE IF NOT EXISTS job_searches (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL,
  search_term TEXT NOT NULL DEFAULT '',
  cover_letter TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL
);
```

Changes:
- Add `cover_letter TEXT NOT NULL DEFAULT ''`
- `data` JSON blob no longer contains `id` or `applicantId`
- `applicant_id` stays as relational column

**Migration:**
```sql
ALTER TABLE job_searches ADD COLUMN cover_letter TEXT NOT NULL DEFAULT '';
UPDATE job_searches SET cover_letter = COALESCE((
  SELECT content FROM cover_letters
  WHERE cover_letters.job_search_id = job_searches.id
    AND cover_letters.vacancy_hash = ''
), '');
DELETE FROM cover_letters WHERE vacancy_hash = '';
```

### `cover_letters`

No schema changes. After migration, only per-vacancy cover letters remain.

### JSON blob migration

```ts
function migrateApplicantData(database: Database): void {
  const rows = database.prepare("SELECT id, data FROM applicants").all()
  const update = database.prepare("UPDATE applicants SET data = ? WHERE id = ?")
  for (const row of rows) {
    const parsed = JSON.parse(row.data as string)
    delete parsed.id
    update.run(JSON.stringify(parsed), row.id as string)
  }
}

function migrateJobSearchData(database: Database): void {
  const rows = database.prepare("SELECT id, data FROM job_searches").all()
  const update = database.prepare("UPDATE job_searches SET data = ? WHERE id = ?")
  for (const row of rows) {
    const parsed = JSON.parse(row.data as string)
    delete parsed.id
    delete parsed.applicantId
    parsed.coverLetter = parsed.coverLetter ?? ''
    update.run(JSON.stringify(parsed), row.id as string)
  }
}
```

## 7. IPC Changes

### `ipc-applicants.ts`

```ts
handle("applicants:list", () => ({
  applicants: services.applicantRepo.list().map((info) => ({
    id: info.id.value,
    displayName: info.displayName,
  })),
}))

handle("applicants:load", (id: string) =>
  services.applicantRepo.load(ApplicantID(id)),
)

handle("applicants:save", (id: string, data: unknown) => {
  const applicant = ApplicantSchema.parse(data)
  services.applicantRepo.save(ApplicantID(id), applicant)
  return { ok: true }
})

handle("applicants:delete", (id: string) => {
  services.applicantRepo.delete(ApplicantID(id))
  return { deleted: id }
})

handle("applicants:draft:load", () => ({
  draft: services.applicantRepo.loadDraft(),
}))

handle("applicants:draft:save", (draft: unknown) => {
  const applicant = ApplicantSchema.parse(draft)
  services.applicantRepo.saveDraft(applicant)
  return { ok: true }
})

handle("applicants:draft:finalize", () => ({
  id: services.applicantRepo.finalizeDraft().value,
}))
```

### `ipc-job-searches.ts`

```ts
handle("job-searches:list", (applicantId: string) => ({
  jobSearches: services.jobSearchRepo
    .listByApplicant(ApplicantID(applicantId))
    .map((info) => ({
      id: info.id.value,
      displayName: info.displayName,
    })),
}))

handle("job-searches:load", (id: string) => {
  const { jobSearch, applicantId } = services.jobSearchRepo.load(JobSearchID(id))
  return { jobSearch, applicantId: applicantId.value }
})

handle("job-searches:save", (id: string, data: unknown) => {
  const jobSearch = JobSearchSchema.parse(data)
  services.jobSearchRepo.save(JobSearchID(id), jobSearch)
  return { ok: true }
})

handle("job-searches:delete", (id: string) => {
  services.jobSearchRepo.delete(JobSearchID(id))
  return { deleted: id }
})

handle("job-searches:draft:load", (applicantId: string) => ({
  draft: services.jobSearchRepo.loadDraft(ApplicantID(applicantId)),
}))

handle("job-searches:draft:save", (applicantId: string, draft: unknown) => {
  const jobSearch = JobSearchSchema.parse(draft)
  services.jobSearchRepo.saveDraft(ApplicantID(applicantId), jobSearch)
  return { ok: true }
})

handle("job-searches:draft:finalize", (applicantId: string) => ({
  id: services.jobSearchRepo.finalizeDraft(ApplicantID(applicantId)).value,
}))

handle("job-searches:cover-letter:load", (id: string) => ({
  content: services.jobSearchRepo.load(JobSearchID(id)).coverLetter,
}))

handle("job-searches:cover-letter:save", (id: string, content: string) => {
  const jobSearch = services.jobSearchRepo.load(JobSearchID(id))
  services.jobSearchRepo.save(JobSearchID(id), { ...jobSearch, coverLetter: content })
  return { ok: true }
})
```

### `ipc-vacancies.ts`

```ts
handle("vacancies:cover-letter:load", (jobSearchId: string, vacancyHash: string) => ({
  content: services.vacancyRepo.loadCoverLetter(
    JobSearchID(jobSearchId),
    vacancyHash,
  ),
}))

handle("vacancies:cover-letter:save", (jobSearchId: string, vacancyHash: string, content: string) => {
  services.vacancyRepo.saveCoverLetter(
    JobSearchID(jobSearchId),
    vacancyHash,
    content,
  )
  return { ok: true }
})
```

## 8. UI Changes

### `ui/data/applicants.ts`

```ts
const ApplicantListResponseSchema = z.object({
  applicants: z.array(z.object({ id: z.string(), displayName: z.string() })),
})
```

### `ui/data/job-searches.ts`

```ts
const JobSearchListResponseSchema = z.object({
  jobSearches: z.array(z.object({ id: z.string(), displayName: z.string() })),
})
```

### `ui/pages/job-search/layout.tsx`

```ts
function useJobSearchLayoutData(id: string) {
  const { data } = useJobSearch(id)
  const applicantId = data?.applicantId
  const { displayName } = useApplicantHeaderName(applicantId)
  return {
    searchTitle: data?.jobSearch.searchTerm || id,
    applicantName: displayName,
    applicantId,
  }
}
```

## 9. Service Changes

### `CoverLetterWriter`

```ts
export class CoverLetterWriter {
  constructor(
    private readonly jobSearchRepo: JobSearchRepository,
    private readonly applicantRepo: ApplicantRepository,
    private readonly vacancyRepo: VacancyRepository,
    private readonly llm?: LlmClient,
  ) {}

  async generate(jobSearchId: JobSearchID): Promise<{ content: string }> {
    const { jobSearch, applicantId } = this.jobSearchRepo.load(jobSearchId)
    const applicant = this.applicantRepo.load(applicantId)
    ensureLlmAvailable(this.llm)
    const content = await generateCoverLetter(applicant, jobSearch, this.llm)
    return { content }
  }

  async generateFromDraft(applicantId: ApplicantID): Promise<{ content: string }> {
    const draft = this.jobSearchRepo.loadDraft(applicantId)
    if (!draft) throw new Error(`Draft for applicant "${applicantId.value}" not found`)
    const applicant = this.applicantRepo.load(applicantId)
    const resolved = resolveJobSearchDraft(draft)
    ensureLlmAvailable(this.llm)
    const content = await generateCoverLetter(applicant, resolved, this.llm)
    return { content }
  }

  async generateForVacancy(
    jobSearchId: JobSearchID,
    vacancyHash: string,
  ): Promise<{ content: string }> {
    ensureLlmAvailable(this.llm)
    const vacancy = this.vacancyRepo.findByHash(jobSearchId, vacancyHash)
    if (!vacancy) throw new Error(`Vacancy "${vacancyHash}" not found`)
    const { jobSearch, applicantId } = this.jobSearchRepo.load(jobSearchId)
    const applicant = this.applicantRepo.load(applicantId)
    const templateCoverLetter = jobSearch.coverLetter
    const content = await generatePersonalizedCoverLetter(
      applicant, vacancy, templateCoverLetter, jobSearch, this.llm,
    )
    this.vacancyRepo.saveCoverLetter(jobSearchId, vacancyHash, content)
    return { content }
  }
}
```

### `VacancyScanner` / `VacancyEnricher`

`EnrichContext` replaces `preferences: SearchPreferences` with `jobSearch: JobSearch`.

## 10. Test Updates

### Deleted tests

- `src/utils/id.test.ts`

### Updated tests

1. Remove `id` from `Applicant` mocks; `personalNotes: string`
2. Remove `id`/`applicantId` from `JobSearch` mocks; replace `params`/`preferences` with flat fields
3. Add `coverLetter: ""` to `JobSearch` mocks
4. Update repository mocks:
   - `list()` returns `ApplicantInfo[]` (excludes `"$draft"`)
   - `listByApplicant()` returns `JobSearchInfo[]` (excludes sentinels)
   - `loadDraft()` returns model or `undefined`
   - `finalizeDraft()` returns ID wrapper
5. Update `VacancyRepository` mocks: add cover letter methods

### New test cases

- `list()` excludes `"$draft"`
- `listByApplicant()` excludes `"$draft_*"`
- `load()` throws for sentinels

## 11. Files to Delete

| File | Reason |
|------|--------|
| `src/utils/id.ts` | ID generation moved to repositories |
| `src/utils/id.test.ts` | No longer needed |

Remove `createUniqueDerivedId` from `src/utils/index.ts`.

## 12. Files to Modify

| File | Changes |
|------|---------|
| `src/models/applicant/index.ts` | Remove `id`, `personalNotes: string`, add `ApplicantID` wrapper |
| `src/models/applicant/schemas.ts` | Drop `id`, update `ApplicantInfoSchema` |
| `src/models/applicant/resolve.ts` | Remove `id` handling |
| `src/models/applicant/draft-snapshot.ts` | Move helpers to repo |
| `src/models/job-search/index.ts` | Flatten `JobSearch`, add `JobSearchID` wrapper, `SearchSource` wrapper |
| `src/models/job-search/schemas.ts` | Flat `JobSearchSchema`, update `JobSearchInfoSchema` |
| `src/models/job-search/resolve.ts` | Flatten fields |
| `src/models/job-search/editor-snapshot.ts` | Move helpers to repo, delete unused |
| `src/repositories/applicant/types.ts` | Redesign interface, delete `loadFinalizedApplicantDraft` |
| `src/repositories/applicant/stub/index.ts` | Inline `finalizeDraft`, ID counter |
| `src/repositories/applicant/sqlite/index.ts` | Inline `finalizeDraft`, ID counter, migration |
| `src/repositories/job-search/types.ts` | Redesign interface |
| `src/repositories/job-search/stub/index.ts` | Inline `finalizeDraft`, ID counter, move cover letters |
| `src/repositories/job-search/sqlite/index.ts` | Inline `finalizeDraft`, ID counter, migration |
| `src/repositories/vacancy/types.ts` | Add cover letter methods |
| `src/repositories/vacancy/stub/index.ts` | Add cover letter storage |
| `src/repositories/vacancy/sqlite/index.ts` | Add cover letter methods |
| `src/app/ipc-applicants.ts` | Update handlers |
| `src/app/ipc-job-searches.ts` | Update handlers |
| `src/app/ipc-vacancies.ts` | Add cover letter handlers |
| `src/ui/data/applicants.ts` | Update schemas |
| `src/ui/data/job-searches.ts` | Update schemas |
| `src/services/cover-letter-writer/cover-letter-writer.ts` | Use `JobSearch.coverLetter`, `VacancyRepository` |
| `src/utils/index.ts` | Remove `createUniqueDerivedId` |

## 13. Migration Script

```ts
function migrateDatabase(database: Database): void {
  const version = getUserVersion(database)
  if (version >= 1) return

  database.transaction(() => {
    database.exec(`DROP TABLE IF EXISTS applicant_draft`)
    database.exec(`DROP TABLE IF EXISTS job_search_drafts`)
    database.exec(`ALTER TABLE job_searches ADD COLUMN cover_letter TEXT NOT NULL DEFAULT ''`)
    database.exec(`
      UPDATE job_searches
      SET cover_letter = COALESCE((
        SELECT content FROM cover_letters
        WHERE cover_letters.job_search_id = job_searches.id
          AND cover_letters.vacancy_hash = ''
      ), '')
    `)
    database.exec(`DELETE FROM cover_letters WHERE vacancy_hash = ''`)
    migrateApplicantData(database)
    migrateJobSearchData(database)
    database.exec(`PRAGMA user_version = 1`)
  })
}
```

## 14. Risks

1. **Migration complexity** — JSON blob rewriting is safe for small local databases. Must run in a transaction.
2. **Test churn** — Widespread but mechanical mock data updates.
3. **Stub cover letter migration** — Moving cover letters from `StubJobSearchRepository` to `StubVacancyRepository`.

## 15. Open Questions

1. ~~Should `job-searches:load` include `applicantId`?~~ Resolved: yes, returned alongside `jobSearch`.
2. ~~Should `listByApplicant` return full `JobSearch[]`?~~ Resolved: no, return `JobSearchInfo[]`.
3. What happens if `finalizeDraft` called with no draft? Throw. Keep current behavior.
4. Should `exists()` include sentinels? No. Not needed — `exists()` removed entirely.
