# Repository-Owned IDs and Draft Simplification

## Summary

Eliminate `src/utils/id.ts` by moving ID generation into repositories. Remove `id` from `Applicant` and `id`/`applicantId` from `JobSearch` — domain models become pure data, identity lives in repository keys. Introduce `ApplicantID` and `JobSearchID` nominal types. Simplify draft persistence by removing wrapper types and the `meaningful` column. Move per-vacancy cover letter access from `JobSearchRepository` to `VacancyRepository`. Add `coverLetter` to `JobSearch` for the default/template cover letter.

## Goals

1. Delete `src/utils/id.ts` and `src/utils/id.test.ts`
2. Remove `id` field from `Applicant` model
3. Remove `id` and `applicantId` fields from `JobSearch` model; add `coverLetter: string`
4. Introduce `ApplicantID` and `JobSearchID` nominal types
5. Redesign repository interfaces: models without embedded IDs, repos return `(id, data)` tuples
6. Move `loadApplicationCoverLetter` / `saveApplicationCoverLetter` from `JobSearchRepository` to `VacancyRepository`
7. Simplify draft tables: drop `meaningful` column, store only `data TEXT`
8. Delete `ApplicantDraft`, `ApplicantDraftSnapshot`, `JobSearchDraft`, `JobSearchEditorSnapshot` from models
9. Zero data loss for existing user databases

## Non-Goals

- Changing `Vacancy` model (it already uses `hash`, not `id`)
- Introducing a generic migration framework
- Moving drafts out of SQLite (they stay in SQLite, just simplified)
- Changing the Electron app architecture or IPC transport

## 1. ID Types

Use lightweight class wrappers for nominal typing. No `as` assertions needed.

```ts
export class ApplicantID {
  private constructor(readonly value: string) {}
  static of(value: string): ApplicantID {
    return new ApplicantID(value)
  }
  toString(): string {
    return this.value
  }
}

export class JobSearchID {
  private constructor(readonly value: string) {}
  static of(value: string): JobSearchID {
    return new JobSearchID(value)
  }
  toString(): string {
    return this.value
  }
}
```

These types live in `src/models/applicant/index.ts` and `src/models/job-search/index.ts` respectively, exported from the public surface.

Over IPC they serialize to strings (`.toString()` / `.value`). Zod schemas on the renderer side validate them as `z.string()` and the UI data hooks wrap them via `.of()` when passing to repositories.

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
  personalNotes?: string[]
}
```

- `id` removed
- `resolveApplicant` no longer accepts or produces `id`
- `ApplicantSchema` drops `id` field
- `ApplicantInfo` deleted (no longer needed — lists return full `Applicant`)

### JobSearch

```ts
export interface JobSearch {
  params: SearchParameters
  preferences: SearchPreferences
  coverLetter: string
}
```

- `id` removed
- `applicantId` removed
- `coverLetter` added (default/template cover letter content)
- `resolveJobSearch` no longer accepts or produces `id` or `applicantId`
- `JobSearchSchema` updated accordingly
- `JobSearchInfo` deleted
- `SearchParameters` gains `searchMode: SearchMode` (currently in `JobSearchEditorSnapshot`, should be in the persisted model)

Wait — `searchMode` is already in `SearchParameters`. Let me verify... Yes, it is. Good.

### Deleted Model Types

- `ApplicantDraft` — deleted
- `ApplicantDraftSnapshot` — deleted (was alias for `Applicant`)
- `JobSearchDraft` — deleted
- `JobSearchEditorSnapshot` — deleted

### Draft-related helpers

The following functions from `models/applicant/draft-snapshot.ts` move into `repositories/applicant` as private helpers:
- `createDefaultApplicantDraft()` — returns `Applicant`
- `isMeaningfulApplicantDraft(draft: Applicant): boolean`

The following functions from `models/job-search/editor-snapshot.ts` move into `repositories/job-search` as private helpers:
- `createDefaultJobSearchDraft()` — returns `JobSearch`
- `resolveJobSearchDraft(draft: JobSearch): JobSearch` — normalizes search term
- `isMeaningfulJobSearchDraft(draft: JobSearch): boolean`
- `mapSnapshotToPersistedJobSearch` — deleted (no longer needed)
- `mapPersistedJobSearchToSnapshot` — deleted (no longer needed)

## 3. Repository Interfaces

### ApplicantRepository

```ts
export interface ApplicantRepository {
  all(): Array<{ id: ApplicantID; applicant: Applicant }>
  load(id: ApplicantID): Applicant
  create(name: string): ApplicantID
  save(id: ApplicantID, applicant: Applicant): void
  delete(id: ApplicantID): void
  exists(id: ApplicantID): boolean

