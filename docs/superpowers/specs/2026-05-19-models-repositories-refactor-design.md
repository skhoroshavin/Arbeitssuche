# Models and Repositories Refactor Design

**Date:** 2026-05-19

## 1. Overview

Refactor `src/models` and `src/repositories` to eliminate partial-resolution indirection, merge fragmented files, move persistence-specific logic out of models, and enforce the "no optional strings" policy across all domain types.

## 2. Goals

- **Remove `ApplicantInput` and `resolveApplicant` / `resolveJobSearch`.** Models become rich classes with explicit default constructors and static `parse()` methods.
- **Convert `Applicant` and `JobSearch` to classes** following the `Vacancy` pattern, with mutable fields and no `with()` method.
- **Merge `disclose` into `Applicant.personal`** as four boolean flags.
- **Make `address` non-optional** (empty fields = no address).
- **Change `hobbies` from `string[]` to `string`.**
- **No optional strings anywhere** in `Applicant`, `JobSearch`, or `Vacancy` — empty string means "none".
- **Move `formatApplicantSections` into `Applicant.llmFriendlyDescription()`** returning a single `string`.
- **Move draft-meaningfulness logic into classes** as `isDifferentFromDefault(): boolean`.
- **Merge `types.ts` into `index.ts`** for all three repositories.
- **Rename repository integration tests** to `integration.test.ts`.
- **Split `sqlite-migrate` into per-repository migrations**, each self-runs on construction. The v0 baseline is the schema from the `v0.2.0` git tag.
- **Rename ID factory functions** to `makeApplicantID` and `makeJobSearchID` to avoid type/function name collision.

## 3. Model Architecture

### 3.1 Applicant → Class

**New file:** `src/models/applicant/applicant.ts`

```typescript
export class Applicant {
  personal: ApplicantPersonal
  experience: ApplicantExperience[]
  education: ApplicantEducation[]
  skills: ApplicantSkill[]
  languages: ApplicantLanguage[]
  certifications: ApplicantCertification[]
  personalNotes: string

  constructor() {
    this.personal = {
      name: "",
      email: "",
      phone: "",
      birthdate: "",
      gender: "",
      address: { street: "", zip: "", city: "" },
      hobbies: "",
      discloseBirthdate: false,
      discloseGender: false,
      discloseAddress: false,
      discloseHobbies: false,
    }
    this.experience = []
    this.education = []
    this.skills = []
    this.languages = []
    this.certifications = []
    this.personalNotes = ""
  }

  static parse(data: unknown): Applicant { ... }
  isDifferentFromDefault(): boolean { ... }
  llmFriendlyDescription(): string { ... }
}
```

**Key changes:**
- `disclose` object merged into `personal` as `discloseBirthdate`, `discloseGender`, `discloseAddress`, `discloseHobbies`.
- `address` is always present; empty address = `{street: "", zip: "", city: ""}`.
- `hobbies` is `string` (free text, not an array).
- All string fields in nested types are non-optional:
  - `ApplicantExperience.location: string` (default `""`)
  - `ApplicantEducation.startDate: string`, `endDate: string`, `location: string`
  - `ApplicantCertification.issuer: string`, `date: string`, `description: string`
- `parse()` uses an internal Zod schema (not exported) to validate raw data and populate a new instance. This is the **only** way to construct from external data.
- Fields are mutable — assign directly. No `with()` method.
- `isDifferentFromDefault()` replaces `isMeaningfulApplicantDraftSnapshot`.
- `llmFriendlyDescription()` replaces `formatApplicantSections`, returning a single `string` with `\n\n` between sections.

**Deleted files:**
- `src/models/applicant/resolve.ts`
- `src/models/applicant/resolve.test.ts`
- `src/models/applicant/draft-snapshot.ts`
- `src/models/applicant/format.ts`
- `src/models/applicant/constants.ts` (replaced by `new Applicant()`)
- `src/models/applicant/schemas.ts` (`ApplicantSchema` becomes internal to `applicant.ts`; `ApplicantInfoSchema` moves to `index.ts`)

**Updated exports in `index.ts`:**
- Export `Applicant` class.
- Export `makeApplicantID` (renamed from `ApplicantID`).
- Keep `ApplicantInfo` type and `ApplicantInfoSchema` (moved from deleted `schemas.ts`).
- Keep `ResumeTemplate` type and `RESUME_TEMPLATES` constant (moved from deleted `constants.ts`).

### 3.2 JobSearch → Class

**New file:** `src/models/job-search/job-search.ts`

Same pattern: `new JobSearch()` for defaults, `JobSearch.parse(data)` for validation, mutable fields.

