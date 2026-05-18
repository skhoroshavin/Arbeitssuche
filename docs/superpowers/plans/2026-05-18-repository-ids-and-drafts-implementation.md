# Implementation Plan: Repository-Owned IDs and Draft Simplification

## Overview

Eliminate `src/utils/id.ts` by moving ID generation into repositories. Remove `id` from `Applicant` and `id`/`applicantId` from `JobSearch`. Introduce `ApplicantID` and `JobSearchID` wrappers. Simplify draft persistence with sentinel IDs in main tables. Move per-vacancy cover letters to `VacancyRepository`.

## Execution Order

Execute tasks sequentially. The codebase will not fully compile until Task 8 due to cross-cutting interface changes. Do not run the full test suite until Task 13.

---

## Task 1: Create ID Wrapper Types

**Files:**
- Create: `src/models/applicant/id.ts`
- Create: `src/models/job-search/id.ts`

- [ ] **Step 1: Write `ApplicantID` wrapper**

```ts
export interface ApplicantID {
  value: string
}

export function ApplicantID(value: string): ApplicantID {
  return { value }
}
```

- [ ] **Step 2: Write `JobSearchID` and `SearchSource` wrappers**

```ts
export interface JobSearchID {
  value: string
}

export function JobSearchID(value: string): JobSearchID {
  return { value }
}

export interface SearchSource {
  value: string
}

export function SearchSource(value: string): SearchSource {
  return { value }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/models/applicant/id.ts src/models/job-search/id.ts
git commit -m "feat: add ApplicantID, JobSearchID, SearchSource wrappers"
```

---

## Task 2: Update Applicant Domain Model

**Files:**
- Modify: `src/models/applicant/index.ts`
- Modify: `src/models/applicant/schemas.ts`
- Modify: `src/models/applicant/resolve.ts`
- Modify: `src/models/applicant/format.ts`
- Modify: `src/models/applicant/constants.ts`
- Modify: `src/models/applicant/draft-snapshot.ts`
- Modify: `src/models/applicant/resolve.test.ts`

- [ ] **Step 1: Update `src/models/applicant/index.ts`**

Replace the entire file:

```ts
import type { Address } from "@/models/config"

export type { Address } from "@/models/config"

export type { ApplicantID } from "./id.js"
export { ApplicantID } from "./id.js"

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

export interface ApplicantPersonal {
  name: string
  email?: string
  phone?: string
  birthdate?: string
  gender?: string
  address?: Address
  hobbies: string[]
}

export interface ApplicantExperience {
  role: string
  company: string
  startDate: string
  endDate: string
  location?: string
  discloseDates?: boolean
  highlights?: string[]
}

export interface ApplicantEducation {
  institution: string
  course: string
  startDate?: string
  endDate?: string
  location?: string
  discloseDates?: boolean
  highlights?: string[]
}

export interface ApplicantSkill {
  name: string
}

export interface ApplicantLanguage {
  language: string
  level: string
}

export interface ApplicantCertification {
  name: string
  issuer?: string
  date?: string
  discloseDates?: boolean
  description?: string
}

export interface ApplicantDisclose {
  birthdate: boolean
  gender: boolean
  address: boolean
  hobbies: boolean
}

export interface ApplicantInfo {
  id: ApplicantID
  displayName: string
}

export type ResumeTemplate =
  | "resume_classic"
  | "resume_modern"
  | "resume_elegant"
  | "resume_minimal"

export { formatApplicantSections } from "./format.js"
export { resolveApplicant } from "./resolve.js"
export { DEFAULT_APPLICANT, RESUME_TEMPLATES } from "./constants.js"
export {
  createDefaultApplicantDraftSnapshot,
  isMeaningfulApplicantDraftSnapshot,
} from "./draft-snapshot.js"

export { ApplicantSchema, ApplicantInfoSchema } from "./schemas.js"
```

- [ ] **Step 2: Update `src/models/applicant/schemas.ts`**

Replace `ApplicantSchema` and `ApplicantInfoSchema`:

```ts
export const ApplicantSchema = z.object({
  personal: ApplicantPersonalSchema,
  disclose: ApplicantDiscloseSchema,
  experience: z.array(ApplicantExperienceSchema),
  education: z.array(ApplicantEducationSchema),
  skills: z.array(ApplicantSkillSchema),
  languages: z.array(ApplicantLanguageSchema),
  certifications: z.array(ApplicantCertificationSchema),
  personalNotes: z.string(),
})

export const ApplicantInfoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
})
```

- [ ] **Step 3: Update `src/models/applicant/resolve.ts`**

Replace the file:

```ts
import type { Applicant, ApplicantPersonal } from "@/models/applicant"
import { DEFAULT_APPLICANT } from "@/models/applicant/constants.js"

export function resolveApplicant(data: ApplicantInput): Applicant {
  return {
    personal: resolveApplicantPersonal(data.personal),
    disclose: { ...DEFAULT_APPLICANT.disclose, ...data.disclose },
    experience: data.experience ?? [],
    education: data.education ?? [],
    skills: data.skills ?? [],
    languages: data.languages ?? [],
    certifications: data.certifications ?? [],
    personalNotes: data.personalNotes ?? "",
  }
}

interface ApplicantInput extends Omit<Partial<Applicant>, "personal"> {
  personal?: Partial<ApplicantPersonal>
}

function resolveApplicantPersonal(
  personal?: Partial<ApplicantPersonal>,
): ApplicantPersonal {
  return {
    ...DEFAULT_APPLICANT.personal,
    ...personal,
    hobbies: personal?.hobbies ?? [],
  }
}
```

- [ ] **Step 4: Update `src/models/applicant/format.ts`**

Replace `formatPersonalNotes`:

```ts
function formatPersonalNotes(notes: string): string | undefined {
  const lines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return undefined
  return `## Personal Notes\n${lines.map((line) => `- ${line}`).join("\n")}`
}
```

And update the call site in `formatApplicantSections`:

```ts
  const notes = formatPersonalNotes(applicant.personalNotes)
```

- [ ] **Step 5: Update `src/models/applicant/constants.ts`**

Replace the file:

```ts
import type { Applicant } from "."

export const RESUME_TEMPLATES = [
  "resume_classic",
  "resume_modern",
  "resume_elegant",
  "resume_minimal",
] as const

export const DEFAULT_APPLICANT: Applicant = {
  personal: { name: "", hobbies: [] },
  disclose: { birthdate: false, gender: false, address: false, hobbies: false },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
  personalNotes: "",
}
```

- [ ] **Step 6: Update `src/models/applicant/draft-snapshot.ts`**

Replace the file:

```ts
import { DEFAULT_APPLICANT } from "@/models/applicant/constants.js"

import type { Applicant } from "@/models/applicant"

import { resolveApplicant } from "@/models/applicant/resolve.js"

export function createDefaultApplicantDraftSnapshot(): Applicant {
  return resolveApplicant(DEFAULT_APPLICANT)
}

export function isMeaningfulApplicantDraftSnapshot(
  snapshot: Applicant,
): boolean {
  const resolved = resolveApplicant(snapshot)
  const checks = [
    hasMeaningfulPersonal(resolved),
    hasMeaningfulExperience(resolved.experience),
    hasMeaningfulEducation(resolved.education),
    hasMeaningfulSkills(resolved.skills),
    hasMeaningfulLanguages(resolved.languages),
    hasMeaningfulCertifications(resolved.certifications),
    hasMeaningfulNotes(resolved.personalNotes),
  ]
  return checks.some(Boolean)
}

function hasMeaningfulPersonal(applicant: Applicant): boolean {
  const { personal, disclose } = applicant
  const checks = [
    hasText(personal.name),
    hasText(personal.email),
    hasText(personal.phone),
    hasText(personal.birthdate),
    hasText(personal.gender),
    hasMeaningfulAddress(personal.address),
    personal.hobbies.some((hobby) => hasText(hobby)),
    disclose.birthdate,
    disclose.gender,
    disclose.address,
    disclose.hobbies,
  ]
  return checks.some(Boolean)
}

function hasMeaningfulAddress(address?: Address): boolean {
  if (!address) return false
  return [address.street, address.zip, address.city].some(
    (value) => value.trim().length > 0,
  )
}

function hasMeaningfulExperience(experience: ApplicantExperience[]): boolean {
  return experience.some((entry) =>
    hasMeaningfulTimelineEntry({
      primary: entry.role,
      secondary: entry.company,
      startDate: entry.startDate,
      endDate: entry.endDate,
      location: entry.location,
      discloseDates: entry.discloseDates,
      highlights: entry.highlights,
    }),
  )
}

function hasMeaningfulEducation(education: ApplicantEducation[]): boolean {
  return education.some((entry) =>
    hasMeaningfulTimelineEntry({
      primary: entry.institution,
      secondary: entry.course,
      startDate: entry.startDate,
      endDate: entry.endDate,
      location: entry.location,
      discloseDates: entry.discloseDates,
      highlights: entry.highlights,
    }),
  )
}

function hasMeaningfulSkills(skills: Applicant["skills"]): boolean {
  return skills.some(({ name }) => hasText(name))
}

function hasMeaningfulLanguages(languages: Applicant["languages"]): boolean {
  return languages.some(
    ({ language, level }) => hasText(language) || hasText(level),
  )
}

function hasMeaningfulCertifications(
  certifications: Applicant["certifications"],
): boolean {
  return certifications.some(({ name, issuer, date, description }) =>
    [name, issuer, date, description].some((value) => hasText(value)),
  )
}

function hasMeaningfulNotes(notes: string): boolean {
  return hasText(notes)
}

function hasMeaningfulTimelineEntry({
  primary,
  secondary,
  startDate,
  endDate,
  location,
  discloseDates,
  highlights,
}: MeaningfulTimelineEntry): boolean {
  const checks = [
    hasText(primary),
    hasText(secondary),
    hasText(startDate),
    hasText(endDate),
    hasText(location),
    discloseDates === true,
    highlights?.some((highlight) => hasText(highlight)) === true,
  ]
  return checks.some(Boolean)
}

function hasText(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0
}

interface MeaningfulTimelineEntry {
  primary: string
  secondary: string
  startDate?: string
  endDate?: string
  location?: string
  discloseDates?: boolean
  highlights?: string[]
}

type Address = import("@/models/config").Address
type ApplicantEducation = import("@/models/applicant").ApplicantEducation
type ApplicantExperience = import("@/models/applicant").ApplicantExperience
```

- [ ] **Step 7: Update `src/models/applicant/resolve.test.ts`**

Replace the file:

```ts
import { describe, expect, it } from "vitest"
import { resolveApplicant } from "."

describe("resolveApplicant", () => {
  it("fills missing collections and disclose flags", () => {
    expect(resolveApplicant({ personal: { name: "Ada" } })).toEqual({
      personal: { name: "Ada", hobbies: [] },
      disclose: {
        birthdate: false,
        gender: false,
        address: false,
        hobbies: false,
      },
      experience: [],
      education: [],
      skills: [],
      languages: [],
      certifications: [],
      personalNotes: "",
    })
  })
})
```

- [ ] **Step 8: Commit**

```bash
git add src/models/applicant/
git commit -m "refactor: remove id from Applicant, personalNotes string"
```

---

## Task 3: Update JobSearch Domain Model

**Files:**
- Modify: `src/models/job-search/index.ts`
- Modify: `src/models/job-search/schemas.ts`
- Modify: `src/models/job-search/resolve.ts`
- Modify: `src/models/job-search/constants.ts`
- Modify: `src/models/job-search/editor-snapshot.ts`
- Modify: `src/models/job-search/resolve.test.ts`

- [ ] **Step 1: Update `src/models/job-search/index.ts`**

Replace the entire file:

```ts
export type { JobSearchID, SearchSource } from "./id.js"
export { JobSearchID, SearchSource } from "./id.js"

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

export interface JobSearchInfo {
  id: JobSearchID
  displayName: string
}

export interface ConsultationSuggestion {
  searchTerm: string
  searchMode: SearchMode
  reason: string
}

export type SearchMode = "employment" | "entry-level" | "apprenticeship"

export { SEARCH_MODE_LABELS } from "./constants.js"
export { DEFAULT_JOB_SEARCH } from "./constants.js"
export { resolveJobSearch } from "./resolve.js"
export {
  createDefaultJobSearchEditorSnapshot,
  isMeaningfulJobSearchEditorSnapshot,
  resolveDraftJobSearch,
} from "./editor-snapshot.js"

export { JobSearchSchema, JobSearchInfoSchema } from "./schemas.js"
```

- [ ] **Step 2: Update `src/models/job-search/schemas.ts`**

Replace the entire file:

```ts
import { z } from "zod"

export const JobSearchSchema = z.object({
  searchTerm: z.string(),
  radiusKm: z.number(),
  mode: z.enum(["employment", "entry-level", "apprenticeship"]),
  sources: z.array(z.object({ value: z.string() })),
  maxResultsPerSource: z.number(),
  maxCommuteMinutes: z.number(),
  notes: z.string(),
  coverLetter: z.string(),
})

export const JobSearchInfoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
})
```

- [ ] **Step 3: Update `src/models/job-search/resolve.ts`**

Replace the file:

```ts
import type { JobSearch } from "@/models/job-search"
import { DEFAULT_JOB_SEARCH } from "@/models/job-search/constants.js"

export function resolveJobSearch(data: Partial<JobSearch>): JobSearch {
  return {
    searchTerm: data.searchTerm ?? DEFAULT_JOB_SEARCH.searchTerm,
    radiusKm: data.radiusKm ?? DEFAULT_JOB_SEARCH.radiusKm,
    mode: data.mode ?? DEFAULT_JOB_SEARCH.mode,
    sources: data.sources ?? [],
    maxResultsPerSource:
      data.maxResultsPerSource ?? DEFAULT_JOB_SEARCH.maxResultsPerSource,
    maxCommuteMinutes:
      data.maxCommuteMinutes ?? DEFAULT_JOB_SEARCH.maxCommuteMinutes,
    notes: data.notes ?? DEFAULT_JOB_SEARCH.notes,
    coverLetter: data.coverLetter ?? DEFAULT_JOB_SEARCH.coverLetter,
  }
}
```

- [ ] **Step 4: Update `src/models/job-search/constants.ts`**

Replace the file:

```ts
import type { SearchMode, JobSearch } from "."

export const SEARCH_MODES = [
  "employment",
  "entry-level",
  "apprenticeship",
] as const

export const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  employment: "Festanstellung",
  "entry-level": "Berufseinsteiger",
  apprenticeship: "Ausbildung",
}

export const DEFAULT_JOB_SEARCH: JobSearch = {
  searchTerm: "",
  radiusKm: 30,
  mode: "employment",
  sources: [],
  maxResultsPerSource: 0,
  maxCommuteMinutes: 0,
  notes: "",
  coverLetter: "",
}
```

- [ ] **Step 5: Update `src/models/job-search/editor-snapshot.ts`**

Replace the file:

```ts
import { DEFAULT_JOB_SEARCH } from "@/models/job-search/constants.js"
import type { JobSearch } from "@/models/job-search"

export function createDefaultJobSearchEditorSnapshot(): JobSearch {
  return { ...DEFAULT_JOB_SEARCH }
}

export function resolveDraftJobSearch(jobSearch: JobSearch): JobSearch {
  return {
    ...jobSearch,
    searchTerm: resolveDraftSearchTerm(jobSearch.searchTerm),
  }
}

export function isMeaningfulJobSearchEditorSnapshot(
  jobSearch: JobSearch,
): boolean {
  const checks = [
    jobSearch.searchTerm.trim().length > 0,
    jobSearch.radiusKm !== DEFAULT_JOB_SEARCH.radiusKm,
    jobSearch.mode !== DEFAULT_JOB_SEARCH.mode,
    jobSearch.sources.length > 0,
    jobSearch.maxResultsPerSource !== DEFAULT_JOB_SEARCH.maxResultsPerSource,
    jobSearch.maxCommuteMinutes !== DEFAULT_JOB_SEARCH.maxCommuteMinutes,
    jobSearch.notes.trim().length > 0,
    jobSearch.coverLetter.trim().length > 0,
  ]
  return checks.some(Boolean)
}

function resolveDraftSearchTerm(searchTerm: string): string {
  const normalized = searchTerm.trim()
  return normalized.length > 0 ? normalized : "Neue Suche"
}
```

- [ ] **Step 6: Update `src/models/job-search/resolve.test.ts`**

Replace the file:

```ts
import { describe, expect, it } from "vitest"
import { resolveJobSearch } from "."

describe("resolveJobSearch", () => {
  it("fills missing fields with defaults", () => {
    expect(
      resolveJobSearch({ searchTerm: "React" }),
    ).toEqual({
      searchTerm: "React",
      radiusKm: 30,
      mode: "employment",
      sources: [],
      maxResultsPerSource: 0,
      maxCommuteMinutes: 0,
      notes: "",
      coverLetter: "",
    })
  })
})
```

- [ ] **Step 7: Commit**

```bash
git add src/models/job-search/
git commit -m "refactor: flatten JobSearch, remove id/applicantId, add coverLetter"
```

---

## Task 4: Update Repository Interfaces

**Files:**
- Modify: `src/repositories/applicant/types.ts`
- Modify: `src/repositories/job-search/types.ts`
- Modify: `src/repositories/vacancy/types.ts`

- [ ] **Step 1: Update `src/repositories/applicant/types.ts`**

Replace the file:

```ts
import type { Applicant, ApplicantID, ApplicantInfo } from "@/models/applicant"

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