  loadDraft(): Applicant | undefined
  saveDraft(draft: Applicant): void
  deleteDraft(): void
  finalizeDraft(): ApplicantID
}
```

- `all()` replaces `list()`, returns full applicants with IDs
- `create(name)` generates sequential ID internally, fills defaults, persists
- `finalizeDraft()` generates ID, persists applicant, clears draft, returns ID
- `loadDraft()` returns `undefined` when no draft exists or draft is not meaningful
- `meaningful` is computed on load, not stored

### JobSearchRepository

```ts
export interface JobSearchRepository {
  all(): Array<{ id: JobSearchID; jobSearch: JobSearch }>
  allForApplicant(applicantId: ApplicantID): Array<{ id: JobSearchID; jobSearch: JobSearch }>
  load(id: JobSearchID): JobSearch
  getApplicantId(id: JobSearchID): ApplicantID
  create(searchTerm: string, applicantId: ApplicantID, searchMode?: SearchMode): JobSearchID
  save(id: JobSearchID, jobSearch: JobSearch): void
  delete(id: JobSearchID): void
  exists(id: JobSearchID): boolean

  loadDraft(applicantId: ApplicantID): JobSearch | undefined
  saveDraft(applicantId: ApplicantID, draft: JobSearch): void
  deleteDraft(applicantId: ApplicantID): void
  finalizeDraft(applicantId: ApplicantID): JobSearchID
}
```

- `all()` returns all job searches with IDs (replaces `list()`)
- `allForApplicant()` replaces `listByApplicant()`
- `getApplicantId()` added for breadcrumb / services that need the applicant from a job search ID
- Cover letter methods removed (moved to `VacancyRepository`)

### VacancyRepository

```ts
export interface VacancyRepository {
  loadAll(jobSearchId: JobSearchID): VacancyListOutput
  save(jobSearchId: JobSearchID, vacancies: Vacancy[], latestCrawl: string): void
  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined
  addActivity(jobSearchId: JobSearchID, hash: string, activity: Activity): void

  // Moved from JobSearchRepository
  loadCoverLetter(jobSearchId: JobSearchID, vacancyHash: string): string
  saveCoverLetter(jobSearchId: JobSearchID, vacancyHash: string, content: string): void
}
```

## 4. ID Generation

Each repository implementation owns ID generation. IDs are sequential numeric strings (`"1"`, `"2"`, etc.) stored in `TEXT PRIMARY KEY` columns.

### SQLite Repositories

On construction, seed a private counter:

```ts
const result = database.prepare(
  "SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) AS max FROM table WHERE id GLOB '[0-9]*'"
).get()
this.nextId = Number(result.max)
```

Old slug IDs like `"anna_lovelace_a3f2"` are excluded by `GLOB '[0-9]*'`. New IDs start from the highest existing numeric string.

```ts
private nextId: number