```typescript
export class JobSearch {
  searchTerm: string
  radiusKm: number
  mode: SearchMode
  sources: SearchSource[]
  maxResultsPerSource: number
  maxCommuteMinutes: number
  notes: string
  coverLetter: string

  constructor() { ... }
  static parse(data: unknown): JobSearch { ... }
  isDifferentFromDefault(): boolean { ... }
}
```

**Key changes:**
- All string fields non-optional (`notes: string`, `coverLetter: string`).
- `isDifferentFromDefault()` replaces `isMeaningfulJobSearchEditorSnapshot`.
- `resolveDraftJobSearch` (the "Neue Suche" fallback) is **removed from model** and moved to repository.

**Deleted files:**
- `src/models/job-search/resolve.ts`
- `src/models/job-search/resolve.test.ts`
- `src/models/job-search/editor-snapshot.ts`
- `src/models/job-search/constants.ts`
- `src/models/job-search/schemas.ts` (`JobSearchSchema` becomes internal to `job-search.ts`; `JobSearchInfoSchema` moves to `index.ts`)

**Updated exports in `index.ts`:**
- Export `JobSearch` class.
- Export `makeJobSearchID` (renamed from `JobSearchID`).
- Keep `JobSearchInfo` type and `JobSearchInfoSchema` (moved from deleted `schemas.ts`).
- Keep `SEARCH_MODES`, `SEARCH_MODE_LABELS` (moved from deleted `constants.ts`).

### 3.3 Vacancy — Minor Cleanup

Vacancy is already a class. Apply "no optional strings":

- `VacancyContact.name: string` (default `""`)
- `VacancyContact.email: string` (default `""`)
- `VacancyContact.phone: string` (default `""`)
- `BaseActivity.notes: string` (default `""`)
- `FoundActivity.description: string` (default `""`)
- `FoundActivity.contact: VacancyContact` (default empty)
- `OfferedActivity.startDate: string` (default `""`)
- `OfferedActivity.salary: string` (default `""`)

Update `resolveVacancy()` to fill `""` for these fields. Schema updated accordingly.

### 3.4 ID Factory Renames

- `ApplicantID` (function) → `makeApplicantID(value: string): ApplicantID`
- `JobSearchID` (function) → `makeJobSearchID(value: string): JobSearchID`

The interfaces keep the same names.

## 4. Repository Changes

### 4.1 Merge `types.ts` into `index.ts`

For all three repositories:

| Repository | Move interface from | Into |
|---|---|---|
| applicant | `src/repositories/applicant/types.ts` | `src/repositories/applicant/index.ts` |
| job-search | `src/repositories/job-search/types.ts` | `src/repositories/job-search/index.ts` |
| vacancy | `src/repositories/vacancy/types.ts` | `src/repositories/vacancy/index.ts` |

Internal `sqlite/index.ts` and `stub/index.ts` import the type via:
```typescript
import type { XxxRepository } from "../index.js"
```
This is a type-only import (erased at runtime), so no circular dependency. Delete the standalone `types.ts` files.

### 4.2 Rename Integration Tests

| Old path | New path |
|---|---|
| `src/repositories/applicant/applicant.test.ts` | `src/repositories/applicant/integration.test.ts` |
| `src/repositories/job-search/job-search.test.ts` | `src/repositories/job-search/integration.test.ts` |
| `src/repositories/vacancy/vacancy.test.ts` | `src/repositories/vacancy/integration.test.ts` |

### 4.3 Split Migration into Repositories

**Delete:** `src/repositories/sqlite-migrate/index.ts`

**Introduce shared migrations table:**

```sql
CREATE TABLE IF NOT EXISTS _migrations (
  repository TEXT PRIMARY KEY,
  version TEXT NOT NULL
)
```

Versions are stored as semver strings (e.g. `"0.3.0"`). Comparison uses a simple semver helper that splits on `.` and compares major/minor/patch numerically, so `"0.10.0" > "0.3.0"`.

Each `createSqlite*Repository(database)` checks its version and runs v0→v0.3.0 migration **before** `CREATE TABLE IF NOT EXISTS`. The v0 baseline is the schema from the `v0.2.0` git tag.

#### Applicant Repository Migration (v0→v1)

```sql
-- v0.2.0 schema had:
--   applicants (id TEXT PK, name TEXT, data TEXT)
--   applicant_draft (id INTEGER PK CHECK(id=1), data TEXT, meaningful INTEGER)

DROP TABLE IF EXISTS applicant_draft;

-- Remove embedded 'id' from JSON data
UPDATE applicants SET data = json_remove(data, '$.id') WHERE json_type(data, '$.id') IS NOT NULL;

PRAGMA user_version is NOT used per-repo; use _migrations instead.
```

Set `_migrations` version to `"0.3.0"` for repository `"applicant"`.

#### Job Search Repository Migration (v0→v1)