- [ ] **Step 2: Update `src/repositories/job-search/types.ts`**

Replace the file:

```ts
import type {
  JobSearch,
  JobSearchID,
  JobSearchInfo,
  ApplicantID,
  SearchMode,
} from "@/models/job-search"

export interface JobSearchRepository {
  listByApplicant(applicantId: ApplicantID): JobSearchInfo[]
  load(id: JobSearchID): { jobSearch: JobSearch; applicantId: ApplicantID }
  save(id: JobSearchID, jobSearch: JobSearch): void
  delete(id: JobSearchID): void
  create(searchTerm: string, applicantId: ApplicantID, searchMode?: SearchMode): JobSearchID
  loadDraft(applicantId: ApplicantID): JobSearch | undefined
  saveDraft(applicantId: ApplicantID, draft: JobSearch): void
  deleteDraft(applicantId: ApplicantID): void
  finalizeDraft(applicantId: ApplicantID): JobSearchID
}
```

- [ ] **Step 3: Update `src/repositories/vacancy/types.ts`**

Replace the file:

```ts
import { Vacancy } from "@/models/vacancy/index.js"
import type { JobSearchID } from "@/models/job-search"

import type { Activity } from "@/models/vacancy"

export interface VacancyRepository {
  loadAll(jobSearchId: JobSearchID): VacancyListOutput
  save(jobSearchId: JobSearchID, vacancies: Vacancy[], latestCrawl: string): void
  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined
  addActivity(jobSearchId: JobSearchID, hash: string, activity: Activity): void
  loadCoverLetter(jobSearchId: JobSearchID, vacancyHash: string): string
  saveCoverLetter(jobSearchId: JobSearchID, vacancyHash: string, content: string): void
}

export interface VacancyListOutput {
  generatedAt: string
  latestCrawl: string
  vacancies: Vacancy[]
}
```

- [ ] **Step 4: Commit**

```bash
git add src/repositories/applicant/types.ts src/repositories/job-search/types.ts src/repositories/vacancy/types.ts
git commit -m "refactor: redesign repository interfaces with ID wrappers"
```

---

## Task 5: Update Applicant Repository Implementations

**Files:**
- Modify: `src/repositories/applicant/stub/index.ts`
- Modify: `src/repositories/applicant/sqlite/index.ts`
- Create: `src/repositories/sqlite-migrate.ts`
- Modify: `src/app/composition/create-service-context.ts`
- Test: `src/repositories/applicant/applicant.test.ts`

- [ ] **Step 1: Create `src/repositories/sqlite-migrate.ts`**

```ts
import { Database } from "@/utils/index.js"

export function migrateSqliteDatabase(database: Database): void {
  const version = getUserVersion(database)
  if (version >= 1) return

  database.transaction(() => {
    database.exec(`DROP TABLE IF EXISTS applicant_draft`)
    database.exec(`DROP TABLE IF EXISTS job_search_drafts`)
    database.exec(
      `ALTER TABLE job_searches ADD COLUMN cover_letter TEXT NOT NULL DEFAULT ''`,
    )
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

function migrateApplicantData(database: Database): void {
  const rows = database
    .prepare("SELECT id, data FROM applicants")
    .all() as Array<{ id: string; data: string }>
  const update = database.prepare("UPDATE applicants SET data = ? WHERE id = ?")
  for (const row of rows) {
    const parsed = JSON.parse(row.data)
    delete parsed.id
    update.run(JSON.stringify(parsed), row.id)
  }
}

function migrateJobSearchData(database: Database): void {
  const rows = database
    .prepare("SELECT id, data FROM job_searches")
    .all() as Array<{ id: string; data: string }>
  const update = database.prepare(
    "UPDATE job_searches SET data = ? WHERE id = ?",
  )
  for (const row of rows) {
    const parsed = JSON.parse(row.data)
    delete parsed.id
    delete parsed.applicantId
    parsed.coverLetter = parsed.coverLetter ?? ""
    update.run(JSON.stringify(parsed), row.id)
  }
}

function getUserVersion(database: Database): number {
  const row = database.prepare("PRAGMA user_version").get() as
    | { user_version: number }
    | undefined
  return row?.user_version ?? 0
}
```

- [ ] **Step 2: Update `src/app/composition/create-service-context.ts`**

Add the migration call:

```ts
import { migrateSqliteDatabase } from "@/repositories/sqlite-migrate.js"

export function createSqliteServiceContext(
  database: Database,
  secretsRepo: SecretsRepository,
  configRepo: ConfigRepository,
  setupRepo: SetupRepository,
): ServiceContext {
  migrateSqliteDatabase(database)
  return {
    applicantRepo: createSqliteApplicantRepository(database),
    jobSearchRepo: createSqliteJobSearchRepository(database),
    secretsRepo,
    configRepo,
    setupRepo,
    vacancyRepo: createSqliteVacancyRepository(database),
  }
}
```

- [ ] **Step 3: Update `src/repositories/applicant/stub/index.ts`**

Replace the file:

```ts
import {
  type Applicant,
  type ApplicantID,
  type ApplicantInfo,
  type ApplicantPersonal,
  ApplicantID as makeApplicantID,
} from "@/models/applicant"
import {
  DEFAULT_APPLICANT,
  isMeaningfulApplicantDraftSnapshot,
  resolveApplicant,
} from "@/models/applicant/index.js"
import type { ApplicantRepository } from "../types.js"

const DRAFT_SENTINEL = "$draft"

export function createStubApplicantRepository(
  initial?: Record<string, Applicant>,
): ApplicantRepository {
  return new StubApplicantRepository(initial)
}

class StubApplicantRepository implements ApplicantRepository {
  constructor(initial?: Record<string, Applicant>) {
    this.store = new Map(initial ? Object.entries(initial) : [])
    this.nextId = this.store.size
  }

  list(): ApplicantInfo[] {
    return [...this.store.entries()]
      .filter(([id]) => id !== DRAFT_SENTINEL)
      .map(([id, data]) => ({
        id: makeApplicantID(id),
        displayName: data.personal.name,
      }))
  }

  load(id: ApplicantID): Applicant {
    return resolveApplicant(structuredClone(this.getOrThrow(id)))
  }

  save(id: ApplicantID, data: Applicant): void {
    this.getOrThrow(id)
    this.store.set(id.value, resolveApplicant(structuredClone(data)))
  }

  delete(id: ApplicantID): void {
    this.store.delete(id.value)
  }

  loadDraft(): Applicant | undefined {
    const draft = this.store.get(DRAFT_SENTINEL)
    if (!draft) return undefined
    const resolved = resolveApplicant(structuredClone(draft))
    return isMeaningfulApplicantDraftSnapshot(resolved) ? resolved : undefined
  }

  saveDraft(draft: Applicant): void {
    this.store.set(DRAFT_SENTINEL, resolveApplicant(structuredClone(draft)))
  }

  finalizeDraft(): ApplicantID {
    const draft = this.loadDraft()
    if (!draft) throw new Error("Applicant draft not found")
    const id = makeApplicantID(String(++this.nextId))
    this.store.set(id.value, resolveApplicant(structuredClone(draft)))
    this.deleteDraft()
    return id
  }

  deleteDraft(): void {
    this.store.delete(DRAFT_SENTINEL)
  }

  private getOrThrow(id: ApplicantID): Applicant {
    const data = this.store.get(id.value)
    if (!data) throw new Error(`Applicant "${id.value}" not found`)
    return data
  }

  private readonly store: Map<string, Applicant>
  private nextId: number
}
```

- [ ] **Step 4: Update `src/repositories/applicant/sqlite/index.ts`**

Replace the file:

```ts
import {
  type Applicant,
  type ApplicantID,
  type ApplicantInfo,
  type ApplicantPersonal,
  ApplicantID as makeApplicantID,
} from "@/models/applicant"
import {
  DEFAULT_APPLICANT,
  isMeaningfulApplicantDraftSnapshot,
  resolveApplicant,
} from "@/models/applicant/index.js"
import type { ApplicantRepository } from "../types.js"
import { Database, type Statement } from "@/utils/index.js"
import { z } from "zod"
import { ApplicantSchema } from "@/models/applicant"

const DRAFT_SENTINEL = "$draft"

export function createSqliteApplicantRepository(
  database: Database,
): ApplicantRepository {
  database.exec(`
    CREATE TABLE IF NOT EXISTS applicants (
      id TEXT PRIMARY KEY,
      name TEXT,
      data TEXT NOT NULL
    )
  `)
  const repo = new SqliteApplicantRepository(database)
  repo.seedNextId()
  return repo
}

class SqliteApplicantRepository implements ApplicantRepository {
  constructor(database: Database) {
    this.database = database
    this.listStmt = database.prepare("SELECT id, name FROM applicants")
    this.loadStmt = database.prepare("SELECT data FROM applicants WHERE id = ?")
    this.updateStmt = database.prepare(
      "UPDATE applicants SET name = ?, data = ? WHERE id = ?",
    )
    this.insertStmt = database.prepare(
      "INSERT INTO applicants (id, name, data) VALUES (?, ?, ?)",
    )
    this.deleteStmt = database.prepare("DELETE FROM applicants WHERE id = ?")
  }

  seedNextId(): void {
    const result = this.database.prepare(
      "SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) AS max FROM applicants WHERE id GLOB '[0-9]*'",
    ).get() as { max: number } | undefined
    this.nextId = Number(result?.max ?? 0)
  }

  list(): ApplicantInfo[] {
    return this.listStmt
      .all()
      .map((row) => parseApplicantRow(row))
      .filter((info) => info.id.value !== DRAFT_SENTINEL)
  }

  load(id: ApplicantID): Applicant {
    const applicant = this.loadStmt.getJsonData(id.value)
    if (applicant === undefined)
      throw new Error(`Applicant "${id.value}" not found`)
    return resolveApplicant(ApplicantSchema.parse(applicant))
  }

  save(id: ApplicantID, data: Applicant): void {
    const resolved = resolveApplicant(data)
    const result = this.updateStmt.run(
      resolved.personal.name,
      JSON.stringify(resolved),
      id.value,
    )
    if (result.changes === 0)
      throw new Error(`Applicant "${id.value}" not found`)
  }

  delete(id: ApplicantID): void {
    this.deleteStmt.run(id.value)
  }

  saveDraft(draft: Applicant): void {
    const snapshot = resolveApplicant(draft)
    this.insertStmt.run(DRAFT_SENTINEL, snapshot.personal.name, JSON.stringify(snapshot))
  }

  finalizeDraft(): ApplicantID {
    return this.database.transaction(() => {
      const draft = this.loadDraft()
      if (!draft) throw new Error("Applicant draft not found")
      const id = this.generateId()
      const resolved = resolveApplicant(structuredClone(draft))
      this.insertStmt.run(id.value, resolved.personal.name, JSON.stringify(resolved))
      this.delete(DRAFT_SENTINEL_ID)
      return id
    })
  }

  loadDraft(): Applicant | undefined {
    const applicant = this.loadStmt.getJsonData(DRAFT_SENTINEL)
    if (applicant === undefined) return undefined
    const parsed = resolveApplicant(ApplicantSchema.parse(applicant))
    return isMeaningfulApplicantDraftSnapshot(parsed) ? parsed : undefined
  }

  deleteDraft(): void {
    this.deleteStmt.run(DRAFT_SENTINEL)
  }

  private generateId(): ApplicantID {
    return makeApplicantID(String(++this.nextId))
  }

  private readonly database: Database
  private readonly listStmt: Statement
  private readonly loadStmt: Statement
  private readonly updateStmt: Statement
  private readonly insertStmt: Statement
  private readonly deleteStmt: Statement
  private nextId: number
}

const DRAFT_SENTINEL_ID = makeApplicantID(DRAFT_SENTINEL)

function parseApplicantRow(raw: unknown): ApplicantInfo {
  const row = z
    .object({ id: z.string(), name: z.string().nullable() })
    .parse(raw)
  return { id: makeApplicantID(row.id), displayName: row.name || "" }
}
```

- [ ] **Step 5: Update `src/repositories/applicant/applicant.test.ts`**

Replace the file:

```ts
import { test, describe, expect } from "vitest"
import type { ApplicantRepository } from "."
import { createStubApplicantRepository } from "./stub"
import { createSqliteApplicantRepository } from "./sqlite"
import { createDefaultApplicantDraftSnapshot } from "@/models/applicant"
import type { Applicant } from "@/models/applicant"
import { ApplicantID } from "@/models/applicant"
import { Database, setupTemporaryDatabaseDirectory } from "@/utils/index.js"

applicantRepositoryTests("StubApplicantRepository", () => ({
  repo: createStubApplicantRepository(),
  teardown: () => {},
}))

// --- SqliteApplicantRepository ---

const { nextId, pathForId } = setupTemporaryDatabaseDirectory("applicant-test")

applicantRepositoryTests("SqliteApplicantRepository", () =>
  openDatabaseById(nextId()),
)

// --- Persistence ---

test("saved applicant survives new repository instance", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const applicantId = ApplicantID("1")
  const sample = makeSampleApplicant()
  repo1.save(applicantId, sample)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(repo2.load(applicantId)).toEqual(sample)
  t2()
})

test("list works across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const id1 = ApplicantID("1")
  const id2 = ApplicantID("2")
  repo1.save(id1, makeSampleApplicant("Alice"))
  repo1.save(id2, makeSampleApplicant("Bob"))
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  const names = repo2.list().map((a) => a.displayName)
  expect(names.toSorted()).toEqual(["Alice", "Bob"])
  t2()
})

test("delete persists across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const applicantId = ApplicantID("1")
  const sample = makeSampleApplicant()
  repo1.save(applicantId, sample)
  repo1.delete(applicantId)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(() => repo2.load(applicantId)).toThrow()
  t2()
})

function applicantRepositoryTests(
  name: string,
  createRepo: () => { repo: ApplicantRepository; teardown: () => void },
) {
  describe(name, () => {
    test("returns empty list initially", () => {
      const { repo, teardown } = createRepo()
      expect(repo.list()).toEqual([])
      teardown()
    })

    test("save + load round-trips", () => {
      const { repo, teardown } = createRepo()
      const id = ApplicantID("1")
      const sample = makeSampleApplicant()
      repo.save(id, sample)
      const loaded = repo.load(id)
      expect(loaded).toEqual(sample)
      teardown()
    })

    test("save throws for non-existent applicant", () => {
      const { repo, teardown } = createRepo()
      expect(() => repo.save(ApplicantID("nope"), makeSampleApplicant())).toThrow()
      teardown()
    })

    test("delete removes applicant", () => {
      const { repo, teardown } = createRepo()
      const id = ApplicantID("1")
      repo.save(id, makeSampleApplicant())
      repo.delete(id)
      expect(() => repo.load(id)).toThrow()
      teardown()
    })

    test("save/load draft round-trips and remains globally unique", () => {
      const { repo, teardown } = createRepo()
      const first = createDefaultApplicantDraftSnapshot()
      first.personal.name = "First"
      const second = createDefaultApplicantDraftSnapshot()
      second.personal.name = "Second"

      repo.saveDraft(first)
      repo.saveDraft(second)

      expect(repo.loadDraft()?.personal.name).toBe("Second")
      teardown()
    })

    test("blank draft is not meaningful", () => {
      const { repo, teardown } = createRepo()
      repo.saveDraft(createDefaultApplicantDraftSnapshot())
      expect(repo.loadDraft()).toBeUndefined()
      teardown()
    })

    test("edited draft is meaningful", () => {
      const { repo, teardown } = createRepo()
      const draft = createDefaultApplicantDraftSnapshot()
      draft.personal.name = "Ada Lovelace"

      repo.saveDraft(draft)

      expect(repo.loadDraft()?.personal.name).toBe("Ada Lovelace")
      teardown()
    })

    test("deleteDraft removes saved draft", () => {
      const { repo, teardown } = createRepo()
      repo.saveDraft(createDefaultApplicantDraftSnapshot())
      repo.deleteDraft()
      expect(repo.loadDraft()).toBeUndefined()
      teardown()
    })

    test("finalizeDraft creates persisted applicant and deletes draft", () => {
      const { repo, teardown } = createRepo()
      const draft = createDefaultApplicantDraftSnapshot()
      draft.personal.name = "Ada Lovelace"
      draft.personal.email = "ada@example.com"

      repo.saveDraft(draft)

      const id = repo.finalizeDraft()

      expect(repo.load(id).personal.name).toBe("Ada Lovelace")
      expect(repo.load(id).personal.email).toBe("ada@example.com")
      expect(repo.loadDraft()).toBeUndefined()
      teardown()
    })
  })
}

function makeSampleApplicant(name = "John Doe"): Applicant {
  return {
    disclose: {
      birthdate: false,
      gender: false,
      address: false,
      hobbies: false,
    },
    personal: {
      name,
      email: "john@example.com",
      phone: "+49 123 456",
      address: { street: "Main St 1", zip: "10115", city: "Berlin" },
      hobbies: ["cycling"],
    },
    experience: [
      {
        role: "Developer",
        company: "ACME",
        startDate: "2020-01",
        endDate: "2024-06",
        location: "Berlin",
        highlights: ["Built stuff"],
      },
    ],
    education: [
      {
        institution: "TU Berlin",
        course: "Computer Science",
        startDate: "2016-10",
        endDate: "2020-03",
      },
    ],
    skills: [{ name: "TypeScript" }],
    languages: [{ language: "German", level: "C2" }],
    certifications: [{ name: "AWS", issuer: "Amazon", date: "2023-01" }],
    personalNotes: "Prefers remote work",
  }
}

function openDatabaseById(id: string) {
  const database = Database.open(pathForId(id))
  return {
    repo: createSqliteApplicantRepository(database),
    teardown: () => database.close(),
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/repositories/applicant/ src/repositories/sqlite-migrate.ts src/app/composition/create-service-context.ts
git commit -m "refactor: applicant repos with sentinel draft and sequential IDs"
```