private generateId(): string {
  return String(++this.nextId)
}
```

`create()` and `finalizeDraft()` call `generateId()` and wrap with `ApplicantID.of()` / `JobSearchID.of()`.

No `exists` callback needed — sequential counter guarantees uniqueness.

### Stub Repositories

Seed from `Map.size` on construction:

```ts
this.nextId = this.store.size
```

Same `String(++this.nextId)` logic.

## 5. Draft Persistence

### Applicant Draft

Keep `applicant_draft` table, simplify schema:

```sql
CREATE TABLE IF NOT EXISTS applicant_draft (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);
```

- Drop `meaningful INTEGER` column
- Store full `Applicant` JSON (no `id` field)
- `loadDraft()` parses JSON, runs `isMeaningfulApplicantDraft()`, returns `Applicant | undefined`

### Job Search Draft

Keep `job_search_drafts` table, simplify schema:

```sql
CREATE TABLE IF NOT EXISTS job_search_drafts (
  applicant_id TEXT PRIMARY KEY,
  data TEXT NOT NULL
);
```

- Drop `meaningful INTEGER` column
- Store full `JobSearch` JSON (no `id`, no `applicantId`)
- `loadDraft(applicantId)` parses JSON, runs `isMeaningfulJobSearchDraft()`, returns `JobSearch | undefined`
- The returned `JobSearch` has `coverLetter` populated from draft data

### Migration (Old → New Schema)

For existing databases:
1. `ALTER TABLE applicant_draft DROP COLUMN meaningful` — SQLite supports DROP COLUMN (v3.35.0+). Node.js 22 bundles SQLite 3.44+, so this is safe.
2. `ALTER TABLE job_search_drafts DROP COLUMN meaningful`

If `DROP COLUMN` fails (unlikely), recreate tables and copy data.

## 6. SQLite Schema Changes

### `applicants` table

No schema changes. `id TEXT PRIMARY KEY` already supports both old slug IDs and new numeric-string IDs.

The `data` JSON blob no longer contains `id`. On `save()`, the repo serializes `Applicant` (without `id`). On `load()`, it parses and returns `Applicant`.

### `job_searches` table

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
- `applicant_id` stays as a relational column (foreign key to `applicants`)

**Migration:**
```sql
ALTER TABLE job_searches ADD COLUMN cover_letter TEXT NOT NULL DEFAULT '';
```

Then migrate existing default cover letters:
```sql
UPDATE job_searches
SET cover_letter = (
  SELECT content FROM cover_letters
  WHERE cover_letters.job_search_id = job_searches.id
    AND cover_letters.vacancy_hash = ''
)
WHERE EXISTS (
  SELECT 1 FROM cover_letters
  WHERE cover_letters.job_search_id = job_searches.id
    AND cover_letters.vacancy_hash = ''
);
```

After migration, delete the migrated rows from `cover_letters`:
```sql
DELETE FROM cover_letters WHERE vacancy_hash = '';
```

### `cover_letters` table

No schema changes. After migration, only per-vacancy cover letters remain (`vacancy_hash != ''`).

### `vacancy_meta` and `vacancies` tables

No schema changes. `job_search_id` column stays as `TEXT` referencing `job_searches(id)`.

## 7. IPC Changes

### `ipc-applicants.ts`

```ts
handle("applicants:list", () => ({
  applicants: services.applicantRepo.all().map((entry) => ({
    id: entry.id.value,
    applicant: entry.applicant,
  })),
}))

handle("applicants:create", (name: string) => ({
  id: services.applicantRepo.create(name).value,
}))

handle("applicants:load", (id: string) =>
  services.applicantRepo.load(ApplicantID.of(id)),
)

handle("applicants:save", (id: string, data: unknown) => {
  const applicant = ApplicantSchema.parse(data)
  services.applicantRepo.save(ApplicantID.of(id), applicant)
  return { ok: true }
})