```sql
-- v0.2.0 schema had:
--   job_searches (id TEXT PK, applicant_id TEXT, search_term TEXT, data TEXT)
--   cover_letters (job_search_id, vacancy_hash, content, PK(job_search_id, vacancy_hash))
--   job_search_drafts (applicant_id TEXT PK, data TEXT, meaningful INTEGER)

DROP TABLE IF EXISTS job_search_drafts;

-- Add cover_letter column if missing (current main already has it, but v0.2.0 does not)
ALTER TABLE job_searches ADD COLUMN cover_letter TEXT NOT NULL DEFAULT '';

-- Migrate default cover letter from cover_letters table
UPDATE job_searches
SET cover_letter = COALESCE((
  SELECT content FROM cover_letters
  WHERE cover_letters.job_search_id = job_searches.id AND vacancy_hash = ''
), '');

DELETE FROM cover_letters WHERE vacancy_hash = '';

-- Clean JSON data
UPDATE job_searches SET data = json_remove(data, '$.id') WHERE json_type(data, '$.id') IS NOT NULL;
UPDATE job_searches SET data = json_remove(data, '$.applicantId') WHERE json_type(data, '$.applicantId') IS NOT NULL;
```

Set `_migrations` version to `"0.3.0"` for repository `"job-search"`.

#### Vacancy Repository Migration (v0→v1)

No schema changes from v0.2.0. Just set `_migrations` version to `"0.3.0"` for repository `"vacancy"`.

### 4.4 Remove `resolveApplicant` / `resolveJobSearch` Usage

Repositories replace all `resolveApplicant()` / `resolveJobSearch()` calls with `Applicant.parse()` / `JobSearch.parse()`:

- `load()`: `Applicant.parse(rowData)`
- `save()`: Re-parse to normalize: `const normalized = Applicant.parse(JSON.parse(JSON.stringify(data)))`
- `saveDraft()`: Same pattern.
- `finalizeDraft()`: Load draft, parse, store.

### 4.5 Move Draft Finalization Logic into Repositories

The "Neue Suche" fallback (when `searchTerm` is empty on finalize, use `"Neue Suche"`) becomes a private helper inside the job-search repository. No model code is involved.

### 4.6 `isMeaningful` → `isDifferentFromDefault()`

Both applicant and job-search repositories call `instance.isDifferentFromDefault()` on the class instance. No separate utility imports.

### 4.7 Composition Root Change

`src/app/composition/create-service-context.ts`:

- Remove `import { migrateSqliteDatabase } from "@/repositories/sqlite-migrate/index.js"`.
- Remove the `migrateSqliteDatabase(database)` call.
- Each repository self-migrates on construction.

## 5. Cross-Layer Consumer Updates

### 5.1 IPC Handlers

**`src/app/ipc-applicants.ts`:**
- Replace `ApplicantSchema.parse(data)` → `Applicant.parse(data)`.
- Remove `ApplicantSchema` import.

**`src/app/ipc-job-searches.ts`:**
- Replace `JobSearchSchema.parse(data)` → `JobSearch.parse(data)`.
- Remove `JobSearchSchema` import.

### 5.2 UI Data Hooks

**`src/ui/data/applicants.ts`:**
- Replace `ApplicantSchema.parse(...)` → `Applicant.parse(...)`.

**`src/ui/data/job-searches.ts`:**
- Replace `JobSearchSchema.parse(...)` → `JobSearch.parse(...)`.

### 5.3 UI Pages

**Applicant wizard** (`src/ui/pages/applicant/views/wizard.tsx`):
- `createDefaultApplicantDraftSnapshot()` → `new Applicant()`
- `isMeaningfulApplicantDraftSnapshot` → `.isDifferentFromDefault()`

**Applicant editor form** (`src/ui/pages/applicant/views/editor-form.ts`):
- `hobbies` is now `string` — remove `joinLines`/`splitLines` for hobbies. `highlights` and `personalNotes` keep their line-splitting.
- `disclose` moved into `personal` — form shape updates to match.

**Job search wizard** (`src/ui/pages/job-search/views/wizard.tsx`):
- `createDefaultJobSearchEditorSnapshot()` → `new JobSearch()`
- `isMeaningfulJobSearchEditorSnapshot` → `.isDifferentFromDefault()`

### 5.4 Service Tests

**`src/services/cover-letter-writer/cover-letter-writer.test.ts`:**
- Replace `DEFAULT_APPLICANT` spread with `new Applicant()` and direct field assignment.

### 5.5 Vacancy Consumers

`VacancyContact` and `Activity` shape changes (no optionals) affect:

- `src/services/vacancy-enricher/extract-contact.ts`: Always produces `name`, `email`, `phone` strings.
- `src/services/vacancy-processor/process.ts`: Activity construction fills `notes: ""`.
- All tests constructing `Vacancy` partials — ensure `contact: {}` becomes `contact: { name: "", email: "", phone: "" }` where required.