---

## Task 6: Update JobSearch Repository Implementations

**Files:**
- Modify: `src/repositories/job-search/stub/index.ts`
- Modify: `src/repositories/job-search/sqlite/index.ts`
- Test: `src/repositories/job-search/job-search.test.ts`

- [ ] **Step 1: Update `src/repositories/job-search/stub/index.ts`**

Replace the file:

```ts
import {
  isMeaningfulJobSearchEditorSnapshot,
  resolveDraftJobSearch,
  DEFAULT_JOB_SEARCH,
} from "@/models/job-search/index.js"
import type {
  JobSearch,
  JobSearchID,
  JobSearchInfo,
  ApplicantID,
  SearchMode,
} from "@/models/job-search"
import { JobSearchID as makeJobSearchID, SearchSource } from "@/models/job-search/index.js"
import { resolveJobSearch } from "@/models/job-search/index.js"
import type { JobSearchRepository } from "../types.js"

function draftSentinel(applicantId: ApplicantID): string {
  return `$draft_${applicantId.value}`
}

export function createStubJobSearchRepository(
  initial?: Record<string, { jobSearch: JobSearch; applicantId: string }>,
): JobSearchRepository {
  return new StubJobSearchRepository(initial)
}

class StubJobSearchRepository implements JobSearchRepository {
  constructor(
    initial?: Record<string, { jobSearch: JobSearch; applicantId: string }>,
  ) {
    this.store = new Map(
      initial
        ? Object.entries(initial).map(([id, data]) => [
            id,
            {
              jobSearch: data.jobSearch,
              applicantId: data.applicantId,
            },
          ])
        : [],
    )
    this.drafts = new Map()
    this.nextId = this.store.size
  }

  listByApplicant(applicantId: ApplicantID): JobSearchInfo[] {
    const prefix = `$draft_${applicantId.value}`
    return [...this.store.entries()]
      .filter(([id, data]) => id !== prefix && data.applicantId === applicantId.value)
      .map(([id, data]) => ({
        id: makeJobSearchID(id),
        displayName: data.jobSearch.searchTerm,
      }))
  }

  load(id: JobSearchID): { jobSearch: JobSearch; applicantId: ApplicantID } {
    const entry = this.getOrThrow(id)
    return {
      jobSearch: resolveJobSearch(structuredClone(entry.jobSearch)),
      applicantId: { value: entry.applicantId },
    }
  }

  save(id: JobSearchID, data: JobSearch): void {
    const entry = this.getOrThrow(id)
    entry.jobSearch = resolveJobSearch(structuredClone(data))
  }

  create(searchTerm: string, applicantId: ApplicantID, searchMode?: SearchMode): JobSearchID {
    const id = makeJobSearchID(String(++this.nextId))
    const jobSearch = resolveJobSearch({
      searchTerm,
      mode: searchMode ?? "employment",
    })
    this.store.set(id.value, { jobSearch, applicantId: applicantId.value })
    return id
  }

  delete(id: JobSearchID): void {
    this.store.delete(id.value)
  }

  loadDraft(applicantId: ApplicantID): JobSearch | undefined {
    const snapshot = this.drafts.get(applicantId.value)
    if (!snapshot) return undefined
    const resolved = resolveJobSearch(structuredClone(snapshot))
    return isMeaningfulJobSearchEditorSnapshot(resolved) ? resolved : undefined
  }

  saveDraft(applicantId: ApplicantID, draft: JobSearch): void {
    this.drafts.set(applicantId.value, resolveJobSearch(structuredClone(draft)))
  }

  finalizeDraft(applicantId: ApplicantID): JobSearchID {
    const draft = this.drafts.get(applicantId.value)
    if (!draft)
      throw new Error(`Draft for applicant "${applicantId.value}" not found`)
    const resolved = resolveDraftJobSearch(structuredClone(draft))
    const id = makeJobSearchID(String(++this.nextId))
    this.store.set(id.value, {
      jobSearch: resolved,
      applicantId: applicantId.value,
    })
    this.deleteDraft(applicantId)
    return id
  }

  deleteDraft(applicantId: ApplicantID): void {
    this.drafts.delete(applicantId.value)
  }

  private getOrThrow(id: JobSearchID): StubData {
    const data = this.store.get(id.value)
    if (!data) throw new Error(`Job search "${id.value}" not found`)
    return data
  }

  private readonly store: Map<string, StubData>
  private readonly drafts: Map<string, JobSearch>
  private nextId: number
}

interface StubData {
  jobSearch: JobSearch
  applicantId: string
}
```

- [ ] **Step 2: Update `src/repositories/job-search/sqlite/index.ts`**

Replace the file:

```ts
import {
  DEFAULT_JOB_SEARCH,
  isMeaningfulJobSearchEditorSnapshot,
  resolveDraftJobSearch,
} from "@/models/job-search/index.js"

import type {
  JobSearch,
  JobSearchID,
  JobSearchInfo,
  ApplicantID,
  SearchMode,
} from "@/models/job-search"

import { JobSearchID as makeJobSearchID } from "@/models/job-search/index.js"
import { resolveJobSearch } from "@/models/job-search/index.js"

import type { JobSearchRepository } from "../types.js"

import { Database, type Statement } from "@/utils/index.js"

import { z } from "zod"
import { JobSearchSchema } from "@/models/job-search"

export function createSqliteJobSearchRepository(
  database: Database,
): JobSearchRepository {
  database.exec(`
    CREATE TABLE IF NOT EXISTS job_searches (
      id TEXT PRIMARY KEY,
      applicant_id TEXT NOT NULL,
      search_term TEXT NOT NULL DEFAULT '',
      cover_letter TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cover_letters (
      job_search_id TEXT NOT NULL REFERENCES job_searches(id) ON DELETE CASCADE,
      vacancy_hash TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      PRIMARY KEY (job_search_id, vacancy_hash)
    );

    CREATE INDEX IF NOT EXISTS idx_job_searches_applicant ON job_searches(applicant_id);
  `)
  const repo = new SqliteJobSearchRepository(database)
  repo.seedNextId()
  return repo
}

class SqliteJobSearchRepository implements JobSearchRepository {
  constructor(database: Database) {
    this.database = database
    this.listByApplicantStmt = database.prepare(
      "SELECT id, applicant_id, search_term FROM job_searches WHERE applicant_id = ?",
    )
    this.loadStmt = database.prepare(
      "SELECT applicant_id, data FROM job_searches WHERE id = ?",
    )
    this.updateStmt = database.prepare(
      "UPDATE job_searches SET applicant_id = ?, search_term = ?, cover_letter = ?, data = ? WHERE id = ?",
    )
    this.insertStmt = database.prepare(
      "INSERT INTO job_searches (id, applicant_id, search_term, cover_letter, data) VALUES (?, ?, ?, ?, ?)",
    )
    this.deleteStmt = database.prepare("DELETE FROM job_searches WHERE id = ?")
    this.loadDraftStmt = database.prepare(
      "SELECT data FROM job_searches WHERE id = ?",
    )
    this.saveDraftStmt = database.prepare(
      "INSERT OR REPLACE INTO job_searches (id, applicant_id, search_term, cover_letter, data) VALUES (?, ?, '', '', ?)",
    )
    this.deleteDraftStmt = database.prepare(
      "DELETE FROM job_searches WHERE id = ?",
    )
  }

  seedNextId(): void {
    const result = this.database.prepare(
      "SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) AS max FROM job_searches WHERE id GLOB '[0-9]*'",
    ).get() as { max: number } | undefined
    this.nextId = Number(result?.max ?? 0)
  }

  listByApplicant(applicantId: ApplicantID): JobSearchInfo[] {
    const prefix = `$draft_${applicantId.value}`
    return this.listByApplicantStmt
      .all(applicantId.value)
      .map((row) => parseJobSearchRow(row))
      .filter((info) => info.id.value !== prefix)
  }

  create(
    searchTerm: string,
    applicantId: ApplicantID,
    searchMode?: SearchMode,
  ): JobSearchID {
    const id = this.generateId()
    const data = resolveJobSearch({
      searchTerm,
      mode: searchMode ?? "employment",
    })
    this.insertStmt.run(
      id.value,
      applicantId.value,
      searchTerm,
      "",
      JSON.stringify(data),
    )
    return id
  }

  load(id: JobSearchID): { jobSearch: JobSearch; applicantId: ApplicantID } {
    const row = this.loadStmt.get(id.value)
    if (row === undefined) throw new Error(`Job search "${id.value}" not found`)
    const parsed = z
      .object({ applicant_id: z.string(), data: z.string() })
      .parse(row)
    const jobSearch = resolveJobSearch(JobSearchSchema.parse(JSON.parse(parsed.data)))
    return {
      jobSearch,
      applicantId: { value: parsed.applicant_id },
    }
  }

  save(id: JobSearchID, data: JobSearch): void {
    const resolved = resolveJobSearch(data)
    const result = this.updateStmt.run(
      this.loadApplicantId(id),
      resolved.searchTerm,
      resolved.coverLetter,
      JSON.stringify(resolved),
      id.value,
    )
    if (result.changes === 0)
      throw new Error(`Job search "${id.value}" not found`)
  }

  private loadApplicantId(id: JobSearchID): string {
    const row = this.loadStmt.get(id.value)
    if (row === undefined) throw new Error(`Job search "${id.value}" not found`)
    return z.object({ applicant_id: z.string() }).parse(row).applicant_id
  }

  delete(id: JobSearchID): void {
    this.deleteStmt.run(id.value)
  }

  saveDraft(applicantId: ApplicantID, draft: JobSearch): void {
    const resolved = resolveJobSearch(draft)
    const sentinel = draftSentinel(applicantId)
    this.saveDraftStmt.run(
      sentinel,
      applicantId.value,
      JSON.stringify(resolved),
    )
  }

  finalizeDraft(applicantId: ApplicantID): JobSearchID {
    return this.database.transaction(() => {
      const draft = this.loadDraft(applicantId)
      if (!draft)
        throw new Error(`Draft for applicant "${applicantId.value}" not found`)
      const resolved = resolveDraftJobSearch(structuredClone(draft))
      const id = this.generateId()
      this.insertStmt.run(
        id.value,
        applicantId.value,
        resolved.searchTerm,
        resolved.coverLetter,
        JSON.stringify(resolved),
      )
      this.deleteDraft(applicantId)
      return id
    })
  }

  loadDraft(applicantId: ApplicantID): JobSearch | undefined {
    const sentinel = draftSentinel(applicantId)
    const row = this.loadDraftStmt.getJsonData(sentinel)
    if (row === undefined) return undefined
    const parsed = resolveJobSearch(JobSearchSchema.parse(row))
    return isMeaningfulJobSearchEditorSnapshot(parsed) ? parsed : undefined
  }

  deleteDraft(applicantId: ApplicantID): void {
    this.deleteDraftStmt.run(draftSentinel(applicantId))
  }

  private generateId(): JobSearchID {
    return makeJobSearchID(String(++this.nextId))
  }

  private readonly database: Database
  private readonly listByApplicantStmt: Statement
  private readonly loadStmt: Statement
  private readonly updateStmt: Statement
  private readonly insertStmt: Statement
  private readonly deleteStmt: Statement
  private readonly loadDraftStmt: Statement
  private readonly saveDraftStmt: Statement
  private readonly deleteDraftStmt: Statement
  private nextId: number
}

function draftSentinel(applicantId: ApplicantID): string {
  return `$draft_${applicantId.value}`
}

function parseJobSearchRow(raw: unknown): JobSearchInfo {
  const r = z
    .object({
      id: z.string(),
      search_term: z.string(),
    })
    .parse(raw)
  return { id: makeJobSearchID(r.id), displayName: r.search_term }
}
```

- [ ] **Step 3: Update `src/repositories/job-search/job-search.test.ts`**

Replace the file:

```ts
import { test, describe, expect } from "vitest"
import type { JobSearchRepository } from "."
import { createStubJobSearchRepository } from "./stub"
import { createSqliteJobSearchRepository } from "./sqlite"
import { createDefaultJobSearchEditorSnapshot } from "@/models/job-search"
import type { JobSearch } from "@/models/job-search"
import { JobSearchID, ApplicantID } from "@/models/job-search"
import { Database, setupTemporaryDatabaseDirectory } from "@/utils/index.js"

jobSearchRepositoryTests("StubJobSearchRepository", () => ({
  repo: createStubJobSearchRepository(),
  teardown: () => {},
}))

// --- SqliteJobSearchRepository ---

const { nextId, pathForId } = setupTemporaryDatabaseDirectory("job-search-test")

jobSearchRepositoryTests("SqliteJobSearchRepository", () =>
  openDatabaseById(nextId()),
)

// --- Persistence ---

test("saved job search survives new repository instance", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const searchId = JobSearchID("1")
  const applicantId = ApplicantID("john")
  const sample = makeSampleJobSearch()
  repo1.create("Software Engineer", applicantId)
  repo1.save(searchId, sample)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(repo2.load(searchId).jobSearch).toEqual(sample)
  t2()
})

test("delete persists across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const searchId = JobSearchID("1")
  const applicantId = ApplicantID("john")
  repo1.create("Software Engineer", applicantId)
  const sample = makeSampleJobSearch()
  repo1.save(searchId, sample)
  repo1.delete(searchId)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(() => repo2.load(searchId)).toThrow()
  t2()
})

test("listByApplicant works across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const applicantJohn = ApplicantID("john")
  const applicantJane = ApplicantID("jane")
  const id1 = repo1.create("Search 1", applicantJohn)
  repo1.create("Search 2", applicantJane)
  const id3 = repo1.create("Search 3", applicantJohn)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  const johns = repo2.listByApplicant(applicantJohn)
  expect(johns.length).toBe(2)
  expect(johns.map((info) => info.id.value).toSorted()).toEqual(
    [id1.value, id3.value].toSorted(),
  )
  t2()
})

function jobSearchRepositoryTests(
  name: string,
  createRepo: () => { repo: JobSearchRepository; teardown: () => void },
) {
  describe(name, () => {
    test("returns empty list initially", () => {
      const { repo, teardown } = createRepo()
      expect(repo.listByApplicant(ApplicantID("any"))).toEqual([])
      teardown()
    })

    test("create returns id + load", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      const id = repo.create("Software Engineer", applicantId)
      expect(typeof id.value).toBe("string")
      expect(id.value.length > 0).toBeTruthy()
      expect(repo.load(id).jobSearch.searchTerm).toBe("Software Engineer")
      teardown()
    })

    test("save + load round-trips", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      const id = repo.create("Software Engineer", applicantId)
      const sample = makeSampleJobSearch()
      repo.save(id, sample)
      expect(repo.load(id).jobSearch).toEqual(sample)
      teardown()
    })

    test("delete removes job search", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      const id = repo.create("Software Engineer", applicantId)
      repo.delete(id)
      expect(() => repo.load(id)).toThrow()
      teardown()
    })

    test("save/load draft round-trips and remains unique per applicant", () => {
      const { repo, teardown } = createRepo()
      const first = {
        ...createDefaultJobSearchEditorSnapshot(),
        searchTerm: "First",
      }
      const second = {
        ...createDefaultJobSearchEditorSnapshot(),
        searchTerm: "Second",
      }
      const applicantId = ApplicantID("john")
      repo.saveDraft(applicantId, first)
      repo.saveDraft(applicantId, second)
      expect(repo.loadDraft(applicantId)?.searchTerm).toBe("Second")
      teardown()
    })

    test("blank draft is not meaningful", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      repo.saveDraft(applicantId, createDefaultJobSearchEditorSnapshot())
      expect(repo.loadDraft(applicantId)).toBeUndefined()
      teardown()
    })

    test("edited draft is meaningful", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      const draft = createDefaultJobSearchEditorSnapshot()
      draft.searchTerm = "React"
      repo.saveDraft(applicantId, draft)
      expect(repo.loadDraft(applicantId)?.searchTerm).toBe("React")
      teardown()
    })

    test("deleteDraft removes saved draft", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      repo.saveDraft(applicantId, createDefaultJobSearchEditorSnapshot())
      repo.deleteDraft(applicantId)
      expect(repo.loadDraft(applicantId)).toBeUndefined()
      teardown()
    })

    test("finalizeDraft creates persisted job search and deletes draft", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      const draft = createDefaultJobSearchEditorSnapshot()
      draft.searchTerm = "React Engineer"
      draft.coverLetter = "Template"
      repo.saveDraft(applicantId, draft)

      const id = repo.finalizeDraft(applicantId)

      expect(repo.load(id).jobSearch.searchTerm).toBe("React Engineer")
      expect(repo.load(id).jobSearch.coverLetter).toBe("Template")
      expect(repo.loadDraft(applicantId)).toBeUndefined()
      teardown()
    })
  })
}

function makeSampleJobSearch(): JobSearch {
  return {
    searchTerm: "Software Engineer",
    radiusKm: 50,
    mode: "employment",
    sources: [{ value: "indeed" }, { value: "xing" }],
    maxResultsPerSource: 100,
    maxCommuteMinutes: 45,
    notes: "Prefer startup culture",
    coverLetter: "",
  }
}

function openDatabaseById(id: string) {
  const database = Database.open(pathForId(id))
  return {
    repo: createSqliteJobSearchRepository(database),
    teardown: () => database.close(),
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/repositories/job-search/
git commit -m "refactor: job-search repos with sentinel draft, sequential IDs, flat model"
```

---

## Task 7: Update Vacancy Repository Implementations

**Files:**
- Modify: `src/repositories/vacancy/stub/index.ts`
- Modify: `src/repositories/vacancy/sqlite/index.ts`

- [ ] **Step 1: Update `src/repositories/vacancy/stub/index.ts`**

Replace the file:

```ts
import { Vacancy } from "@/models/vacancy/index.js"
import type { Activity } from "@/models/vacancy"
import type { JobSearchID } from "@/models/job-search"
import {
  EMPTY_VACANCY_LIST_OUTPUT,
  createVacancyListOutput,
} from "@/repositories/vacancy/output.js"
import type { VacancyListOutput, VacancyRepository } from "../types.js"

export function createStubVacancyRepository(
  initial?: Record<string, { vacancies: Vacancy[]; latestCrawl: string }>,
): VacancyRepository {
  return new StubVacancyRepository(initial)
}

class StubVacancyRepository implements VacancyRepository {
  constructor(
    initial?: Record<string, { vacancies: Vacancy[]; latestCrawl: string }>,
  ) {
    this.store = new Map(
      initial
        ? Object.entries(initial).map(([id, data]) => [
            id,
            {
              output: createVacancyListOutput(
                data.vacancies.map((v) => new Vacancy(structuredClone(v))),
                data.latestCrawl,
              ),
            },
          ])
        : [],
    )
    this.coverLetters = new Map()
  }

  loadAll(jobSearchId: JobSearchID): VacancyListOutput {
    const data = this.store.get(jobSearchId.value)
    if (!data) return EMPTY_VACANCY_LIST_OUTPUT
    const cloned = structuredClone(data.output)
    return {
      ...cloned,
      vacancies: cloned.vacancies.map((v) => new Vacancy(v)),
    }
  }

  save(jobSearchId: JobSearchID, vacancies: Vacancy[], latestCrawl: string): void {
    this.store.set(jobSearchId.value, {
      output: createVacancyListOutput(
        vacancies.map((v) => new Vacancy(structuredClone(v))),
        latestCrawl,
      ),
    })
  }

  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined {
    const data = this.store.get(jobSearchId.value)
    const found = data?.output.vacancies.find((v) => v.hash === hash)
    return found ? new Vacancy(structuredClone(found)) : undefined
  }

  addActivity(jobSearchId: JobSearchID, hash: string, activity: Activity): void {
    const data = this.store.get(jobSearchId.value)
    if (!data) throw new Error(`No vacancies for job search "${jobSearchId.value}"`)

    const vacancy = data.output.vacancies.find((v) => v.hash === hash)
    if (!vacancy) throw new Error(`Vacancy "${hash}" not found`)

    const index = data.output.vacancies.indexOf(vacancy)
    data.output.vacancies[index] = new Vacancy({
      ...structuredClone(vacancy),
      activityHistory: [...vacancy.activityHistory, structuredClone(activity)],
    })
  }

  loadCoverLetter(jobSearchId: JobSearchID, vacancyHash: string): string {
    return this.coverLetters.get(`${jobSearchId.value}:${vacancyHash}`) ?? ""
  }

  saveCoverLetter(jobSearchId: JobSearchID, vacancyHash: string, content: string): void {
    this.coverLetters.set(`${jobSearchId.value}:${vacancyHash}`, content)
  }

  private readonly store: Map<string, StubData>
  private readonly coverLetters: Map<string, string>
}

interface StubData {
  output: VacancyListOutput
}
```

- [ ] **Step 2: Update `src/repositories/vacancy/sqlite/index.ts`**

Replace the file:

```ts
import { Database } from "@/utils/index.js"

import { Vacancy } from "@/models/vacancy/index.js"

import type { Activity } from "@/models/vacancy"

import type { JobSearchID } from "@/models/job-search"

import { resolveVacancy } from "@/models/vacancy/index.js"

import {
  EMPTY_VACANCY_LIST_OUTPUT,
  createVacancyListOutput,
} from "@/repositories/vacancy/output.js"

import type { VacancyRepository } from "../types.js"

import { z } from "zod"
import { VacancyDTOSchema } from "@/models/vacancy"

export function createSqliteVacancyRepository(
  database: Database,
): VacancyRepository {
  database.exec(`
    CREATE TABLE IF NOT EXISTS vacancy_meta (
      job_search_id TEXT PRIMARY KEY REFERENCES job_searches(id) ON DELETE CASCADE,
      generated_at TEXT NOT NULL,
      latest_crawl TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vacancies (
      job_search_id TEXT NOT NULL REFERENCES job_searches(id) ON DELETE CASCADE,
      hash TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (job_search_id, hash)
    )
  `)
  return new SqliteVacancyRepository(database)
}

class SqliteVacancyRepository implements VacancyRepository {
  constructor(private readonly database: Database) {
    this.loadMetaStmt = database.prepare(
      "SELECT generated_at, latest_crawl FROM vacancy_meta WHERE job_search_id = ?",
    )
    this.loadAllStmt = database.prepare(
      "SELECT data FROM vacancies WHERE job_search_id = ?",
    )
    this.upsertMetaStmt = database.prepare(
      "INSERT OR REPLACE INTO vacancy_meta (job_search_id, generated_at, latest_crawl) VALUES (?, ?, ?)",
    )
    this.deleteStaleVacanciesStmt = database.prepare(
      "DELETE FROM vacancies WHERE job_search_id = ? AND hash NOT IN (SELECT value FROM json_each(?))",
    )
    this.upsertVacancyStmt = database.prepare(
      "INSERT OR REPLACE INTO vacancies (job_search_id, hash, data) VALUES (?, ?, ?)",
    )
    this.findByHashStmt = database.prepare(
      "SELECT data FROM vacancies WHERE job_search_id = ? AND hash = ?",
    )
    this.updateVacancyStmt = database.prepare(
      "UPDATE vacancies SET data = ? WHERE job_search_id = ? AND hash = ?",
    )
    this.loadCoverLetterStmt = database.prepare(
      "SELECT content FROM cover_letters WHERE job_search_id = ? AND vacancy_hash = ?",
    )
    this.saveCoverLetterStmt = database.prepare(
      "INSERT OR REPLACE INTO cover_letters (job_search_id, vacancy_hash, content) VALUES (?, ?, ?)",
    )
  }

  loadAll(jobSearchId: JobSearchID) {
    const metaRaw = this.loadMetaStmt.get(jobSearchId.value)
    if (metaRaw === undefined) return EMPTY_VACANCY_LIST_OUTPUT
    const meta = z
      .object({ generated_at: z.string(), latest_crawl: z.string() })
      .parse(metaRaw)

    const vacancies = this.loadAllStmt
      .all(jobSearchId.value)
      .map((raw) => hydrateVacancyRow(raw))

    return {
      generatedAt: meta.generated_at,
      latestCrawl: meta.latest_crawl,
      vacancies,
    }
  }

  save(jobSearchId: JobSearchID, vacancies: Vacancy[], latestCrawl: string): void {
    const output = createVacancyListOutput(vacancies, latestCrawl)
    const hashes = JSON.stringify(vacancies.map((v) => v.hash))

    this.database.transaction(() => {
      this.upsertMetaStmt.run(
        jobSearchId.value,
        output.generatedAt,
        output.latestCrawl,
      )
      this.deleteStaleVacanciesStmt.run(jobSearchId.value, hashes)
      for (const vacancy of vacancies) {
        this.upsertVacancyStmt.run(
          jobSearchId.value,
          vacancy.hash,
          JSON.stringify(vacancy),
        )
      }
    })
  }

  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined {
    const row = this.findByHashStmt.getJsonData(jobSearchId.value, hash)
    if (row === undefined) return undefined
    return hydrateVacancy(row)
  }

  addActivity(jobSearchId: JobSearchID, hash: string, activity: Activity): void {
    const row = this.findByHashStmt.getJsonData(jobSearchId.value, hash)
    if (row === undefined) throw new Error(`Vacancy "${hash}" not found`)

    const vacancy = hydrateVacancy(row)
    const updated = vacancy.with({
      activityHistory: [...vacancy.activityHistory, activity],
    })

    this.updateVacancyStmt.run(JSON.stringify(updated), jobSearchId.value, hash)
  }

  loadCoverLetter(jobSearchId: JobSearchID, vacancyHash: string): string {
    const raw = this.loadCoverLetterStmt.get(jobSearchId.value, vacancyHash)
    if (raw === undefined) return ""
    return CoverLetterRowSchema.parse(raw).content
  }

  saveCoverLetter(jobSearchId: JobSearchID, vacancyHash: string, content: string): void {
    this.saveCoverLetterStmt.run(jobSearchId.value, vacancyHash, content)
  }

  private readonly loadMetaStmt
  private readonly loadAllStmt
  private readonly upsertMetaStmt
  private readonly deleteStaleVacanciesStmt
  private readonly upsertVacancyStmt
  private readonly findByHashStmt
  private readonly updateVacancyStmt
  private readonly loadCoverLetterStmt
  private readonly saveCoverLetterStmt
}

function hydrateVacancyRow(row: Record<string, unknown>): Vacancy {
  if (typeof row.data !== "string") throw new Error("Invalid vacancy row")
  return hydrateVacancy(JSON.parse(row.data))
}

function hydrateVacancy(data: unknown): Vacancy {
  const parsed = VacancyDTOSchema.partial()
    .loose()
    .parse(stripLegacyCommute(data))
  return new Vacancy(resolveVacancy(parsed))
}

function stripLegacyCommute(data: unknown): unknown {
  if (!isRecord(data)) return data
  if (isRecord(data.commute) && hasLegacyCommuteFormat(data.commute)) {
    return { ...data, commute: undefined }
  }
  return data
}

function hasLegacyCommuteFormat(commute: Record<string, unknown>): boolean {
  return Object.values(commute).some((entry) => !isValidCommuteEntry(entry))
}

function isValidCommuteEntry(entry: unknown): boolean {
  if (!isRecord(entry) || !isRecord(entry.durations)) return false
  return typeof entry.durations.morning === "number"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

const CoverLetterRowSchema = z.object({ content: z.string() })
```

- [ ] **Step 3: Commit**

```bash
git add src/repositories/vacancy/
git commit -m "refactor: move cover letters to VacancyRepository"
```

---

## Task 8: Update Services

**Files:**
- Modify: `src/services/cover-letter-writer/cover-letter-writer.ts`
- Modify: `src/services/cover-letter-writer/generate.ts`
- Modify: `src/services/cover-letter-writer/generate-personalized.ts`
- Modify: `src/services/vacancy-enricher/vacancy-enricher.ts`
- Modify: `src/services/vacancy-enricher/assess.ts`
- Modify: `src/services/vacancy-scanner/vacancy-scanner.ts`
- Modify: `src/services/vacancy-scanner/enrich-queue.ts`
- Modify: `src/services/site-crawler/resolve-search-parameters.ts`
- Modify: `src/services/job-consultant/job-consultant.ts`
- Modify: `src/services/resume-renderer/resume-renderer.ts`

- [ ] **Step 1: Update `src/services/cover-letter-writer/cover-letter-writer.ts`**

Replace the file:

```ts
import type { JobSearchRepository } from "@/repositories/job-search"
import type { ApplicantRepository } from "@/repositories/applicant"
import type { VacancyRepository } from "@/repositories/vacancy"
import type { LlmClient } from "@/plugins/llm"
import { ensureLlmAvailable } from "@/services/llm/index.js"
import { resolveDraftJobSearch } from "@/models/job-search/index.js"
import { JobSearchID, ApplicantID } from "@/models/job-search"
import { generateCoverLetter } from "./generate.js"
import { generatePersonalizedCoverLetter } from "./generate-personalized.js"

export class CoverLetterWriter {
  constructor(
    private readonly jobSearchRepo: JobSearchRepository,
    private readonly applicantRepo: ApplicantRepository,
    private readonly vacancyRepo: VacancyRepository,
    private readonly llm?: LlmClient,
  ) {}

  async generate(jobSearchId: string): Promise<{ content: string }> {
    const { jobSearch, applicantId } = this.jobSearchRepo.load(
      JobSearchID(jobSearchId),
    )
    const applicant = this.applicantRepo.load(applicantId)

    ensureLlmAvailable(this.llm)

    const content = await generateCoverLetter(applicant, jobSearch, this.llm)
    return { content }
  }

  async generateFromDraft(applicantId: string): Promise<{ content: string }> {
    const draft = this.jobSearchRepo.loadDraft(ApplicantID(applicantId))
    if (!draft)
      throw new Error(`Draft for applicant "${applicantId}" not found`)
    const applicant = this.applicantRepo.load(ApplicantID(applicantId))
    const resolved = resolveDraftJobSearch(draft)

    ensureLlmAvailable(this.llm)

    const content = await generateCoverLetter(applicant, resolved, this.llm)
    return { content }
  }

  async generateForVacancy(
    jobSearchId: string,
    vacancyHash: string,
  ): Promise<{ content: string }> {
    ensureLlmAvailable(this.llm)

    const vacancy = this.vacancyRepo.findByHash(
      JobSearchID(jobSearchId),
      vacancyHash,
    )
    if (!vacancy) {
      throw new Error(`Vacancy "${vacancyHash}" not found`)
    }

    const { jobSearch, applicantId } = this.jobSearchRepo.load(
      JobSearchID(jobSearchId),
    )
    const applicant = this.applicantRepo.load(applicantId)
    const templateCoverLetter = jobSearch.coverLetter

    const content = await generatePersonalizedCoverLetter(
      applicant,
      vacancy,
      templateCoverLetter,
      jobSearch,
      this.llm,
    )
    this.vacancyRepo.saveCoverLetter(
      JobSearchID(jobSearchId),
      vacancyHash,
      content,
    )
    return { content }
  }
}
```

- [ ] **Step 2: Update `src/services/cover-letter-writer/generate.ts`**

Replace the `buildCoverLetterPrompt` function:

```ts
function buildCoverLetterPrompt(
  applicant: Applicant,
  jobSearch: JobSearch,
): string {
  const sections = formatApplicantSections(applicant)

  const searchLines = [`Suchbegriff: ${jobSearch.searchTerm}`]
  if (jobSearch.notes.length > 0) {
    searchLines.push(
      `Präferenzen:\n${jobSearch.notes.split("\n").map((t) => `- ${t.trim()}`).filter(Boolean).join("\n")}`,
    )
  }
  sections.push(`## Stellensuche\n${searchLines.join("\n")}`)

  return `Erstellen Sie eine professionelle Anschreiben-Vorlage auf Deutsch für den folgenden Kandidaten und die beschriebene Stellensuche.

Das Anschreiben soll:
- Als fertige Vorlage verwendbar sein, die für einzelne Bewerbungen angepasst werden kann
- Platzhalter in eckigen Klammern enthalten für firmenspezifische Details, z.B. [Firmenname], [Stellenbezeichnung], [Ansprechpartner]
- Einen professionellen, motivierten Ton haben
- Die relevanten Qualifikationen und Erfahrungen des Kandidaten hervorheben
- Auf Deutsch verfasst sein
- Nur den Brieftext enthalten (ohne Absenderadresse, Datum, Betreffzeile - diese werden separat formatiert)
- Erwähne die Politik nicht direkt, auch wenn sie in den Persönlichen Hinweisen erwähnt wird
- Verwende keine Formulierungen, die deutlich über dem im Lebenslauf angegebenen Deutschniveau liegen
- Auf jeden Fall sollte "ich" nicht zu oft verwendet werden.
- Versuche, den Brief nicht zu lang zu machen, und nicht wie KI aussehen

Geben Sie NUR den Anschreiben-Text zurück, ohne zusätzliche Erklärungen oder Markdown-Formatierung.

${sections.join("\n\n")}`
}
```

- [ ] **Step 3: Update `src/services/cover-letter-writer/generate-personalized.ts`**

Replace the `buildPersonalizedCoverLetterPrompt` function:

```ts
function buildPersonalizedCoverLetterPrompt(
  applicant: Applicant,
  vacancy: Vacancy,
  templateCoverLetter: string,
  jobSearch: JobSearch,
): string {
  const sections = formatApplicantSections(applicant)

  if (templateCoverLetter) {
    sections.push(`## Example Cover Letter (template)\n${templateCoverLetter}`)
  }

  sections.push(formatVacancySection(vacancy))

  if (jobSearch.notes.length > 0) {
    sections.push(
      `## Preferences\n${jobSearch.notes.split("\n").map((t) => `- ${t.trim()}`).filter(Boolean).join("\n")}`,
    )
  }

  return `Write a personalized cover letter for the following applicant and vacancy.

Instructions:
- If an example cover letter (template) is provided, use it as a base for tone and structure
- Personalize the letter for this specific vacancy: use the company name, position title, and contact person (if available)
- Highlight the applicant's skills and qualities that match the job description
- Write in the language of the job description (German job description → German letter, English → English)
- Return ONLY the letter body text (no address, date, or subject line - those are formatted separately)
- Do not mention politics directly, even if referenced in personal notes
- Do not overuse "ich" - keep the tone professional and concise
- Do not make the letter sound AI-generated
- Do not use language that exceeds the applicant's stated proficiency level

${sections.join("\n\n")}`
}
```

- [ ] **Step 4: Update `src/services/vacancy-enricher/vacancy-enricher.ts`**

Replace the file:

```ts
import type { LlmClient } from "@/plugins/llm"

import type { CommuteClient } from "@/plugins/commute"

import type { Applicant } from "@/models/applicant"

import type { JobSearch } from "@/models/job-search"

import type { Vacancy } from "@/models/vacancy/index.js"

import { formatError } from "@/services/vacancy-scanner/index.js"

import { computeCommutes } from "./commute.js"

import { needsAssessment, assessVacancy } from "./assess.js"

import {
  needsContactExtraction,
  extractContactInfo,
  mergeContactInfo,
} from "./extract-contact.js"

export class VacancyEnricher {
  constructor(private readonly deps: EnricherDeps) {}

  async enrich(
    vacancy: Vacancy,
    context: EnrichContext,
    signal?: AbortSignal,
  ): Promise<Vacancy> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

    const commuted = await this.tryComputeCommute(
      vacancy,
      context.applicant,
      signal,
    )
    const { result, successful } = await this.tryLlmEnrich(
      commuted,
      context,
      signal,
    )
    if (successful) {
      return result.with({ enriched: true, enrichmentDirty: false })
    }
    return result
  }

  private async tryComputeCommute(
    vacancy: Vacancy,
    applicant: Applicant,
    signal?: AbortSignal,
  ): Promise<Vacancy> {
    const origin = resolveCommuteOrigin(applicant)
    if (!this.deps.commuteClient || !origin || vacancy.addresses.length === 0) {
      return vacancy
    }
    try {
      const result = await computeCommutes({
        vacancies: [vacancy],
        origin,
        commuteClient: this.deps.commuteClient,
        signal,
      })
      return result.vacancies[0]
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        throw error
      console.error(
        `Failed to compute commute for "${vacancy.title}":`,
        formatError(error),
      )
      return vacancy
    }
  }

  private async tryLlmEnrich(
    vacancy: Vacancy,
    context: EnrichContext,
    signal?: AbortSignal,
  ): Promise<{ result: Vacancy; successful: boolean }> {
    if (!this.deps.llmClient) return { result: vacancy, successful: false }

    const [assessmentResult, contactResult] = await runLlmEnrichment(
      vacancy,
      context.applicant,
      context.jobSearch,
      this.deps.llmClient,
      signal,
    )

    let updated = vacancy
    if (assessmentResult) {
      updated = updated.with({
        summary: assessmentResult.summary,
        matchScore: assessmentResult.matchScore,
      })
    }
    if (contactResult) {
      updated = mergeContactInfo(updated, contactResult)
    }

    const anySucceeded = !!(assessmentResult || contactResult)
    const noneNeeded =
      !needsAssessment(vacancy) && !needsContactExtraction(vacancy)
    return { result: updated, successful: anySucceeded || noneNeeded }
  }
}