handle("applicants:delete", (id: string) => {
  services.applicantRepo.delete(ApplicantID.of(id))
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
handle("job-searches:list", (applicantId?: string) => {
  const entries = applicantId
    ? services.jobSearchRepo.allForApplicant(ApplicantID.of(applicantId))
    : services.jobSearchRepo.all()
  return {
    jobSearches: entries.map((entry) => ({
      id: entry.id.value,
      jobSearch: entry.jobSearch,
    })),
  }
})

handle(
  "job-searches:create",
  (searchTerm: string, applicantId: string, searchMode?: SearchMode) => ({
    id: services.jobSearchRepo.create(
      searchTerm,
      ApplicantID.of(applicantId),
      searchMode,
    ).value,
  }),
)

handle("job-searches:load", (id: string) => {
  const { jobSearch, applicantId } = services.jobSearchRepo.load(JobSearchID.of(id))
  return { jobSearch, applicantId: applicantId.value }
})

handle("job-searches:save", (id: string, data: unknown) => {
  const jobSearch = JobSearchSchema.parse(data)
  services.jobSearchRepo.save(JobSearchID.of(id), jobSearch)
  return { ok: true }
})

handle("job-searches:delete", (id: string) => {
  services.jobSearchRepo.delete(JobSearchID.of(id))
  return { deleted: id }
})

handle("job-searches:draft:load", (applicantId: string) => ({
  draft: services.jobSearchRepo.loadDraft(ApplicantID.of(applicantId)),
}))

handle("job-searches:draft:save", (applicantId: string, draft: unknown) => {
  const jobSearch = JobSearchSchema.parse(draft)
  services.jobSearchRepo.saveDraft(ApplicantID.of(applicantId), jobSearch)
  return { ok: true }
})

handle("job-searches:draft:finalize", (applicantId: string) => ({
  id: services.jobSearchRepo.finalizeDraft(ApplicantID.of(applicantId)).value,
}))

handle("job-searches:cover-letter:load", (id: string) => ({
  content: services.jobSearchRepo.load(JobSearchID.of(id)).coverLetter,
}))

handle("job-searches:cover-letter:save", (id: string, content: string) => {
  const jobSearch = services.jobSearchRepo.load(JobSearchID.of(id))
  services.jobSearchRepo.save(JobSearchID.of(id), { ...jobSearch, coverLetter: content })
  return { ok: true }
})
```

Note: `job-searches:cover-letter:load` no longer goes through a separate repo method — it reads `coverLetter` from the loaded `JobSearch`.

### Cover letter IPC (vacancy)

Per-vacancy cover letter handlers move to a new `ipc-vacancies.ts` or added to existing vacancy handlers:

```ts
handle("vacancies:cover-letter:load", (jobSearchId: string, vacancyHash: string) => ({
  content: services.vacancyRepo.loadCoverLetter(
    JobSearchID.of(jobSearchId),
    vacancyHash,
  ),
}))

handle("vacancies:cover-letter:save", (jobSearchId: string, vacancyHash: string, content: string) => {
  services.vacancyRepo.saveCoverLetter(
    JobSearchID.of(jobSearchId),
    vacancyHash,
    content,
  )
  return { ok: true }
})
```

Existing `job-searches:vacancies:cover-letter:*` handlers redirect to vacancy repo.

## 8. UI Changes

### `ui/data/applicants.ts`

```ts
export function useApplicantListView() {
  const query = useApplicants()
  return {
    ...query,
    data: query.data?.applicants ?? [],
  }
}

export function useApplicant(id: string) {
  return useQuery({
    queryKey: ["applicant", id],
    queryFn: async () =>
      ApplicantSchema.parse(await api().invoke("applicants:load", id)),
    enabled: !!id,
  })
}

export function useApplicantDraft() {
  return useQuery({
    queryKey: ["applicant-draft"],
    queryFn: async () =>
      ApplicantDraftResponseSchema.parse(
        await api().invoke("applicants:draft:load"),
      ),
  })
}

export function useSaveApplicantDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (applicant: Applicant) =>
      api().invoke("applicants:draft:save", applicant),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applicant-draft"] }),
  })
}

export function useFinalizeApplicantDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      CreatedIdSchema.parse(await api().invoke("applicants:draft:finalize")),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ["applicant-draft"] })
      await queryClient.invalidateQueries({ queryKey: ["applicants"] })
      await queryClient.invalidateQueries({ queryKey: ["applicant", id] })
    },
  })
}

const ApplicantDraftResponseSchema = z.object({
  draft: ApplicantSchema.optional(),
})

const ApplicantListResponseSchema = z.object({
  applicants: z.array(z.object({ id: z.string(), applicant: ApplicantSchema })),
})
```

### `ui/data/job-searches.ts`

```ts
export function useJobSearch(id: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.detail(id),
    queryFn: async () =>
      JobSearchSchema.parse(await api().invoke("job-searches:load", id)),
    enabled: !!id,
  })
}

export function useJobSearchDraft(applicantId: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.draft(applicantId),
    queryFn: async () =>
      JobSearchDraftResponseSchema.parse(
        await api().invoke("job-searches:draft:load", applicantId),
      ),
    enabled: !!applicantId,
  })
}

export function useSaveJobSearchDraft(applicantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jobSearch: JobSearch) =>
      api().invoke("job-searches:draft:save", applicantId, jobSearch),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.draft(applicantId)),
  })
}

export function useJobSearchListView(applicantId?: string) {
  const query = useJobSearches(applicantId)
  return {
    ...query,
    data: query.data ?? { jobSearches: [] },
  }
}

const JobSearchDraftResponseSchema = z.object({
  draft: JobSearchSchema.optional(),
})

const JobSearchListResponseSchema = z.object({
  jobSearches: z.array(z.object({ id: z.string(), jobSearch: JobSearchSchema })),
})
```

### `ui/pages/job-search/layout.tsx`

```ts
function useJobSearchLayoutData(id: string) {
  const { data } = useJobSearch(id)
  const applicantId = data?.applicantId
  const { displayName } = useApplicantHeaderName(applicantId)
  return {
    searchTitle: data?.jobSearch.params.searchTerm || id,
    applicantName: displayName,
    applicantId,
  }
}