## 6. Testing Strategy

### 6.1 Model Tests

- **`src/models/applicant/applicant.test.ts`** (new): Tests for `Applicant.parse()`, `isDifferentFromDefault()`, `llmFriendlyDescription()`, default construction.
- **`src/models/job-search/job-search.test.ts`** (new): Tests for `JobSearch.parse()`, `isDifferentFromDefault()`, default construction.
- **`src/models/vacancy/vacancy.test.ts`** (updated): Update test data to include all non-optional string fields.

### 6.2 Repository Integration Tests

Each `integration.test.ts` tests:

- Stub and SQLite implementations (same pattern as today).
- Persistence across instances (already exists).
- **Migration test** (new): Seed a temp database with the exact v0.2.0 schema and data, construct the repository, assert:
  - Old tables are gone (e.g., `applicant_draft`, `job_search_drafts`).
  - New columns exist (`cover_letter` on `job_searches`).
  - Data is readable and correctly transformed (embedded `id` removed, etc.).

### 6.3 Service / UI Tests

- Update test fixtures to use `new Applicant()` / `new JobSearch()`.
- Update form value mappings for the new `personal` shape and `hobbies` as `string`.

## 7. File Changes Summary

### New Files
- `src/models/applicant/applicant.ts`
- `src/models/job-search/job-search.ts`
- `src/models/applicant/applicant.test.ts`
- `src/models/job-search/job-search.test.ts`

### Deleted Files
- `src/models/applicant/resolve.ts`
- `src/models/applicant/resolve.test.ts`
- `src/models/applicant/draft-snapshot.ts`
- `src/models/applicant/format.ts`
- `src/models/applicant/constants.ts`
- `src/models/applicant/schemas.ts`
- `src/models/job-search/resolve.ts`
- `src/models/job-search/resolve.test.ts`
- `src/models/job-search/editor-snapshot.ts`
- `src/models/job-search/constants.ts`
- `src/models/job-search/schemas.ts`
- `src/repositories/applicant/types.ts`
- `src/repositories/job-search/types.ts`
- `src/repositories/vacancy/types.ts`
- `src/repositories/sqlite-migrate/index.ts`

### Renamed Files
- `src/repositories/applicant/applicant.test.ts` → `integration.test.ts`
- `src/repositories/job-search/job-search.test.ts` → `integration.test.ts`
- `src/repositories/vacancy/vacancy.test.ts` → `integration.test.ts`

### Modified Files
- `src/models/applicant/index.ts`
- `src/models/applicant/id.ts`
- `src/models/job-search/index.ts`
- `src/models/job-search/id.ts`
- `src/models/vacancy/index.ts`
- `src/models/vacancy/schemas.ts`
- `src/models/vacancy/resolve.ts`
- `src/repositories/applicant/index.ts`
- `src/repositories/applicant/sqlite/index.ts`
- `src/repositories/applicant/stub/index.ts`
- `src/repositories/job-search/index.ts`
- `src/repositories/job-search/sqlite/index.ts`
- `src/repositories/job-search/stub/index.ts`
- `src/repositories/vacancy/index.ts`
- `src/repositories/vacancy/sqlite/index.ts`
- `src/repositories/vacancy/stub/index.ts`
- `src/app/composition/create-service-context.ts`
- `src/app/ipc-applicants.ts`
- `src/app/ipc-job-searches.ts`
- `src/ui/data/applicants.ts`
- `src/ui/data/job-searches.ts`
- `src/ui/pages/applicant/views/wizard.tsx`
- `src/ui/pages/applicant/views/wizard.test.tsx`
- `src/ui/pages/applicant/views/editor-form.ts`
- `src/ui/pages/job-search/views/wizard.tsx`
- `src/ui/pages/job-search/views/wizard.test.tsx`
- `src/services/cover-letter-writer/cover-letter-writer.test.ts`
- `src/services/vacancy-enricher/extract-contact.ts`
- `src/services/vacancy-processor/process.ts`
- `src/services/cover-letter-writer/generate.ts`
- `src/services/cover-letter-writer/generate-personalized.ts`
- `src/services/job-consultant/consult-searches.ts`
- `src/services/vacancy-enricher/assess.ts`
- `src/repositories/vacancy/vacancy.test.ts`
- `src/repositories/applicant/applicant.test.ts`
- `src/repositories/job-search/job-search.test.ts`

## 8. Error Handling

- `Applicant.parse()` and `JobSearch.parse()` throw on invalid data — same behavior as current `Schema.parse()`.
- Repository migrations are wrapped in `database.transaction()` for atomicity.
- If migration fails, the repository constructor throws and the app fails fast on startup.