export interface EnrichContext {
  applicant: Applicant
  jobSearch: JobSearch
}

interface EnricherDeps {
  llmClient?: LlmClient
  commuteClient?: CommuteClient
}

function resolveCommuteOrigin(applicant: Applicant): string | undefined {
  const address = applicant.personal.address
  if (!address) return undefined
  return `${address.street}, ${address.zip} ${address.city}`
}

function runLlmEnrichment(
  vacancy: Vacancy,
  applicant: Applicant,
  jobSearch: JobSearch,
  llmClient: LlmClient,
  signal?: AbortSignal,
) {
  return Promise.all([
    needsAssessment(vacancy)
      ? assessVacancy(vacancy, applicant, jobSearch, llmClient, signal).catch(
          (error) => {
            if (error instanceof DOMException && error.name === "AbortError")
              throw error
            console.error(
              `Failed to assess "${vacancy.title}":`,
              formatError(error),
            )
            return
          },
        )
      : undefined,
    needsContactExtraction(vacancy)
      ? extractContactInfo(vacancy, llmClient, signal).catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError")
            throw error
          console.error(
            `Failed to extract contact for "${vacancy.title}":`,
            formatError(error),
          )
          return
        })
      : undefined,
  ])
}
```

- [ ] **Step 5: Update `src/services/vacancy-enricher/assess.ts`**

Replace the file:

```ts
import { z } from "zod"
import type { Applicant } from "@/models/applicant"
import type { JobSearch } from "@/models/job-search"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { LlmClient, TypedSchema } from "@/plugins/llm"
import { formatApplicantSections } from "@/models/applicant/index.js"

export function needsAssessment(vacancy: Vacancy): boolean {
  return !vacancy.summary || vacancy.enrichmentDirty
}

export async function assessVacancy(
  vacancy: Vacancy,
  applicant: Applicant,
  jobSearch: JobSearch,
  llmClient: LlmClient,
  signal?: AbortSignal,
): Promise<AssessResult> {
  const prompt = buildAssessPrompt(vacancy, applicant, jobSearch)
  return await llmClient.completeJSON(prompt, 2048, ASSESS_SCHEMA, signal)
}

const AssessResultSchema = z.object({
  summary: z.string(),
  matchScore: z.enum(["very-bad", "bad", "ok", "good", "excellent"]),
})
type AssessResult = z.infer<typeof AssessResultSchema>

const ASSESS_SCHEMA: TypedSchema<AssessResult> = {
  schema: z.toJSONSchema(AssessResultSchema),
  parse: (input: string) => AssessResultSchema.parse(JSON.parse(input)),
}

function buildAssessPrompt(
  vacancy: Vacancy,
  applicant: Applicant,
  jobSearch: JobSearch,
): string {
  const sections = [
    `## Stellenausschreibung
Titel: ${vacancy.title}
Unternehmen: ${vacancy.company}
Standort: ${vacancy.addresses.join(", ") || "Nicht angegeben"}
${vacancy.description ? `Beschreibung:\n${vacancy.description}` : "Keine Beschreibung vorhanden."}`,
    ...formatApplicantSections(applicant),
  ]

  if (jobSearch.notes.length > 0) {
    sections.push(
      `## Suchpräferenzen\n${jobSearch.notes.split("\n").map((t) => `- ${t.trim()}`).filter(Boolean).join("\n")}`,
    )
  }

  return String.raw`Sie bewerten eine Stellenausschreibung für einen Kandidaten. Geben Sie basierend auf der Ausschreibung und dem Profil des Kandidaten Folgendes an:
1. Eine kurze Zusammenfassung der Stelle (3-4 Stichpunkte beginnend mit -), mit besonderem Bezug auf die Relevanz für den Kandidaten
2. Eine Übereinstimmungsbewertung: eine von "very-bad", "bad", "ok", "good", "excellent"

Geben Sie NUR ein JSON-Objekt zurück (keine Markdown-Fences, kein zusätzlicher Text):
{"summary": "- Punkt 1\n- Punkt 2\n- Punkt 3", "matchScore": "good"}

${sections.join("\n\n")}`
}
```

- [ ] **Step 6: Update `src/services/vacancy-scanner/vacancy-scanner.ts`**

Replace the `scan` method and relevant parts:

```ts
    const jobSearch = this.jobSearchRepo.load(id)
    const sitesToRun =
      jobSearch.jobSearch.sources.length > 0
        ? jobSearch.jobSearch.sources.map((s) => s.value)
        : this.listJobSiteNames()

    const applicant = this.applicantRepo.load(jobSearch.applicantId)
    const criteria = resolveSearchParameters(jobSearch.jobSearch, applicant)
```

And update the queue creation:

```ts
    const queue = new EnrichQueue({
      enricher: this.enricher,
      context: { applicant, jobSearch: jobSearch.jobSearch },
```

And the batch enrichment at the end:

```ts
      const queue = createEnrichQueue(
        services,
        jobSearchId,
        applicant,
        jobSearch.jobSearch,
        existingByHash,
        output.latestCrawl,
        safeSend,
        abortController.signal,
      )
```

And `createEnrichQueue` signature:

```ts
function createEnrichQueue(
  services: AppServices,
  jobSearchId: string,
  applicant: Applicant,
  jobSearch: JobSearch,
  existingByHash: Map<string, Vacancy>,
  latestCrawl: string,
  safeSend: SafeSend,
  signal: AbortSignal,
): EnrichQueue {
  return new EnrichQueue({
    enricher: services.vacancyEnricher,
    context: { applicant, jobSearch },
```

- [ ] **Step 7: Update `src/services/vacancy-scanner/enrich-queue.ts`**

Update the import:

```ts
import type {
  VacancyEnricher,
  EnrichContext,
} from "@/services/vacancy-enricher/index.js"
```

No other changes needed since `EnrichContext` is imported as a type.

- [ ] **Step 8: Update `src/services/site-crawler/resolve-search-parameters.ts`**

Replace the file:

```ts
import type { Applicant } from "@/models/applicant"
import type { JobSearch, JobSearchCriteria } from "@/models/job-search"

export function resolveSearchParameters(
  jobSearch: JobSearch,
  applicant: Applicant,
): JobSearchCriteria {
  const location = applicant.personal.address?.city ?? ""
  return {
    location,
    query: jobSearch.searchTerm,
    radiusKm: jobSearch.radiusKm,
    mode: jobSearch.mode,
    limit:
      jobSearch.maxResultsPerSource === 0
        ? undefined
        : jobSearch.maxResultsPerSource,
  }
}
```

- [ ] **Step 9: Update `src/services/job-consultant/job-consultant.ts`**

Replace the file:

```ts
import type { ApplicantRepository } from "@/repositories/applicant"
import type { LlmClient } from "@/plugins/llm"
import type { ConsultationSuggestion } from "@/models/job-search"
import { ensureLlmAvailable } from "@/services/llm/index.js"
import { consultSearches } from "./consult-searches.js"

export class JobConsultant {
  constructor(
    private readonly applicantRepo: ApplicantRepository,
    private readonly llm?: LlmClient,
  ) {}

  async consult(
    applicantId: string,
  ): Promise<{ suggestions: ConsultationSuggestion[] }> {
    const applicant = this.applicantRepo.load({ value: applicantId })

    ensureLlmAvailable(this.llm)

    const suggestions = await consultSearches(applicant, this.llm)
    return { suggestions }
  }
}
```

- [ ] **Step 10: Update `src/services/resume-renderer/resume-renderer.ts`**

Replace the `generate` method:

```ts
  async generate(
    applicantId: string,
    template: string,
  ): Promise<Buffer | Uint8Array> {
    if (!template || !isSupportedTemplate(template)) {
      throw new Error(
        `Invalid template. Must be one of: ${RESUME_TEMPLATES.join(", ")}`,
      )
    }

    const applicant = this.applicantRepo.load({ value: applicantId })
    const resumeData = prepareResumeData(applicant)
    const html = renderHTML(
      path.resolve(import.meta.dirname, "./templates"),
      template,
      resumeData,
    )
    return this.pdfRenderer.htmlToPdf(html)
  }
```

- [ ] **Step 11: Commit**

```bash
git add src/services/
git commit -m "refactor: update services for flat JobSearch and ID wrappers"
```

---

## Task 9: Update IPC Handlers

**Files:**
- Modify: `src/app/ipc-applicants.ts`
- Modify: `src/app/ipc-job-searches.ts`
- Modify: `src/app/ipc-vacancies.ts`

- [ ] **Step 1: Update `src/app/ipc-applicants.ts`**

Replace the file:

```ts
import { ApplicantSchema } from "@/models/applicant"
import type { AppServices } from "."
import type { IpcHandle } from "./ipc-handlers.js"
import { ApplicantID } from "@/models/applicant"

export function registerApplicantsHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
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
    const validated = ApplicantSchema.parse(data)
    services.applicantRepo.save(ApplicantID(id), validated)
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
    const validated = ApplicantSchema.parse(draft)
    services.applicantRepo.saveDraft(validated)
    return { ok: true }
  })
  handle("applicants:draft:delete", () => {
    services.applicantRepo.deleteDraft()
    return { ok: true }
  })
  handle("applicants:draft:finalize", () => {
    const id = services.applicantRepo.finalizeDraft()
    return { id: id.value }
  })
  handle("applicants:resume", (id: string, template: string) =>
    services.resumeRenderer.generate(id, template),
  )
  handle("applicants:consult-searches", (id: string) =>
    services.jobConsultant.consult(id).then((suggestions) => ({
      suggestions,
    })),
  )
}
```

- [ ] **Step 2: Update `src/app/ipc-job-searches.ts`**

Replace the file:

```ts
import { JobSearchSchema } from "@/models/job-search"
import type { SearchMode } from "@/models/job-search"
import type { AppServices } from "."
import type { IpcHandle } from "./ipc-handlers.js"
import { JobSearchID, ApplicantID } from "@/models/job-search"

export function registerJobSearchesHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("job-searches:list", (applicantId: string) => {
    const list = services.jobSearchRepo.listByApplicant(ApplicantID(applicantId))
    return {
      jobSearches: list.map((info) => ({
        id: info.id.value,
        displayName: info.displayName,
      })),
    }
  })
  handle(
    "job-searches:create",
    (searchTerm: string, applicantId: string, searchMode?: SearchMode) => {
      const id = services.jobSearchRepo.create(
        searchTerm,
        ApplicantID(applicantId),
        searchMode,
      )
      return { id: id.value, applicantId }
    },
  )
  handle("job-searches:load", (id: string) => {
    const { jobSearch, applicantId } = services.jobSearchRepo.load(
      JobSearchID(id),
    )
    return { jobSearch, applicantId: applicantId.value }
  })
  handle("job-searches:save", (id: string, data: unknown) => {
    const validated = JobSearchSchema.parse(data)
    services.jobSearchRepo.save(JobSearchID(id), validated)
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
    const validated = JobSearchSchema.parse(draft)
    services.jobSearchRepo.saveDraft(ApplicantID(applicantId), validated)
    return { ok: true }
  })
  handle("job-searches:draft:delete", (applicantId: string) => {
    services.jobSearchRepo.deleteDraft(ApplicantID(applicantId))
    return { deleted: applicantId }
  })
  handle("job-searches:draft:finalize", (applicantId: string) => {
    const id = services.jobSearchRepo.finalizeDraft(ApplicantID(applicantId))
    return { id: id.value, applicantId }
  })

  handle("job-searches:cover-letter:load", (id: string) => {
    const { jobSearch } = services.jobSearchRepo.load(JobSearchID(id))
    return { content: jobSearch.coverLetter }
  })
  handle("job-searches:cover-letter:save", (id: string, content: string) => {
    const { jobSearch, applicantId } = services.jobSearchRepo.load(JobSearchID(id))
    services.jobSearchRepo.save(JobSearchID(id), {
      ...jobSearch,
      coverLetter: content,
    })
    return { ok: true }
  })
  handle("job-searches:cover-letter:generate", (id: string) =>
    services.coverLetterWriter.generate(id),
  )
  handle("job-searches:draft:cover-letter:generate", (applicantId: string) =>
    services.coverLetterWriter.generateFromDraft(applicantId),
  )
}
```

- [ ] **Step 3: Update `src/app/ipc-vacancies.ts`**

Replace the relevant parts:

```ts
import { VacancyWithStatusSchema } from "@/models/vacancy"
import type { Activity } from "@/models/vacancy"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { Applicant } from "@/models/applicant"
import type { JobSearch } from "@/models/job-search"
import type { AppServices } from "."
import { EnrichQueue } from "@/services/vacancy-scanner/index.js"
import type { IpcHandle, SafeSend } from "./ipc-handlers.js"
import { JobSearchID } from "@/models/job-search"
```

And update all handler bodies to use `JobSearchID(id)`:

```ts
  handle("job-searches:vacancies:list", (id: string) => {
    const output = services.vacancyRepo.loadAll(JobSearchID(id))
    // ... rest unchanged
  })

  handle(
    "job-searches:vacancies:seed",
    (id: string, vacancies: Vacancy[], latestCrawl: string) => {
      services.vacancyRepo.save(JobSearchID(id), vacancies, latestCrawl)
      return { ok: true as const, count: vacancies.length }
    },
  )

  handle("job-searches:vacancies:load", (id: string, hash: string) => {
    const vacancy = services.vacancyRepo.findByHash(JobSearchID(id), hash)
    // ... rest unchanged
  })

  handle(
    "job-searches:vacancies:add-activity",
    (id: string, hash: string, activity: Activity) => {
      services.vacancyRepo.addActivity(JobSearchID(id), hash, activity)
      return { ok: true }
    },
  )
```

Replace the cover letter handlers:

```ts
  handle(
    "vacancies:cover-letter:load",
    (jobSearchId: string, vacancyHash: string) => ({
      content: services.vacancyRepo.loadCoverLetter(
        JobSearchID(jobSearchId),
        vacancyHash,
      ),
    }),
  )
  handle(
    "vacancies:cover-letter:save",
    (jobSearchId: string, vacancyHash: string, content: string) => {
      services.vacancyRepo.saveCoverLetter(
        JobSearchID(jobSearchId),
        vacancyHash,
        content,
      )
      return { ok: true }
    },
  )
  handle(
    "vacancies:cover-letter:generate",
    (jobSearchId: string, vacancyHash: string) =>
      services.coverLetterWriter.generateForVacancy(jobSearchId, vacancyHash),
  )
```

Update the re-enrich handler:

```ts
  handle("vacancies:re-enrich", async (jobSearchId: string, hash: string) => {
    const vacancy = services.vacancyRepo.findByHash(JobSearchID(jobSearchId), hash)
    if (!vacancy) throw new Error(`Vacancy "${hash}" not found`)

    const { jobSearch, applicantId } = services.jobSearchRepo.load(JobSearchID(jobSearchId))
    const applicant = services.applicantRepo.load(applicantId)

    const dirtyVacancy = vacancy.with({ enrichmentDirty: true })
    const enriched = await services.vacancyEnricher.enrich(dirtyVacancy, {
      applicant,
      jobSearch,
    })

    const latestCrawl = services.vacancyRepo.loadAll(JobSearchID(jobSearchId)).latestCrawl
    const allVacancies = services.vacancyRepo.loadAll(JobSearchID(jobSearchId)).vacancies
    const updated = allVacancies.map((v) => (v.hash === hash ? enriched : v))
    services.vacancyRepo.save(JobSearchID(jobSearchId), updated, latestCrawl)

    if (enriched.enrichmentDirty) {
      throw new Error(
        "Analyse fehlgeschlagen: Modell und API-Schlüssel in den Einstellungen überprüfen",
      )
    }

    return { ok: true }
  })
```

Update the batch enrich handler:

```ts
  handle("vacancies:enrich-unenriched", async (jobSearchId: string) => {
    if (batchEnrichAbortControllers.has(jobSearchId)) {
      throw new Error(`Batch enrichment already running for ${jobSearchId}`)
    }

    const abortController = new AbortController()
    batchEnrichAbortControllers.set(jobSearchId, abortController)

    const { jobSearch, applicantId } = services.jobSearchRepo.load(JobSearchID(jobSearchId))
    const applicant = services.applicantRepo.load(applicantId)
    const output = services.vacancyRepo.loadAll(JobSearchID(jobSearchId))
    const vacanciesNeedingEnrichment = output.vacancies.filter(
      (v) => !v.enriched || v.enrichmentDirty,
    )

    if (vacanciesNeedingEnrichment.length === 0) {
      batchEnrichAbortControllers.delete(jobSearchId)
      return { count: 0 }
    }

    const existingByHash = new Map(output.vacancies.map((v) => [v.hash, v]))

    try {
      const queue = createEnrichQueue(
        services,
        jobSearchId,
        applicant,
        jobSearch,
        existingByHash,
        output.latestCrawl,
        safeSend,
        abortController.signal,
      )

      // ... rest unchanged
```

And update `createEnrichQueue`:

```ts
function createEnrichQueue(
  services: AppServices,
  jobSearchId: string,
  applicant: Applicant,
  jobSearch: JobSearch,
  existingByHash: Map<string, Vacancy>,
  latestCrawl: string,
  safeSend: SafeSend,
  signal: AbortSignal,
): EnrichQueue {
  return new EnrichQueue({
    enricher: services.vacancyEnricher,
    context: { applicant, jobSearch },
    onEnriched: (enriched, hash) => {
      existingByHash.set(hash, enriched)
      services.vacancyRepo.save(
        JobSearchID(jobSearchId),
        [...existingByHash.values()],
        latestCrawl,
      )
      safeSend("job:progress", {
        jobSearchId,
        message: "",
        phase: "enrich",
        vacanciesUpdated: true,
      })
    },
    // ... rest unchanged
```

- [ ] **Step 4: Commit**

```bash
git add src/app/ipc-applicants.ts src/app/ipc-job-searches.ts src/app/ipc-vacancies.ts
git commit -m "refactor: update IPC handlers for ID wrappers and flat models"
```

---

## Task 10: Update UI Data Layer

**Files:**
- Modify: `src/ui/data/applicants.ts`
- Modify: `src/ui/data/job-searches.ts`

- [ ] **Step 1: Update `src/ui/data/applicants.ts`**

Replace the file:

```ts
import { z } from "zod"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import type { Applicant, ResumeTemplate } from "@/models/applicant"

import { ApplicantSchema, ApplicantInfoSchema } from "@/models/applicant"

import { api } from "./internal/api"

export function useApplicantListView() {
  const query = useApplicants()
  return {
    ...query,
    data: query.data?.applicants ?? [],
  }
}

export function useApplicantHeaderName(applicantId = "") {
  const query = useApplicant(applicantId)
  return {
    ...query,
    displayName: query.data?.personal.name || applicantId,
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
    mutationFn: (draft: Applicant) =>
      api().invoke("applicants:draft:save", draft),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applicant-draft"] }),
  })
}

export function useDeleteApplicantDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api().invoke("applicants:draft:delete"),
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

export function useUpdateApplicant(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Applicant) => api().invoke("applicants:save", id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applicant", id] }),
  })
}

export function useDeleteApplicant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api().invoke("applicants:delete", id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applicants"] }),
  })
}

export function useDownloadResume(id: string, applicantName: string) {
  return useMutation({
    mutationFn: async (template: ResumeTemplate) => {
      const buffer = await api().invoke("applicants:resume", id, template)
      if (!(buffer instanceof ArrayBuffer)) {
        throw new TypeError("Expected ArrayBuffer from IPC")
      }
      const blob = new Blob([buffer], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const filename = applicantName
        ? `${applicantName.toLowerCase().replaceAll(" ", "_")}_lebenslauf.pdf`
        : `${id}_lebenslauf.pdf`
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}

export function useConsultSearchesView(applicantId: string) {
  const mutation = useConsultSearches(applicantId)
  return {
    ...mutation,
    suggestions: mutation.data?.suggestions ?? [],
  }
}

function useConsultSearches(applicantId: string) {
  return useMutation({
    mutationFn: async () =>
      SuggestionsResponseSchema.parse(
        await api().invoke("applicants:consult-searches", applicantId),
      ),
  })
}

function useApplicants() {
  return useQuery({
    queryKey: ["applicants"],
    queryFn: async () =>
      ApplicantListResponseSchema.parse(await api().invoke("applicants:list")),
  })
}

const CreatedIdSchema = z.object({ id: z.string() })

const ApplicantDraftResponseSchema = z.object({
  draft: ApplicantSchema.optional(),
})

const ApplicantListResponseSchema = z.object({
  applicants: z.array(ApplicantInfoSchema),
})

const SuggestionsResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      searchTerm: z.string(),
      searchMode: z.enum(["employment", "entry-level", "apprenticeship"]),
      reason: z.string(),
    }),
  ),
})
```

- [ ] **Step 2: Update `src/ui/data/job-searches.ts`**

Replace the file:

```ts
import { z } from "zod"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import type { JobSearch, JobSearchInfo } from "@/models/job-search"

import { JobSearchSchema, JobSearchInfoSchema } from "@/models/job-search"

import type {
  Activity,
  VacancyDTO,
  VacancySource,
  VacancyStatus,
} from "@/models/vacancy"

import { VacancyWithStatusSchema } from "@/models/vacancy"

import { api } from "./internal/api"

import { jobSearchQueryKeys, invalidateQuery } from "./job-search-query-keys"

export type VacancyWithStatus = VacancyDTO & {
  status: VacancyStatus
  sources: VacancySource[]
}

export function useJobSearchListView(applicantId?: string) {
  const query = useJobSearches(applicantId)
  return {
    ...query,
    data: query.data ?? EMPTY_JOB_SEARCH_LIST,
  }
}

export function useJobSearch(id: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.detail(id),
    queryFn: async () => {
      const response = await api().invoke("job-searches:load", id)
      return JobSearchLoadResponseSchema.parse(response)
    },
    enabled: !!id,
  })
}