### `ui/pages/applicant/views/overview.tsx`

```ts
function useOverviewData(id: string) {
  const { data, isLoading } = useApplicant(id)
  const { displayName } = useApplicantHeaderName(id)
  const jobSearches = useJobSearchListView(id)
  const jobSearchItems = jobSearches.data.jobSearches.map((entry) => ({
    id: entry.id,
    label: entry.jobSearch.params.searchTerm || entry.id,
  }))
  return {
    data,
    isLoading,
    displayName,
    jobSearchItems,
    jobSearchesLoading: jobSearches.isLoading,
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
      applicant,
      vacancy,
      templateCoverLetter,
      jobSearch,
      this.llm,
    )
    this.vacancyRepo.saveCoverLetter(jobSearchId, vacancyHash, content)
    return { content }
  }
}
```

### `VacancyScanner` / `VacancyEnricher`

These services receive `jobSearchId: JobSearchID` and load the `JobSearch` directly. No changes to their core logic except parameter types.

## 10. Test Updates

### Deleted tests

- `src/utils/id.test.ts` — deleted (file deleted)

### Updated tests

All test files with hardcoded `Applicant` or `JobSearch` mock data need updates:

1. Remove `id` from `Applicant` mock objects
2. Remove `id` and `applicantId` from `JobSearch` mock objects
3. Add `coverLetter: ""` to `JobSearch` mock objects
4. Update `ApplicantRepository` and `JobSearchRepository` mocks:
   - `all()` returns `Array<{ id: ApplicantID/JobSearchID; applicant/jobSearch: Xxx }>`
   - `create()` returns `ApplicantID` / `JobSearchID`
   - `loadDraft()` returns `Applicant | undefined` / `JobSearch | undefined`
   - `finalizeDraft()` returns `ApplicantID` / `JobSearchID`
5. Update `VacancyRepository` mocks: add `loadCoverLetter` / `saveCoverLetter`

### Key test files to update

- `src/repositories/applicant/applicant.test.ts`
- `src/repositories/job-search/job-search.test.ts`
- `src/models/applicant/resolve.test.ts`
- `src/models/job-search/resolve.test.ts`
- `src/services/cover-letter-writer/cover-letter-writer.test.ts`
- `src/services/vacancy-scanner/enrich-queue.test.ts`
- `src/services/vacancy-enricher/vacancy-enricher.test.ts`
- `src/ui/pages/applicant/views/wizard.test.tsx`
- `src/ui/pages/job-search/views/wizard.test.tsx`
- `src/ui/pages/first-start/views.test.tsx`

## 11. Files to Delete

| File | Reason |
|------|--------|
| `src/utils/id.ts` | ID generation moved to repositories |
| `src/utils/id.test.ts` | No longer needed |

Remove `createUniqueDerivedId` from `src/utils/index.ts`.

## 12. Files to Modify (Significant)