export function useCreateJobSearch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      searchTerm: string
      applicantId: string
      searchMode?: string
    }) =>
      api().invoke(
        "job-searches:create",
        body.searchTerm,
        body.applicantId,
        body.searchMode,
      ),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.listRoot()),
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
    mutationFn: (draft: JobSearch) =>
      api().invoke("job-searches:draft:save", applicantId, draft),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.draft(applicantId)),
  })
}

export function useDeleteJobSearchDraft(applicantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api().invoke("job-searches:draft:delete", applicantId),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.draft(applicantId)),
  })
}

export function useFinalizeJobSearchDraft(applicantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      CreatedJobSearchIdSchema.parse(
        await api().invoke("job-searches:draft:finalize", applicantId),
      ),
    onSuccess: async ({ id }) => {
      await invalidateQuery(queryClient, jobSearchQueryKeys.draft(applicantId))
      await invalidateQuery(queryClient, jobSearchQueryKeys.list(applicantId))
      await invalidateQuery(queryClient, jobSearchQueryKeys.listRoot())
      await invalidateQuery(queryClient, jobSearchQueryKeys.detail(id))
      await invalidateQuery(queryClient, jobSearchQueryKeys.coverLetter(id))
    },
  })
}

export function useUpdateJobSearch(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: JobSearch) =>
      api().invoke("job-searches:save", id, data),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.detail(id)),
  })
}

export function useDeleteJobSearch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api().invoke("job-searches:delete", id),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.listRoot()),
  })
}

export function useJobSearchCoverLetter(id: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.coverLetter(id),
    queryFn: async () =>
      ContentSchema.parse(
        await api().invoke("job-searches:cover-letter:load", id),
      ),
    enabled: !!id,
  })
}

export function useUpdateJobSearchCoverLetter(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api().invoke("job-searches:cover-letter:save", id, content),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.coverLetter(id)),
  })
}

export function useGenerateCoverLetter(id: string) {
  return useMutation({
    mutationFn: async () =>
      ContentSchema.parse(
        await api().invoke("job-searches:cover-letter:generate", id),
      ),
  })
}

export function useGenerateDraftCoverLetter(applicantId: string) {
  return useMutation({
    mutationFn: async () =>
      ContentSchema.parse(
        await api().invoke(
          "job-searches:draft:cover-letter:generate",
          applicantId,
        ),
      ),
  })
}

export function useVacancyCoverLetter(id: string, hash: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.vacancyCoverLetter(id, hash),
    queryFn: async () =>
      ContentSchema.parse(
        await api().invoke("vacancies:cover-letter:load", id, hash),
      ),
    enabled: !!id && !!hash,
  })
}

export function useUpdateVacancyCoverLetter(id: string, hash: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api().invoke("vacancies:cover-letter:save", id, hash, content),
    onSuccess: () =>
      invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyCoverLetter(id, hash),
      ),
  })
}

export function useGenerateVacancyCoverLetter(id: string, hash: string) {
  return useMutation({
    mutationFn: async () =>
      ContentSchema.parse(
        await api().invoke(
          "vacancies:cover-letter:generate",
          id,
          hash,
        ),
      ),
  })
}

export function useJobSearchVacancyListView(id: string) {
  const query = useJobSearchVacancies(id)
  return {
    ...query,
    data:
      query.data === undefined
        ? EMPTY_VACANCY_LIST
        : {
            vacancies: query.data.vacancies,
            totalCount: query.data.totalCount,
          },
  }
}

export function useJobSearchVacancy(id: string, hash: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.vacancyDetail(id, hash),
    queryFn: async () =>
      VacancyWithStatusSchema.parse(
        await api().invoke("job-searches:vacancies:load", id, hash),
      ),
    enabled: !!id && !!hash,
  })
}

export function useReEnrichVacancy(jobSearchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (hash: string) =>
      api().invoke("vacancies:re-enrich", jobSearchId, hash),
    onSuccess: () => {
      void invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyList(jobSearchId),
      )
      void invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyDetailRoot(jobSearchId),
      )
    },
  })
}

export function useEnrichAllUnenriched(jobSearchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api().invoke("vacancies:enrich-unenriched", jobSearchId),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(jobSearchId)),
  })
}

export function useAbortEnrichment(jobSearchId: string) {
  return useMutation({
    mutationFn: () => api().invoke("vacancies:enrich:abort", jobSearchId),
  })
}

export function useAddActivity(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ hash, activity }: { hash: string; activity: Activity }) =>
      api().invoke("job-searches:vacancies:add-activity", id, hash, activity),
    onSuccess: () => {
      void invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(id))
      void invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyDetailRoot(id),
      )
    },
  })
}

const EMPTY_VACANCY_LIST: VacancyListView = {
  vacancies: [],
  totalCount: 0,
}

const EMPTY_JOB_SEARCH_LIST: JobSearchListView = {
  jobSearches: [],
}

type VacancyListView = Readonly<{
  vacancies: VacancyWithStatus[]
  totalCount: number
}>

type JobSearchListView = Readonly<{
  jobSearches: JobSearchInfo[]
}>

function useJobSearches(applicantId?: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.list(applicantId),
    queryFn: async () =>
      JobSearchListResponseSchema.parse(
        await api().invoke("job-searches:list", applicantId),
      ),
  })
}

function useJobSearchVacancies(id: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.vacancyList(id),
    queryFn: async () =>
      VacancyListResponseSchema.parse(
        await api().invoke("job-searches:vacancies:list", id),
      ),
    enabled: !!id,
  })
}

const JobSearchListResponseSchema = z.object({
  jobSearches: z.array(JobSearchInfoSchema),
})

const JobSearchLoadResponseSchema = z.object({
  jobSearch: JobSearchSchema,
  applicantId: z.string(),
})

const JobSearchDraftResponseSchema = z.object({
  draft: JobSearchSchema.optional(),
})

const CreatedJobSearchIdSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
})

const ContentSchema = z.object({ content: z.string() })

const VacancyListResponseSchema = z.object({
  vacancies: z.array(VacancyWithStatusSchema),
  totalCount: z.number(),
  generatedAt: z.string(),
  latestCrawl: z.string(),
})
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/data/applicants.ts src/ui/data/job-searches.ts
git commit -m "refactor: update UI data layer for flat models and ID wrappers"
```

---

## Task 11: Update UI Hooks and Applicant Pages

**Files:**
- Modify: `src/ui/hooks/use-draft-wizard-initialization.ts`
- Modify: `src/ui/pages/applicant/views/editor-form.ts`
- Modify: `src/ui/pages/applicant/views/wizard.tsx`
- Modify: `src/ui/pages/applicant/views/wizard.test.tsx`

- [ ] **Step 1: Update `src/ui/hooks/use-draft-wizard-initialization.ts`**

Replace the file:

```ts
import { useEffect } from "react"

export function useDraftWizardInitialization<TSnapshot>({
  refetch,
  createDefaultSnapshot,
  setResolvedSnapshot,
  setPhase,
  skipResumePrompt = false,
}: DraftWizardInitializationOptions<TSnapshot>): void {
  useEffect(() => {
    async function initWizard() {
      const result = await refetch()
      const draft = result.data?.draft
      if (draft) {
        setResolvedSnapshot(draft)
        setPhase(skipResumePrompt ? "editing" : "resume-prompt")
      } else {
        setResolvedSnapshot(createDefaultSnapshot())
        setPhase("editing")
      }
    }

    void initWizard()
  }, [])
}

interface DraftWizardInitializationOptions<TSnapshot> {
  refetch: () => Promise<{
    data?: { draft?: TSnapshot | null } | undefined
  }>
  createDefaultSnapshot: () => TSnapshot
  setResolvedSnapshot: (snapshot: TSnapshot) => void
  setPhase: (phase: "resume-prompt" | "editing") => void
  skipResumePrompt?: boolean
}
```

- [ ] **Step 2: Update `src/ui/pages/applicant/views/editor-form.ts`**

Replace the file:

```ts
import { DEFAULT_APPLICANT } from "@/models/applicant"
import type {
  Address,
  Applicant,
  ApplicantCertification,
  ApplicantDisclose,
  ApplicantLanguage,
  ApplicantSkill,
} from "@/models/applicant"

export function toApplicantFormValues(
  applicant: Applicant,
): ApplicantFormValues {
  return {
    ...applicant,
    personal: {
      ...applicant.personal,
      hobbies: joinLines(applicant.personal.hobbies),
    },
    experience: applicant.experience.map((entry) => ({
      ...entry,
      highlights: joinLines(entry.highlights),
    })),
    education: applicant.education.map((entry) => ({
      ...entry,
      highlights: joinLines(entry.highlights),
    })),
    personalNotes: applicant.personalNotes,
  }
}

export function fromApplicantFormValues(form: ApplicantFormValues): Applicant {
  return {
    ...form,
    disclose: form.disclose ?? DEFAULT_APPLICANT.disclose,
    personal: {
      ...form.personal,
      hobbies: splitLines(form.personal.hobbies) ?? [],
    },
    experience: form.experience.map((entry) => ({
      ...entry,
      highlights: splitLines(entry.highlights),
    })),
    education: form.education.map((entry) => ({
      ...entry,
      highlights: splitLines(entry.highlights),
    })),
    personalNotes: form.personalNotes ?? "",
  }
}

export interface ApplicantFormValues {
  personal: ApplicantFormPersonal
  disclose?: ApplicantDisclose
  experience: ApplicantFormExperience[]
  education: ApplicantFormEducation[]
  skills: ApplicantSkill[]
  languages: ApplicantLanguage[]
  certifications: ApplicantCertification[]
  personalNotes: string
}

interface ApplicantFormExperience {
  role: string
  company: string
  startDate: string
  endDate: string
  location?: string
  discloseDates?: boolean
  highlights?: string
}

interface ApplicantFormEducation {
  institution: string
  course: string
  startDate?: string
  endDate?: string
  location?: string
  discloseDates?: boolean
  highlights?: string
}

interface ApplicantFormPersonal {
  name: string
  email?: string
  phone?: string
  birthdate?: string
  gender?: string
  address?: Address
  hobbies?: string
}

function joinLines(lines: string[] | undefined): string | undefined {
  return lines?.join("\n")
}

function splitLines(value: string | undefined): string[] | undefined {
  return value
    ?.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}
```

- [ ] **Step 3: Update `src/ui/pages/applicant/views/wizard.tsx`**

Replace `ApplicantDraftSnapshot` with `Applicant` throughout:

```tsx
import type { Applicant } from "@/models/applicant"
// ... remove ApplicantDraftSnapshot import
```

Update state and form types:

```tsx
  const [resolvedSnapshot, setResolvedSnapshot] = useState<
    Applicant | undefined
  >()

  // ...

  const form = useAutoSaveForm<ApplicantFormValues, Applicant>({
    // ...
  })
```

Update interface types:

```tsx
interface ApplicantWizardPageProperties {
  initialStep?: ApplicantWizardStep
  onStepChange?: (
    step: ApplicantWizardStep,
    snapshot: Applicant,
  ) => void
}

function canFinalizeApplicantWizard(snapshot: Applicant): boolean {
  return snapshot.personal.name.trim().length > 0
}

// ...

interface ApplicantWizardStepViewProperties {
  form: ReturnType<
    typeof useAutoSaveForm<ApplicantFormValues, Applicant>
  >
  step: ApplicantWizardStep
}

interface ApplicantWizardStepViewSharedProperties {
  form: ReturnType<
    typeof useAutoSaveForm<ApplicantFormValues, Applicant>
  >
  isLoading: boolean
  saveStatus: AutoSaveStatus
  useHeaderAutoSave?: boolean
}
```

- [ ] **Step 4: Update `src/ui/pages/applicant/views/wizard.test.tsx`**

Replace the mock setup:

```ts
const refetchDraft = vi.fn<() => Promise<{ data?: { draft?: unknown } }>>()
```

Update the blank draft test:

```ts
  it("starts from a blank non-meaningful draft", async () => {
    const user = userEvent.setup()
    const snapshot = createDefaultApplicantDraftSnapshot()

    expect(isMeaningfulApplicantDraftSnapshot(snapshot)).toBe(false)

    render(<ApplicantWizardPage />)

    await screen.findByLabelText("Name")
    await goToLastStep(user)

    expect(screen.getByRole("button", { name: "Fertigstellen" })).toBeDisabled()
  })
```

Update the resume prompt test:

```ts
  it("skips the draft resume prompt when first-start already resumed", async () => {
    const snapshot = createDefaultApplicantDraftSnapshot()
    snapshot.personal.name = "Ada Lovelace"
    refetchDraft.mockResolvedValue({
      data: { draft: snapshot },
    })
    // ... rest unchanged
  })
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/hooks/use-draft-wizard-initialization.ts src/ui/pages/applicant/views/
git commit -m "refactor: update applicant wizard for flat Applicant model"
```

---

## Task 12: Update UI Job-Search Pages and Views

**Files:**
- Modify: `src/ui/pages/job-search/layout.tsx`
- Modify: `src/ui/pages/job-search/views/config.tsx`
- Modify: `src/ui/pages/job-search/views/cover-letter.tsx`
- Modify: `src/ui/pages/job-search/views/wizard.tsx`
- Modify: `src/ui/pages/job-search/views/wizard.test.tsx`
- Modify: `src/ui/views/job-search/types.ts`
- Modify: `src/ui/views/job-search/search-config-view.tsx`

- [ ] **Step 1: Update `src/ui/pages/job-search/layout.tsx`**

Replace `useJobSearchLayoutData`:

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

- [ ] **Step 2: Update `src/ui/views/job-search/types.ts`**

Replace the file:

```ts
import type { SearchMode } from "@/models/job-search"

export interface JobSearchEditorConfigValue {
  searchTerm: string
  radiusKm: number
  searchMode: SearchMode
  sources: string[]
  maxResults?: number
  maxCommuteMinutes?: number
  freeText: string[]
}

export interface JobSearchCoverLetterValue {
  content: string
}

export interface SiteInfo {
  name: string
  supportedModes: string[]
}
```

- [ ] **Step 3: Update `src/ui/views/job-search/search-config-view.tsx`**

Remove the max distance input from `renderPreferencesSection`. Delete the entire `maxDistanceKm` input block, leaving only `maxCommuteMinutes` and the free text textarea. The section should now be:

```tsx
function renderPreferencesSection(
  value: JobSearchEditorConfigValue,
  _allSites: SiteInfo[],
  onUpdate: (value: JobSearchEditorConfigValue) => void,
): JSX.Element {
  return (
    <Card className="p-4 space-y-3">
      <SectionHeader>Praferenzen</SectionHeader>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Max. Fahrtzeit (Min.)"
          type="number"
          placeholder="Kein Limit"
          value={value.maxCommuteMinutes?.toString() ?? ""}
          onChange={(event) => {
            onUpdate({
              ...value,
              maxCommuteMinutes: parseOptionalNumber(event.target.value),
            })
          }}
        />
      </div>
      <Textarea
        label="Freitextkriterien (eine pro Zeile)"
        rows={4}
        value={value.freeText.join("\n")}
        onChange={(event) => {
          onUpdate({
            ...value,
            freeText: splitLines(event.target.value),
          })
        }}
      />
    </Card>
  )
}
```

- [ ] **Step 4: Update `src/ui/pages/job-search/views/config.tsx`**

Replace the entire file:

```tsx
import { useParams } from "react-router"
import type { UseFormSetValue } from "react-hook-form"
import { useJobSearch, useUpdateJobSearch, useSiteListView } from "@/ui/data"
import { useAutoSaveForm } from "@/ui/hooks"
import type { SearchMode } from "@/models/job-search"
import { SearchSource } from "@/models/job-search"
import { PageHeader, Loading } from "@/ui/components"
import { useAutoSaveHeader } from "@/ui/layout"
import {
  JobSearchSearchConfigView,
  splitLines,
  stringifyOptionalNumber,
} from "@/ui/views"
import type { JobSearch } from "@/models/job-search"
import type { JobSearchEditorConfigValue } from "@/ui/views"

export default function JobSearchConfig() {
  const { id = "" } = useParams<{ id: string }>()
  const { data, isLoading } = useJobSearch(id)
  const update = useUpdateJobSearch(id)
  const sitesQuery = useSiteListView()

  const { setValue, watch, saveStatus } = useAutoSaveForm({
    queryResult: { data, isLoading },
    formOptions: { defaultValues: DEFAULT_FORM_VALUES },
    toFormValues: toConfigFormValues,
    onSave: async (form: ConfigFormValues) => {
      if (!data) throw new Error("Job search data not loaded")
      await update.mutateAsync(fromConfigFormValues(data.jobSearch, form))
    },
  })

  useAutoSaveHeader(saveStatus)

  const selectedSites = watch("sources")
  const selectedMode = watch("searchMode")

  if (isLoading) return <Loading />
  if (!data) return <div>Jobsuche nicht gefunden</div>

  const allSites = sitesQuery.data.sites

  return (
    <div className="space-y-4">
      <PageHeader title="Suchkonfiguration" />
      <JobSearchSearchConfigView
        allSites={allSites}
        value={toEditorConfigValue(watch(), selectedMode, selectedSites)}
        onUpdate={(value) => applyEditorConfigValue(setValue, value)}
      />
    </div>
  )
}

const DEFAULT_FORM_VALUES: ConfigFormValues = {
  searchTerm: "",
  radiusKm: 30,
  searchMode: "employment",
  sources: [],
  maxResults: "",
  maxCommuteMinutes: "",
  freeText: "",
}

interface ConfigFormValues {
  searchTerm: string
  radiusKm: number
  searchMode: SearchMode
  sources: string[]
  maxResults: string
  maxCommuteMinutes: string
  freeText: string
}

function toConfigFormValues(jobSearch: JobSearch): ConfigFormValues {
  return {
    searchTerm: jobSearch.searchTerm,
    radiusKm: jobSearch.radiusKm,
    searchMode: jobSearch.mode,
    sources: jobSearch.sources.map((s) => s.value),
    maxResults:
      jobSearch.maxResultsPerSource === 0
        ? ""
        : String(jobSearch.maxResultsPerSource),
    maxCommuteMinutes:
      jobSearch.maxCommuteMinutes === 0
        ? ""
        : String(jobSearch.maxCommuteMinutes),
    freeText: jobSearch.notes,
  }
}

function fromConfigFormValues(
  jobSearch: JobSearch,
  form: ConfigFormValues,
): JobSearch {
  return {
    ...jobSearch,
    searchTerm: form.searchTerm,
    radiusKm: Number(form.radiusKm),
    mode: form.searchMode,
    sources: form.sources.map(SearchSource),
    maxResultsPerSource: parseOptionalNumber(form.maxResults) ?? 0,
    maxCommuteMinutes: parseOptionalNumber(form.maxCommuteMinutes) ?? 0,
    notes: form.freeText,
  }
}

function toEditorConfigValue(
  form: ConfigFormValues,
  selectedMode: SearchMode,
  selectedSites: string[],
): JobSearchEditorConfigValue {
  return {
    searchTerm: form.searchTerm,
    radiusKm: Number(form.radiusKm),
    searchMode: selectedMode,
    sources: selectedSites,
    maxResults: parseOptionalNumber(form.maxResults),
    maxCommuteMinutes: parseOptionalNumber(form.maxCommuteMinutes),
    freeText: splitLines(form.freeText),
  }
}

function applyEditorConfigValue(
  setValue: UseFormSetValue<ConfigFormValues>,
  value: JobSearchEditorConfigValue,
): void {
  setValue("searchTerm", value.searchTerm, { shouldDirty: true })
  setValue("radiusKm", value.radiusKm, { shouldDirty: true })
  setValue("searchMode", value.searchMode, { shouldDirty: true })
  setValue("sources", value.sources, { shouldDirty: true })
  setValue("maxResults", stringifyOptionalNumber(value.maxResults), {
    shouldDirty: true,
  })
  setValue(
    "maxCommuteMinutes",
    stringifyOptionalNumber(value.maxCommuteMinutes),
    {
      shouldDirty: true,
    },
  )
  setValue("freeText", value.freeText.join("\n"), { shouldDirty: true })
}

function parseOptionalNumber(value: string): number | undefined {
  return value ? Number(value) : undefined
}
```

- [ ] **Step 5: Update `src/ui/pages/job-search/views/cover-letter.tsx`**

No changes needed. This page uses `useJobSearchCoverLetter` and `useUpdateJobSearchCoverLetter` which already work with the updated IPC handlers.

- [ ] **Step 6: Update `src/ui/pages/job-search/views/wizard.tsx`**

Replace the entire file:

```tsx
import { useEffect, useState } from "react"

import { useNavigate, useParams } from "react-router"

import type { UseFormSetValue, UseFormWatch } from "react-hook-form"

import {
  createDefaultJobSearchEditorSnapshot,
  isMeaningfulJobSearchEditorSnapshot,
} from "@/models/job-search"

import type { JobSearch } from "@/models/job-search"

import {
  useApiKeyStatus,
  useDeleteJobSearchDraft,
  useFinalizeJobSearchDraft,
  useGenerateDraftCoverLetter,
  useJobSearchDraft,
  useSaveJobSearchDraft,
  useSiteListView,
} from "@/ui/data"

import {
  useAutoSaveForm,
  createDraftWizardMutations,
  useDraftWizardLifecycle,
  useDraftWizardInitialization,
} from "@/ui/hooks"

import { DraftWizardPage, useFirstStartWizardContext } from "@/ui/layout"
import { WizardCancelChoicesModal } from "@/ui/components"

import { JobSearchCoverLetterView, JobSearchSearchConfigView } from "@/ui/views"

import type {
  JobSearchConfigSection,
  JobSearchEditorConfigValue,
} from "@/ui/views"

import { SearchSource } from "@/models/job-search"
import { splitLines } from "@/ui/views"

export default function JobSearchWizardPage({
  initialStep,
  onStepChange,
}: JobSearchWizardPageProperties = {}) {
  const { applicantId = "" } = useParams<{ applicantId: string }>()
  const navigate = useNavigate()
  const firstStart = useFirstStartWizardContext()
  const [phase, setPhase] = useState<Phase>("loading")
  const [step, setStep] = useState<WizardStep_>(initialStep ?? "parameters")
  const [resolvedSnapshot, setResolvedSnapshot] = useState<
    JobSearch | undefined
  >()

  const draftQuery = useJobSearchDraft(applicantId)
  const deleteDraft = useDeleteJobSearchDraft(applicantId)
  const saveDraft = useSaveJobSearchDraft(applicantId)
  const finalizeDraft = useFinalizeJobSearchDraft(applicantId)
  const generateDraftCoverLetter = useGenerateDraftCoverLetter(applicantId)
  const siteList = useSiteListView()
  const { hasLlmKey } = useApiKeyStatus()

  useDraftWizardInitialization({
    refetch: () => draftQuery.refetch(),
    createDefaultSnapshot: createDefaultJobSearchEditorSnapshot,
    setResolvedSnapshot,
    setPhase,
    skipResumePrompt: firstStart.skipDraftResume,
  })

  useEffect(() => {
    if (initialStep) {
      setStep(initialStep)
    }
  }, [initialStep])

  const isEditing = phase === "editing"

  const { setValue, watch } = useAutoSaveForm<WizardFormValues, JobSearch>({
    queryResult: {
      data: isEditing ? resolvedSnapshot : undefined,
      isLoading: !isEditing,
    },
    toFormValues: mapJobSearchToFormValues,
    onSave: async (formValues) => {
      await saveDraft.mutateAsync(mapFormValuesToJobSearch(formValues))
    },
    shouldFlushOnUnmount: () => lifecycle.shouldFlushOnUnmount(),
    formOptions: {
      defaultValues: mapJobSearchToFormValues(
        createDefaultJobSearchEditorSnapshot(),
      ),
    },
  })

  const currentSnapshot = mapFormValuesToJobSearch(watch())
  const lifecycle = useDraftWizardLifecycle({
    snapshot: currentSnapshot,
    isMeaningful: isMeaningfulJobSearchEditorSnapshot,
    ...createDraftWizardMutations({ saveDraft, deleteDraft, finalizeDraft }),
    onClose: () => {
      void navigate(`/applicants/${applicantId}`)
    },
    onFinished: ({ id }) => {
      if (firstStart.isInFirstStart) {
        firstStart.onPhaseComplete({ jobSearchId: id })
        return
      }

      void navigate(`/job-searches/${id}/vacancies`, {
        state: { startInitialUpdate: true },
      })
    },
  })

  function handleStepChange(nextStep: WizardStep_) {
    setStep(nextStep)
    onStepChange?.(nextStep, currentSnapshot)
  }

  return (
    <>
      <DraftWizardPage
        phase={phase}
        title="Neue Jobsuche erstellen"
        steps={
          [
            "parameters",
            "mode",
            "sources",
            "preferences",
            "cover-letter",
          ] as const
        }
        currentStep={step}
        stepLabels={STEP_LABELS}
        setStep={handleStepChange}
        onCancel={() => {
          void lifecycle.cancelWizard()
        }}
        onFinish={lifecycle.finishWizard}
        resumePrompt={{
          description:
            "Es gibt eine fortsetzbare Jobsuche im Entwurf. Möchten Sie fortsetzen oder neu starten?",
          discardLabel: "Entwurf verwerfen",
          onResume: () => setPhase("editing"),
          onDiscardAndStartFresh: async () => {
            await deleteDraft.mutateAsync()
            setResolvedSnapshot(createDefaultJobSearchEditorSnapshot())
            setPhase("editing")
          },
        }}
      >
        <JobSearchWizardStepView
          step={step}
          watch={watch}
          setValue={setValue}
          saveDraft={saveDraft}
          currentSnapshot={currentSnapshot}
          generateDraftCoverLetter={generateDraftCoverLetter}
          allSites={siteList.data.sites}
          hasLlmKey={hasLlmKey}
        />
      </DraftWizardPage>

      <WizardCancelChoicesModal
        open={lifecycle.showCancelChoices}
        onContinue={lifecycle.closeCancelChoices}
        onKeepDraft={lifecycle.keepDraftAndClose}
        onDiscard={lifecycle.discardDraftAndClose}
      />
    </>
  )
}