| File | Changes |
|------|---------|
| `src/models/applicant/index.ts` | Remove `id` from `Applicant`, delete `ApplicantDraft`/`ApplicantDraftSnapshot`, add `ApplicantID` class |
| `src/models/applicant/schemas.ts` | Drop `id` from `ApplicantSchema`, delete `ApplicantInfoSchema` |
| `src/models/applicant/resolve.ts` | Remove `id` handling |
| `src/models/applicant/draft-snapshot.ts` | Move helpers to repo, rename exports |
| `src/models/job-search/index.ts` | Remove `id`/`applicantId` from `JobSearch`, add `coverLetter`, delete `JobSearchDraft`/`JobSearchEditorSnapshot`, add `JobSearchID` class |
| `src/models/job-search/schemas.ts` | Update `JobSearchSchema`, delete `JobSearchInfoSchema`/`JobSearchDraftSchema` |
| `src/models/job-search/resolve.ts` | Remove `id`/`applicantId` handling |
| `src/models/job-search/editor-snapshot.ts` | Move helpers to repo, delete unused exports |
| `src/repositories/applicant/types.ts` | Redesign interface, delete `loadFinalizedApplicantDraft` |
| `src/repositories/applicant/stub/index.ts` | Inline `finalizeDraft`, add ID counter, update all methods |
| `src/repositories/applicant/sqlite/index.ts` | Inline `finalizeDraft`, add ID counter, update schema, migrate data |
| `src/repositories/job-search/types.ts` | Redesign interface |
| `src/repositories/job-search/stub/index.ts` | Inline `finalizeDraft`, add ID counter, move cover letters to vacancy stub |
| `src/repositories/job-search/sqlite/index.ts` | Inline `finalizeDraft`, add ID counter, update schema, migrate data |
| `src/repositories/vacancy/types.ts` | Add cover letter methods |
| `src/repositories/vacancy/stub/index.ts` | Add cover letter storage |
| `src/repositories/vacancy/sqlite/index.ts` | Add cover letter methods |
| `src/app/ipc-applicants.ts` | Update handlers for new types |
| `src/app/ipc-job-searches.ts` | Update handlers, move vacancy cover letters |
| `src/app/ipc-vacancies.ts` | Add cover letter handlers (or merge into existing) |
| `src/ui/data/applicants.ts` | Update schemas, hooks |
| `src/ui/data/job-searches.ts` | Update schemas, hooks |
| `src/services/cover-letter-writer/cover-letter-writer.ts` | Use `JobSearch.coverLetter`, `VacancyRepository` for per-vacancy |
| `src/utils/index.ts` | Remove `createUniqueDerivedId` export |

## 13. Migration Script

A single migration function runs when the SQLite database is opened:

```ts
function migrateDatabase(database: Database): void {
  const version = getUserVersion(database)
  if (version >= 1) return

  database.transaction(() => {
    // 1. Drop meaningful columns from draft tables
    database.exec(`ALTER TABLE applicant_draft DROP COLUMN meaningful`)
    database.exec(`ALTER TABLE job_search_drafts DROP COLUMN meaningful`)

    // 2. Add cover_letter to job_searches
    database.exec(`ALTER TABLE job_searches ADD COLUMN cover_letter TEXT NOT NULL DEFAULT ''`)

    // 3. Migrate default cover letters from cover_letters to job_searches
    database.exec(`
      UPDATE job_searches
      SET cover_letter = COALESCE((
        SELECT content FROM cover_letters
        WHERE cover_letters.job_search_id = job_searches.id
          AND cover_letters.vacancy_hash = ''
      ), '')
    `)

    // 4. Delete migrated default cover letters
    database.exec(`DELETE FROM cover_letters WHERE vacancy_hash = ''`)

    // 5. Update data JSON blobs: remove id from applicants, remove id/applicantId from job_searches
    // Note: This requires loading each row, parsing JSON, deleting fields, re-serializing.
    // Since local app databases are small, this is acceptable.
    migrateApplicantData(database)
    migrateJobSearchData(database)

    // 6. Bump version
    database.exec(`PRAGMA user_version = 1`)
  })
}
```

The JSON blob migration is necessary because:
- Old `applicants.data` contains `id: "slug_id"`
- Old `job_searches.data` contains `id` and `applicantId`
- New code expects these fields to be absent

Implementation:
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

## 14. Risks

1. **Migration complexity** — The JSON blob rewriting is unusual but safe for small local databases. Must run in a transaction.
2. **ID type serialization** — `ApplicantID` / `JobSearchID` class instances serialize to plain strings over IPC. The renderer-side Zod schemas use `z.string()` and the UI wraps with `.of()` when calling repos. This boundary needs careful handling.
3. **Test churn** — Many test files need mock data updates. The change is mechanical but widespread.
4. **Stub repository cover letter migration** — Moving cover letters from `StubJobSearchRepository` to `StubVacancyRepository` requires updating all tests that construct stub repos with initial cover letter data.

## 15. Open Questions

1. ~~Should `job-searches:load` return `{ jobSearch: JobSearch, applicantId: string }` to avoid a separate `getApplicantId` query?~~
   - **Resolved:** `JobSearchRepository.load()` returns `{ jobSearch: JobSearch; applicantId: ApplicantID }`. IPC handler unwraps to `{ jobSearch, applicantId: string }`.

2. Should `allForApplicant` return just `JobSearch[]` (without IDs) since the caller already knows the applicant ID?
   - **No.** The UI needs job search IDs for navigation and queries. Return full tuples.

3. What happens if `finalizeDraft` is called when no draft exists?
   - Current behavior: throw. Keep this behavior.