interface JobSearchWizardPageProperties {
  initialStep?: WizardStep_
  onStepChange?: (step: WizardStep_, snapshot: JobSearch) => void
}

type Phase = "loading" | "resume-prompt" | "editing"

const STEP_LABELS: Record<WizardStep_, string> = {
  parameters: "Parameter",
  mode: "Modus",
  sources: "Quellen",
  preferences: "Einstellungen",
  "cover-letter": "Anschreiben",
}

function mapJobSearchToFormValues(jobSearch: JobSearch): WizardFormValues {
  return {
    searchTerm: jobSearch.searchTerm,
    radiusKm: jobSearch.radiusKm,
    searchMode: jobSearch.mode,
    sources: jobSearch.sources.map((s) => s.value),
    maxResults:
      jobSearch.maxResultsPerSource === 0
        ? undefined
        : jobSearch.maxResultsPerSource,
    maxCommuteMinutes:
      jobSearch.maxCommuteMinutes === 0
        ? undefined
        : jobSearch.maxCommuteMinutes,
    freeText: splitLines(jobSearch.notes),
    coverLetterContent: jobSearch.coverLetter,
  }
}

function mapFormValuesToJobSearch(values: WizardFormValues): JobSearch {
  return {
    searchTerm: values.searchTerm,
    radiusKm: values.radiusKm,
    mode: values.searchMode,
    sources: values.sources.map(SearchSource),
    maxResultsPerSource: values.maxResults ?? 0,
    maxCommuteMinutes: values.maxCommuteMinutes ?? 0,
    notes: values.freeText.join("\n"),
    coverLetter: values.coverLetterContent,
  }
}

function JobSearchWizardStepView({
  step,
  watch,
  setValue,
  saveDraft,
  currentSnapshot,
  generateDraftCoverLetter,
  allSites,
  hasLlmKey,
}: JobSearchWizardStepViewProperties) {
  if (step === "cover-letter") {
    return (
      <JobSearchCoverLetterView
        value={{ content: watch("coverLetterContent") }}
        onUpdate={(value) => {
          setValue("coverLetterContent", value.content, { shouldDirty: true })
        }}
        onGenerate={() => {
          void saveDraft.mutateAsync(currentSnapshot).then(() =>
            generateDraftCoverLetter.mutate(undefined, {
              onSuccess: (result) => {
                setValue("coverLetterContent", result.content, {
                  shouldDirty: true,
                })
              },
            }),
          )
        }}
        isGenerating={generateDraftCoverLetter.isPending}
        isGenerateError={generateDraftCoverLetter.isError}
        llmAvailable={hasLlmKey}
        rows={18}
      />
    )
  }
  return (
    <JobSearchSearchConfigView
      sections={[step]}
      allSites={allSites}
      value={readConfigValue(watch)}
      onUpdate={(value) => applyWizardConfigValue(setValue, value)}
    />
  )
}

interface JobSearchWizardStepViewProperties {
  step: WizardStep_
  watch: UseFormWatch<WizardFormValues>
  setValue: UseFormSetValue<WizardFormValues>
  saveDraft: {
    mutateAsync: (snapshot: JobSearch) => Promise<unknown>
  }
  currentSnapshot: JobSearch
  generateDraftCoverLetter: GenerateDraftCoverLetter
  allSites: SiteEntry[]
  hasLlmKey: boolean
}

type WizardStep_ = JobSearchConfigSection | "cover-letter"

interface SiteEntry {
  name: string
  supportedModes: string[]
}

interface GenerateDraftCoverLetter {
  mutate: (
    variables: undefined,
    options: { onSuccess: (result: { content: string }) => void },
  ) => void
  isPending: boolean
  isError: boolean
}

function applyWizardConfigValue(
  setValue: UseFormSetValue<WizardFormValues>,
  configUpdate: JobSearchEditorConfigValue,
): void {
  const nextValues = mapConfigValueToFormValues(configUpdate)

  setValue("searchTerm", nextValues.searchTerm, { shouldDirty: true })
  setValue("radiusKm", nextValues.radiusKm, { shouldDirty: true })
  setValue("searchMode", nextValues.searchMode, { shouldDirty: true })
  setValue("sources", nextValues.sources, { shouldDirty: true })
  setValue("maxResults", nextValues.maxResults, { shouldDirty: true })
  setValue(
    "maxCommuteMinutes",
    nextValues.maxCommuteMinutes,
    {
      shouldDirty: true,
    },
  )
  setValue("freeText", nextValues.freeText, { shouldDirty: true })
}

function mapConfigValueToFormValues(
  value: JobSearchEditorConfigValue,
): Pick<
  WizardFormValues,
  | "searchTerm"
  | "radiusKm"
  | "searchMode"
  | "sources"
  | "maxResults"
  | "maxCommuteMinutes"
  | "freeText"
> {
  return {
    searchTerm: value.searchTerm,
    radiusKm: value.radiusKm,
    searchMode: value.searchMode,
    sources: value.sources,
    maxResults: stringifyOptionalNumber(value.maxResults),
    maxCommuteMinutes: stringifyOptionalNumber(value.maxCommuteMinutes),
    freeText: value.freeText,
  }
}

function mapFormValuesToConfigValue(
  value: WizardFormValues,
): JobSearchEditorConfigValue {
  return {
    searchTerm: value.searchTerm,
    radiusKm: value.radiusKm,
    searchMode: value.searchMode,
    sources: value.sources,
    maxResults: value.maxResults,
    maxCommuteMinutes: value.maxCommuteMinutes,
    freeText: value.freeText,
  }
}

function readConfigValue(
  watch: UseFormWatch<WizardFormValues>,
): JobSearchEditorConfigValue {
  return {
    searchTerm: watch("searchTerm"),
    radiusKm: watch("radiusKm"),
    searchMode: watch("searchMode"),
    sources: watch("sources"),
    maxResults: watch("maxResults"),
    maxCommuteMinutes: watch("maxCommuteMinutes"),
    freeText: watch("freeText"),
  }
}

interface WizardFormValues {
  searchTerm: string
  radiusKm: number
  searchMode: "employment" | "entry-level" | "apprenticeship"
  sources: string[]
  maxResults?: number
  maxCommuteMinutes?: number
  freeText: string[]
  coverLetterContent: string
}
```

- [ ] **Step 7: Update `src/ui/pages/job-search/views/wizard.test.tsx`**

Replace the mock setup and tests:

```ts
// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createDefaultJobSearchEditorSnapshot } from "@/models/job-search"
import { FirstStartWizardContext } from "@/ui/layout"
import { JobSearchWizardPage } from "@/ui/pages/job-search"
import { MemoryRouter } from "react-router"

const navigate = vi.fn()
const refetchDraft = vi.fn<() => Promise<{ data?: { draft?: unknown } }>>()
const deleteDraft = vi.fn<() => Promise<void>>()
const saveDraft = vi.fn<() => Promise<void>>()
const finalizeDraft =
  vi.fn<() => Promise<{ id: string; applicantId: string }>>()

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ applicantId: "ada" }),
  }
})

vi.mock("@/ui/data", async () => {
  const actual = await vi.importActual<typeof import("@/ui/data")>("@/ui/data")
  return {
    ...actual,
    useApiKeyStatus: () => ({
      hasLlmKey: true,
      hasMapsKey: true,
      isLoading: false,
    }),
    useJobSearchDraft: () => ({ refetch: refetchDraft }),
    useDeleteJobSearchDraft: () => ({ mutateAsync: deleteDraft }),
    useSaveJobSearchDraft: () => ({ mutateAsync: saveDraft }),
    useFinalizeJobSearchDraft: () => ({ mutateAsync: finalizeDraft }),
    useGenerateDraftCoverLetter: () => ({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    }),
    useSiteListView: () => ({
      data: { sites: [{ name: "Demo", supportedModes: ["employment"] }] },
    }),
  }
})

describe("JobSearchWizardPage in first-start flow", () => {
  beforeEach(() => {
    navigate.mockReset()
    refetchDraft.mockReset()
    deleteDraft.mockReset()
    saveDraft.mockReset()
    finalizeDraft.mockReset()

    refetchDraft.mockResolvedValue({ data: { draft: undefined } })
    deleteDraft.mockResolvedValue()
    saveDraft.mockResolvedValue()
    finalizeDraft.mockResolvedValue({ id: "search-1", applicantId: "ada" })
  })

  it("calls first-start completion instead of navigating after finish", async () => {
    const user = userEvent.setup()
    const onPhaseComplete = vi.fn()

    render(
      <MemoryRouter>
        <FirstStartWizardContext.Provider
          value={{
            isInFirstStart: true,
            onPhaseComplete,
            skipDraftResume: false,
          }}
        >
          <JobSearchWizardPage />
        </FirstStartWizardContext.Provider>
      </MemoryRouter>,
    )

    await screen.findByLabelText("Suchbegriff")
    await goToLastStep(user)
    await user.click(screen.getByRole("button", { name: "Fertigstellen" }))

    expect(onPhaseComplete).toHaveBeenCalledWith({ jobSearchId: "search-1" })
    expect(navigate).not.toHaveBeenCalledWith(
      "/job-searches/search-1/vacancies",
    )
  })

  it("skips the draft resume prompt when first-start already resumed", async () => {
    const snapshot = createDefaultJobSearchEditorSnapshot()
    snapshot.searchTerm = "Engineer"
    refetchDraft.mockResolvedValue({
      data: { draft: snapshot },
    })

    render(
      <MemoryRouter>
        <FirstStartWizardContext.Provider
          value={{
            isInFirstStart: true,
            onPhaseComplete: vi.fn(),
            skipDraftResume: true,
          }}
        >
          <JobSearchWizardPage />
        </FirstStartWizardContext.Provider>
      </MemoryRouter>,
    )

    expect(
      screen.queryByText(/Es gibt eine fortsetzbare Jobsuche im Entwurf/i),
    ).not.toBeInTheDocument()

    await waitFor(async () => {
      expect(await screen.findByLabelText("Suchbegriff")).toHaveValue(
        "Engineer",
      )
    })
  })
})

async function goToLastStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Weiter" }))
  await user.click(screen.getByRole("button", { name: "Weiter" }))
  await user.click(screen.getByRole("button", { name: "Weiter" }))
  await user.click(screen.getByRole("button", { name: "Weiter" }))
}
```

- [ ] **Step 8: Commit**

```bash
git add src/ui/pages/job-search/ src/ui/views/job-search/
git commit -m "refactor: update job-search UI for flat model and ID wrappers"
```

---

## Task 13: Update Service and Repository Tests

**Files:**
- Modify: `src/services/cover-letter-writer/cover-letter-writer.test.ts`
- Modify: `src/services/vacancy-enricher/vacancy-enricher.test.ts`
- Modify: `src/services/vacancy-scanner/enrich-queue.test.ts`

- [ ] **Step 1: Update `src/services/cover-letter-writer/cover-letter-writer.test.ts`**

Replace the file:

```ts
import { describe, expect, test, vi } from "vitest"
import { DEFAULT_APPLICANT } from "@/models/applicant"
import { createDefaultJobSearchEditorSnapshot } from "@/models/job-search"
import { createStubApplicantRepository } from "@/repositories/applicant"
import { createStubJobSearchRepository } from "@/repositories/job-search"
import { createStubVacancyRepository } from "@/repositories/vacancy"
import { CoverLetterWriter } from "."
import { ApplicantID } from "@/models/applicant"

describe("CoverLetterWriter", () => {
  test("generates cover letter from applicant draft", async () => {
    const applicantRepo = createStubApplicantRepository({
      "1": {
        ...DEFAULT_APPLICANT,
        personal: {
          ...DEFAULT_APPLICANT.personal,
          name: "Anna Tester",
        },
      },
    })
    const jobSearchRepo = createStubJobSearchRepository()
    const draft = createDefaultJobSearchEditorSnapshot()
    draft.searchTerm = "React"
    jobSearchRepo.saveDraft(ApplicantID("1"), draft)

    const llm = {
      complete: vi.fn().mockResolvedValue("generated letter"),
      completeJSON: vi.fn(),
      ping: vi.fn(),
    }

    const writer = new CoverLetterWriter(
      jobSearchRepo,
      applicantRepo,
      createStubVacancyRepository(),
      llm,
    )

    const result = await writer.generateFromDraft("1")

    expect(result.content).toBe("generated letter")
    expect(llm.complete).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Update `src/services/vacancy-enricher/vacancy-enricher.test.ts`**

Replace the constant definitions at the bottom:

```ts
const APPLICANT: Applicant = {
  personal: {
    name: "Test User",
    hobbies: [],
    address: { street: "Teststr. 1", zip: "10115", city: "Berlin" },
  },
  disclose: { birthdate: false, gender: false, address: false, hobbies: false },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
  personalNotes: "",
}

const JOB_SEARCH: JobSearch = {
  searchTerm: "",
  radiusKm: 30,
  mode: "employment",
  sources: [],
  maxResultsPerSource: 0,
  maxCommuteMinutes: 0,
  notes: "",
  coverLetter: "",
}

const CONTEXT: EnrichContext = {
  applicant: APPLICANT,
  jobSearch: JOB_SEARCH,
}
```

And update all `EnrichContext` usages in the file from `{ applicant: APPLICANT, preferences: PREFERENCES }` to `CONTEXT`.

- [ ] **Step 3: Update `src/services/vacancy-scanner/enrich-queue.test.ts`**

Replace the constant definitions at the bottom:

```ts
const APPLICANT: Applicant = {
  personal: { name: "Test", hobbies: [] },
  disclose: {
    birthdate: false,
    gender: false,
    address: false,
    hobbies: false,
  },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
  personalNotes: "",
}

const JOB_SEARCH: JobSearch = {
  searchTerm: "",
  radiusKm: 30,
  mode: "employment",
  sources: [],
  maxResultsPerSource: 0,
  maxCommuteMinutes: 0,
  notes: "",
  coverLetter: "",
}

const CONTEXT: EnrichContext = {
  applicant: APPLICANT,
  jobSearch: JOB_SEARCH,
}
```

And update all `EnrichContext` usages in the file.

- [ ] **Step 4: Commit**

```bash
git add src/services/cover-letter-writer/cover-letter-writer.test.ts src/services/vacancy-enricher/vacancy-enricher.test.ts src/services/vacancy-scanner/enrich-queue.test.ts
git commit -m "test: update service tests for flat JobSearch and ID wrappers"
```

---

## Task 14: Delete Old Files and Cleanup

**Files:**
- Delete: `src/utils/id.ts`
- Delete: `src/utils/id.test.ts`
- Modify: `src/utils/index.ts`

- [ ] **Step 1: Delete `src/utils/id.ts` and `src/utils/id.test.ts`**

```bash
rm src/utils/id.ts src/utils/id.test.ts
```

- [ ] **Step 2: Update `src/utils/index.ts`**

Remove the `createUniqueDerivedId` export:

```ts
export { extractJsonLd } from "./json-ld.js"
export { joinNormalizedText, normalizeOptionalText } from "./normalize.js"
export { isRecord, stringField } from "./reflection.js"
export { setupTemporaryDatabaseDirectory } from "./test-utilities.js"
export { Database, Statement } from "./database.js"
export { HttpStub } from "./http-stub.js"
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/index.ts
git rm src/utils/id.ts src/utils/id.test.ts
git commit -m "chore: delete src/utils/id.ts and id.test.ts"
```

---

## Task 15: Run Verification

- [ ] **Step 1: Auto-fix lint and formatting**

Run: `npm run fix`

Expected: Pass or report only issues that require manual intervention.

- [ ] **Step 2: Run full test suite**

Run: `npm test:all`

Expected: All tests pass.

- [ ] **Step 3: Commit any auto-fix changes**

```bash
git add -A
git commit -m "chore: lint fixes"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Delete `src/utils/id.ts` — Task 14
- [x] Remove `id` from `Applicant` — Task 2
- [x] Remove `id`/`applicantId` from `JobSearch`, flatten, add `coverLetter` — Task 3
- [x] Introduce `ApplicantID` and `JobSearchID` wrappers — Task 1
- [x] Redesign repository interfaces — Task 4
- [x] Move cover letter methods to `VacancyRepository` — Task 7
- [x] Delete separate draft tables, use sentinels — Tasks 5, 6
- [x] Delete `ApplicantDraft`, `JobSearchDraft`, etc. from models — Tasks 2, 3
- [x] SQLite schema migration — Task 5
- [x] IPC changes — Task 9
- [x] UI data layer changes — Task 10
- [x] Service changes — Task 8

**Placeholder scan:** No TODOs, TBDs, or incomplete steps found.

**Type consistency:** `ApplicantID`, `JobSearchID`, `SearchSource` wrappers are used consistently across all tasks. `JobSearch` field names (`searchTerm`, `radiusKm`, `mode`, `sources`, `maxResultsPerSource`, `maxCommuteMinutes`, `notes`, `coverLetter`) match between model, schema, resolve, repos, services, IPC, and UI.
