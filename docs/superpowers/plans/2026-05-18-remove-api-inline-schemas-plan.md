# Implementation Plan: Remove `src/api/` and Eliminate Inline/Duplicated Zod Schemas

**Design reference:** `docs/superpowers/specs/2026-05-18-remove-api-inline-schemas-design.md`

**Goal:** Delete `src/api/`, move domain schemas into `src/models/<domain>/`, move UI wrappers into `src/ui/data/*.ts`, move shared utility schemas into `src/utils/schemas.ts`, remove outgoing `.parse()` calls from `app/` IPC handlers, and extract remaining inline schemas to module-level named constants.

**Verification strategy:** After each batch of file changes, run `npm run fix` to verify imports and types. After all changes, run `npm test:all`.

---

## Task 1: Create `src/utils/schemas.ts` and extract `DataColumnSchema` in `src/utils/database.ts`

**Files:**
- Create: `src/utils/schemas.ts`
- Modify: `src/utils/database.ts`

### Step 1: Create utility schemas file

```ts
import { z } from "zod"

export const OkSchema = z.object({ ok: z.literal(true) })

export const CreatedIdSchema = z.object({ id: z.string() })

export const DeletedIdSchema = z.object({ deleted: z.string() })
```

### Step 2: Extract inline schema in `src/utils/database.ts`

Replace the inline `z.object({ data: z.string() })` in `getJsonData` with a module-level constant.

```ts
const DataColumnSchema = z.object({ data: z.string() })
```

Then replace the body of `getJsonData`:

```ts
  getJsonData(...parameters: SqlValue[]): unknown {
    const row = this.inner.get(...parameters)
    if (row === undefined) return undefined
    return JSON.parse(DataColumnSchema.parse(row).data)
  }
```

### Step 3: Verify

Run:
```bash
npm run fix
```
Expected: clean exit (no errors).

### Step 4: Commit

```bash
git add src/utils/schemas.ts src/utils/database.ts
git commit -m "feat: add shared utility schemas and extract DataColumnSchema"
```

---

## Task 2: Create `src/models/applicant/schemas.ts` and update `src/models/applicant/index.ts`

**Files:**
- Create: `src/models/applicant/schemas.ts`
- Modify: `src/models/applicant/index.ts`

### Step 1: Create applicant schemas

```ts
import { z } from "zod"

export const ApplicantPersonalSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  birthdate: z.string().optional(),
  gender: z.string().optional(),
  address: z
    .object({
      street: z.string(),
      zip: z.string(),
      city: z.string(),
    })
    .optional(),
  hobbies: z.array(z.string()),
})

export const ApplicantExperienceSchema = z.object({
  role: z.string(),
  company: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string().optional(),
  discloseDates: z.boolean().optional(),
  highlights: z.array(z.string()).optional(),
})

export const ApplicantEducationSchema = z.object({
  institution: z.string(),
  course: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  discloseDates: z.boolean().optional(),
  highlights: z.array(z.string()).optional(),
})

export const ApplicantSkillSchema = z.object({
  name: z.string(),
})

export const ApplicantLanguageSchema = z.object({
  language: z.string(),
  level: z.string(),
})

export const ApplicantCertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
  discloseDates: z.boolean().optional(),
  description: z.string().optional(),
})

export const ApplicantDiscloseSchema = z.object({
  birthdate: z.boolean(),
  gender: z.boolean(),
  address: z.boolean(),
  hobbies: z.boolean(),
})

export const ApplicantSchema = z.object({
  id: z.string(),
  personal: ApplicantPersonalSchema,
  disclose: ApplicantDiscloseSchema,
  experience: z.array(ApplicantExperienceSchema),
  education: z.array(ApplicantEducationSchema),
  skills: z.array(ApplicantSkillSchema),
  languages: z.array(ApplicantLanguageSchema),
  certifications: z.array(ApplicantCertificationSchema),
  personalNotes: z.array(z.string()).optional(),
})

export const ApplicantInfoSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
})
```

### Step 2: Export schemas from index

Append to `src/models/applicant/index.ts`:

```ts
export * from "./schemas.js"
```

### Step 3: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 4: Commit

```bash
git add src/models/applicant/schemas.ts src/models/applicant/index.ts
git commit -m "feat: move applicant schemas to models/applicant"
```

---

## Task 3: Create `src/models/vacancy/schemas.ts` and update `src/models/vacancy/index.ts`

**Files:**
- Create: `src/models/vacancy/schemas.ts`
- Modify: `src/models/vacancy/index.ts`

### Step 1: Create vacancy schemas

```ts
import { z } from "zod"

export const VacancyContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
})

export const VacancySourceSchema = z.object({
  site: z.string(),
  url: z.string(),
})

export const CommuteInfoSchema = z.object({
  distance: z.string(),
  durations: z.object({
    morning: z.number(),
    day: z.number(),
    evening: z.number(),
  }),
  fetchedAt: z.string(),
})

export const ActivitySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("found"),
    date: z.string(),
    notes: z.string().optional(),
    site: z.string(),
    url: z.string(),
    description: z.string().optional(),
    contact: VacancyContactSchema.optional(),
  }),
  z.object({
    type: z.literal("not-found"),
    date: z.string(),
    notes: z.string().optional(),
    site: z.string(),
  }),
  z.object({
    type: z.literal("applied"),
    date: z.string(),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal("invited"),
    date: z.string(),
    notes: z.string().optional(),
    interviewDate: z.string(),
  }),
  z.object({
    type: z.literal("interviewed"),
    date: z.string(),
    notes: z.string().optional(),
    outcome: z.enum(["completed", "cancelled"]),
  }),
  z.object({
    type: z.literal("offered"),
    date: z.string(),
    notes: z.string().optional(),
    startDate: z.string().optional(),
    salary: z.string().optional(),
  }),
  z.object({
    type: z.literal("rejected"),
    date: z.string(),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal("not-interested"),
    date: z.string(),
    notes: z.string().optional(),
  }),
])

export const VacancyDTOSchema = z.object({
  hash: z.string(),
  title: z.string(),
  company: z.string(),
  urls: z.array(z.string()),
  addresses: z.array(z.string()),
  contact: VacancyContactSchema,
  startDate: z.string(),
  description: z.string(),
  enriched: z.boolean(),
  enrichmentDirty: z.boolean(),
  summary: z.string(),
  matchScore: z.enum(["very-bad", "bad", "ok", "good", "excellent"]),
  commute: z.record(z.string(), CommuteInfoSchema),
  activityHistory: z.array(ActivitySchema),
  active: z.boolean(),
})

export const VacancyWithStatusSchema = VacancyDTOSchema.extend({
  status: z.enum([
    "new",
    "gone",
    "renewed",
    "applied",
    "ignored",
    "invited",
    "interviewed",
    "offered",
    "rejected",
    "not-interested",
  ]),
  sources: z.array(VacancySourceSchema),
})
```

### Step 2: Export schemas from index

Append to `src/models/vacancy/index.ts`:

```ts
export * from "./schemas.js"
```

### Step 3: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 4: Commit

```bash
git add src/models/vacancy/schemas.ts src/models/vacancy/index.ts
git commit -m "feat: move vacancy schemas to models/vacancy"
```

---

## Task 4: Create `src/models/job-search/schemas.ts` and update `src/models/job-search/index.ts`

**Files:**
- Create: `src/models/job-search/schemas.ts`
- Modify: `src/models/job-search/index.ts`

### Step 1: Create job-search schemas

```ts
import { z } from "zod"

export const SearchParametersSchema = z.object({
  searchTerm: z.string(),
  radiusKm: z.number(),
  searchMode: z.enum(["employment", "entry-level", "apprenticeship"]),
  sources: z.array(z.string()),
  maxResults: z.number().optional(),
})

export const SearchPreferencesSchema = z.object({
  maxDistanceKm: z.number().optional(),
  maxCommuteMinutes: z.number().optional(),
  freeText: z.array(z.string()),
})

export const JobSearchSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
  params: SearchParametersSchema,
  preferences: SearchPreferencesSchema,
})

export const JobSearchEditorSnapshotSchema = z.object({
  params: SearchParametersSchema,
  preferences: SearchPreferencesSchema,
  coverLetterContent: z.string(),
})

export const JobSearchDraftSchema = z.object({
  applicantId: z.string(),
  snapshot: JobSearchEditorSnapshotSchema,
  meaningful: z.boolean(),
})

export const JobSearchInfoSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
  searchTerm: z.string(),
})
```

### Step 2: Export schemas from index

Append to `src/models/job-search/index.ts`:

```ts
export * from "./schemas.js"
```

### Step 3: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 4: Commit

```bash
git add src/models/job-search/schemas.ts src/models/job-search/index.ts
git commit -m "feat: move job-search schemas to models/job-search"
```

---

## Task 5: Create `src/models/setup/schemas.ts` and update `src/models/setup/index.ts`

**Files:**
- Create: `src/models/setup/schemas.ts`
- Modify: `src/models/setup/index.ts`

### Step 1: Create setup schemas

```ts
import { z } from "zod"

export const AppSetupStateSchema = z.object({
  completed: z.boolean(),
  lastPhase: z.enum(["settings", "applicant", "job-search"]).optional(),
  lastStep: z.string().optional(),
  applicantId: z.string().optional(),
})
```

### Step 2: Export schemas from index

Append to `src/models/setup/index.ts`:

```ts
export * from "./schemas.js"
```

### Step 3: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 4: Commit

```bash
git add src/models/setup/schemas.ts src/models/setup/index.ts
git commit -m "feat: move setup schemas to models/setup"
```

---

## Task 6: Create `src/models/config/schemas.ts` and update `src/models/config/index.ts`

**Files:**
- Create: `src/models/config/schemas.ts`
- Modify: `src/models/config/index.ts`

### Step 1: Create config schemas

```ts
import { z } from "zod"

export const LlmProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
})

export const CommuteProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  instructions: z.string(),
})

export const LlmModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
  }),
})

export const ResolvedConfigSchema = z.object({
  provider: z.enum(["openrouter", "requesty"]),
  assessmentModel: z.string(),
  coverLetterModel: z.string(),
  consultationModel: z.string(),
})
```

### Step 2: Export schemas from index

Append to `src/models/config/index.ts`:

```ts
export * from "./schemas.js"
```

### Step 3: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 4: Commit

```bash
git add src/models/config/schemas.ts src/models/config/index.ts
git commit -m "feat: move config schemas to models/config"
```

---

## Task 7: Create `src/models/secrets/schemas.ts` and update `src/models/secrets/index.ts`

**Files:**
- Create: `src/models/secrets/schemas.ts`
- Modify: `src/models/secrets/index.ts`

### Step 1: Create secrets schemas

```ts
import { z } from "zod"

export const MaskedSecretSchema = z.object({
  masked: z.string(),
  isSet: z.boolean(),
})

export const MaskedSecretsRecordSchema = z.record(MaskedSecretSchema)

export const SecretTestResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
})
```

### Step 2: Export schemas from index

Append to `src/models/secrets/index.ts`:

```ts
export * from "./schemas.js"
```

### Step 3: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 4: Commit

```bash
git add src/models/secrets/schemas.ts src/models/secrets/index.ts
git commit -m "feat: move secrets schemas to models/secrets"
```

---

## Task 8: Update `src/repositories/vacancy/sqlite/index.ts`

**Files:**
- Modify: `src/repositories/vacancy/sqlite/index.ts`

### Step 1: Delete local schema duplicates and import from models

Delete these module-level declarations from the bottom of the file:

```ts
const VacancyContactSchema = z.object({...})
const CommuteInfoSchema = z.object({...})
const ActivitySchema = z.discriminatedUnion("type", [...])
const VacancyDTOSchema = z.object({...})
```

Add an import at the top:

```ts
import {
  VacancyDTOSchema,
} from "@/models/vacancy"
```

The existing `hydrateVacancy` function already references `VacancyDTOSchema` — no other changes needed in that function.

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/repositories/vacancy/sqlite/index.ts
git commit -m "refactor: import vacancy schemas from models, remove local duplicates"
```

---

## Task 9: Update `src/repositories/job-search/sqlite/index.ts`

**Files:**
- Modify: `src/repositories/job-search/sqlite/index.ts`

### Step 1: Replace `@/api` import with `@/models/job-search`

Replace:
```ts
import {
  ContentSchema,
  JobSearchSchema,
  JobSearchEditorSnapshotSchema,
} from "@/api"
```

With:
```ts
import {
  JobSearchSchema,
  JobSearchEditorSnapshotSchema,
} from "@/models/job-search"
```

### Step 2: Replace `ContentSchema` usage with a local private schema

Add a module-level constant:

```ts
const CoverLetterRowSchema = z.object({ content: z.string() })
```

Replace the usage inside `loadApplicationCoverLetter`:

```ts
  loadApplicationCoverLetter(jobSearchId: string, vacancyHash: string): string {
    const raw = this.loadCoverLetterStmt.get(jobSearchId, vacancyHash)
    if (raw === undefined) return ""
    return CoverLetterRowSchema.parse(raw).content
  }
```

### Step 3: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 4: Commit

```bash
git add src/repositories/job-search/sqlite/index.ts
git commit -m "refactor: import job-search schemas from models, replace ContentSchema with local row schema"
```

---

## Task 10: Update `src/repositories/applicant/sqlite/index.ts`

**Files:**
- Modify: `src/repositories/applicant/sqlite/index.ts`

### Step 1: Replace `@/api` import with `@/models/applicant`

Replace:
```ts
import { ApplicantSchema } from "@/api"
```

With:
```ts
import { ApplicantSchema } from "@/models/applicant"
```

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/repositories/applicant/sqlite/index.ts
git commit -m "refactor: import applicant schema from models"
```

---

## Task 11: Update `src/app/ipc-applicants.ts`

**Files:**
- Modify: `src/app/ipc-applicants.ts`

### Step 1: Replace imports and remove outgoing `.parse()` calls

Replace the entire file content with:

```ts
import { ApplicantSchema } from "@/models/applicant"
import type { ApplicantDraftSnapshot } from "@/models/applicant"
import type { AppServices } from "."
import type { IpcHandle } from "./ipc-handlers.js"

export function registerApplicantsHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("applicants:list", () => ({
    applicants: services.applicantRepo.list(),
  }))
  handle("applicants:create", (name: string) => {
    const id = services.applicantRepo.create(name)
    return { id }
  })
  handle("applicants:load", (id: string) => services.applicantRepo.load(id))
  handle("applicants:save", (id: string, data: unknown) => {
    const validated = ApplicantSchema.parse(data)
    services.applicantRepo.save(id, validated)
    return { ok: true as const }
  })
  handle("applicants:delete", (id: string) => {
    services.applicantRepo.delete(id)
    return { deleted: id }
  })
  handle("applicants:draft:load", () => ({
    draft: services.applicantRepo.loadDraft(),
  }))
  handle("applicants:draft:save", (draft: ApplicantDraftSnapshot) => {
    services.applicantRepo.saveDraft(draft)
    return { ok: true as const }
  })
  handle("applicants:draft:delete", () => {
    services.applicantRepo.deleteDraft()
    return { ok: true as const }
  })
  handle("applicants:draft:finalize", () => {
    const id = services.applicantRepo.finalizeDraft()
    return { id }
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

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/app/ipc-applicants.ts
git commit -m "refactor: remove outgoing parse calls from ipc-applicants, import from models"
```

---

## Task 12: Update `src/app/ipc-settings.ts`

**Files:**
- Modify: `src/app/ipc-settings.ts`

### Step 1: Remove `@/api` import and all outgoing `.parse()` calls

Replace the entire file content with:

```ts
import { z } from "zod"
import type { AppServices } from "."
import type { ConfigKey } from "@/models/config"
import { resolveConfig } from "@/models/config/index.js"
import { getJobSiteInfos } from "@/plugins/job-site"
import { getLlmProviders, createLlmClientForPing } from "@/plugins/llm"
import { getCommuteProviders, createCommuteClient } from "@/plugins/commute"
import {
  LLM_SECRET_KEYS,
  COMMUTE_SECRET_KEYS,
  maskedSecretsFor,
  resolveSecretKey,
} from "./ipc-utilities.js"
import type { IpcHandle } from "./ipc-handlers.js"

export function registerSettingsHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("sites:list", () => ({ sites: getJobSiteInfos() }))

  handle("settings:llm:secrets", () =>
    maskedSecretsFor(LLM_SECRET_KEYS, services.secretsRepo.load()),
  )
  handle(
    "settings:llm:secret:save",
    async (providerId: string, value: string) =>
      saveProviderSecret(services, providerId, value, LLM_SECRET_KEYS),
  )
  handle("settings:llm:secret:clear", async (providerId: string) =>
    clearProviderSecret(services, providerId, LLM_SECRET_KEYS),
  )
  handle("settings:llm:secret:test", (providerId: string) =>
    testProviderSecret(services, providerId, LLM_SECRET_KEYS),
  )

  handle("settings:commute:secrets", () =>
    maskedSecretsFor(COMMUTE_SECRET_KEYS, services.secretsRepo.load()),
  )
  handle(
    "settings:commute:secret:save",
    async (providerId: string, value: string) =>
      saveProviderSecret(services, providerId, value, COMMUTE_SECRET_KEYS),
  )
  handle("settings:commute:secret:clear", async (providerId: string) =>
    clearProviderSecret(services, providerId, COMMUTE_SECRET_KEYS),
  )
  handle("settings:commute:secret:test", (providerId: string) =>
    testProviderSecret(services, providerId, COMMUTE_SECRET_KEYS),
  )

  handle("settings:llm-providers", () => getLlmProviders())
  handle("settings:commute-providers", () => getCommuteProviders())

  handle("settings:llm-models", async () =>
    services.modelRegistry.fetchModels(),
  )

  handle("settings:config:load", () =>
    resolveConfig(services.configRepo.load()),
  )
  handle("settings:config:save", async (key: ConfigKey, value: string) => {
    const config = services.configRepo.load()
    if (key === "provider") {
      config.provider = value === "requesty" ? "requesty" : "openrouter"
    } else {
      config[key] = value
    }
    await services.configRepo.save(config)
    services.rebuild()
    return { ok: true as const }
  })
}

async function saveProviderSecret(
  services: AppServices,
  providerId: string,
  value: string,
  mapping: typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS,
): Promise<{ ok: true }> {
  const key = resolveSecretKey(providerId, mapping)
  const secrets = services.secretsRepo.load()
  secrets[key] = value
  await services.secretsRepo.save(secrets)
  services.rebuild()
  return { ok: true }
}

async function clearProviderSecret(
  services: AppServices,
  providerId: string,
  mapping: typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS,
): Promise<{ ok: true }> {
  const key = resolveSecretKey(providerId, mapping)
  const secrets = services.secretsRepo.load()
  delete secrets[key]
  await services.secretsRepo.save(secrets)
  services.rebuild()
  return { ok: true }
}

async function testProviderSecret(
  services: AppServices,
  providerId: string,
  mapping: typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS,
): Promise<{ ok: boolean; error?: string }> {
  const key = resolveSecretKey(providerId, mapping)
  const secrets = services.secretsRepo.load()
  const value = secrets[key]
  if (!value) {
    return {
      ok: false,
      error: "Kein Schlüssel gesetzt",
    }
  }
  const ok =
    mapping === LLM_SECRET_KEYS
      ? await createLlmClientForPing(providerId, value).ping()
      : await createCommuteClient(providerId, value).ping()
  return { ok }
}
```

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/app/ipc-settings.ts
git commit -m "refactor: remove outgoing parse calls from ipc-settings, drop api dependency"
```

---

## Task 13: Update `src/app/ipc-vacancies.ts`

**Files:**
- Modify: `src/app/ipc-vacancies.ts`

### Step 1: Replace imports and remove outgoing `.parse()` calls (keep `VacancyWithStatusSchema`)

Replace the entire file content with:

```ts
import { VacancyWithStatusSchema } from "@/models/vacancy"
import type { Activity } from "@/models/vacancy"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { Applicant } from "@/models/applicant"
import type { SearchPreferences } from "@/models/job-search"
import type { AppServices } from "."
import { EnrichQueue } from "@/services/vacancy-scanner/index.js"
import type { IpcHandle, SafeSend } from "./ipc-handlers.js"

export function registerVacanciesHandlers(
  handle: IpcHandle,
  services: AppServices,
  safeSend: SafeSend,
): void {
  handle("job-searches:vacancies:list", (id: string) => {
    const output = services.vacancyRepo.loadAll(id)
    const vacancies = output.vacancies.map((v) => ({
      ...v,
      status: v.deriveStatus(),
      sources: v.deriveSources(),
    }))
    return {
      vacancies,
      totalCount: vacancies.length,
      generatedAt: output.generatedAt,
      latestCrawl: output.latestCrawl,
    }
  })
  handle(
    "job-searches:vacancies:seed",
    (id: string, vacancies: Vacancy[], latestCrawl: string) => {
      services.vacancyRepo.save(id, vacancies, latestCrawl)
      return { ok: true as const, count: vacancies.length }
    },
  )
  handle("job-searches:vacancies:load", (id: string, hash: string) => {
    const vacancy = services.vacancyRepo.findByHash(id, hash)
    if (!vacancy) {
      throw new Error(`Vacancy "${hash}" not found`)
    }
    return VacancyWithStatusSchema.parse({
      ...vacancy,
      status: vacancy.deriveStatus(),
      sources: vacancy.deriveSources(),
    })
  })
  handle(
    "job-searches:vacancies:add-activity",
    (id: string, hash: string, activity: Activity) => {
      services.vacancyRepo.addActivity(id, hash, activity)
      return { ok: true as const }
    },
  )

  handle(
    "job-searches:vacancies:cover-letter:load",
    (id: string, hash: string) => ({
      content: services.jobSearchRepo.loadApplicationCoverLetter(id, hash),
    }),
  )
  handle(
    "job-searches:vacancies:cover-letter:save",
    (id: string, hash: string, content: string) => {
      services.jobSearchRepo.saveApplicationCoverLetter(id, hash, content)
      return { ok: true as const }
    },
  )
  handle(
    "job-searches:vacancies:cover-letter:generate",
    async (id: string, hash: string) => ({
      content: await services.coverLetterWriter.generateForVacancy(id, hash),
    }),
  )

  handle("vacancies:re-enrich", async (jobSearchId: string, hash: string) => {
    const vacancy = services.vacancyRepo.findByHash(jobSearchId, hash)
    if (!vacancy) throw new Error(`Vacancy "${hash}" not found`)

    const jobSearch = services.jobSearchRepo.load(jobSearchId)
    const applicant = services.applicantRepo.load(jobSearch.applicantId)

    const dirtyVacancy = vacancy.with({ enrichmentDirty: true })
    const enriched = await services.vacancyEnricher.enrich(dirtyVacancy, {
      applicant,
      preferences: jobSearch.preferences,
    })

    const latestCrawl = services.vacancyRepo.loadAll(jobSearchId).latestCrawl
    const allVacancies = services.vacancyRepo.loadAll(jobSearchId).vacancies
    const updated = allVacancies.map((v) => (v.hash === hash ? enriched : v))
    services.vacancyRepo.save(jobSearchId, updated, latestCrawl)

    if (enriched.enrichmentDirty) {
      throw new Error(
        "Analyse fehlgeschlagen: Modell und API-Schlüssel in den Einstellungen überprüfen",
      )
    }

    return { ok: true as const }
  })

  handle("vacancies:enrich-unenriched", async (jobSearchId: string) => {
    if (batchEnrichAbortControllers.has(jobSearchId)) {
      throw new Error(`Batch enrichment already running for ${jobSearchId}`)
    }

    const abortController = new AbortController()
    batchEnrichAbortControllers.set(jobSearchId, abortController)

    const jobSearch = services.jobSearchRepo.load(jobSearchId)
    const applicant = services.applicantRepo.load(jobSearch.applicantId)
    const output = services.vacancyRepo.loadAll(jobSearchId)
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
        jobSearch.preferences,
        existingByHash,
        output.latestCrawl,
        safeSend,
        abortController.signal,
      )

      for (const vacancy of vacanciesNeedingEnrichment) {
        queue.submit(vacancy, vacancy.hash)
      }

      const aborted = await drainAndCheckAbort(queue)

      sendBatchEnrichDoneProgress(safeSend, jobSearchId, aborted)

      if (aborted) {
        return { count: 0, aborted: true }
      }

      const updatedVacancies =
        services.vacancyRepo.loadAll(jobSearchId).vacancies
      const anyStillDirty = updatedVacancies.some(
        (vacancy) => vacancy.enrichmentDirty,
      )
      if (anyStillDirty) {
        throw new Error(
          "Analyse fehlgeschlagen: Modell und API-Schlüssel in den Einstellungen überprüfen",
        )
      }

      return { count: vacanciesNeedingEnrichment.length }
    } catch (error) {
      sendBatchEnrichDoneProgress(safeSend, jobSearchId, true)
      throw error
    } finally {
      batchEnrichAbortControllers.delete(jobSearchId)
    }
  })

  handle("vacancies:enrich:abort", (jobSearchId: string) => {
    const controller = batchEnrichAbortControllers.get(jobSearchId)
    if (!controller) return { aborted: false }
    controller.abort()
    return { aborted: true }
  })
}

function createEnrichQueue(
  services: AppServices,
  jobSearchId: string,
  applicant: Applicant,
  preferences: SearchPreferences,
  existingByHash: Map<string, Vacancy>,
  latestCrawl: string,
  safeSend: SafeSend,
  signal: AbortSignal,
): EnrichQueue {
  return new EnrichQueue({
    enricher: services.vacancyEnricher,
    context: { applicant, preferences },
    onEnriched: (enriched, hash) => {
      existingByHash.set(hash, enriched)
      services.vacancyRepo.save(
        jobSearchId,
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
    onError: (hash, error) => {
      console.error(`Batch enrichment failed for "${hash}":`, error)
    },
    onProgress: (event) => {
      safeSend("job:progress", {
        jobSearchId,
        message: `Analysiere ${event.completed}/${event.total}`,
        phase: "enrich",
        owner: "batch",
        enrichProgress: event,
      })
    },
    signal,
  })
}

async function drainAndCheckAbort(queue: EnrichQueue): Promise<boolean> {
  try {
    await queue.drain()
    return false
  } catch (error) {
    if (isAbortError(error)) {
      return true
    }
    throw error
  }
}

function sendBatchEnrichDoneProgress(
  safeSend: SafeSend,
  jobSearchId: string,
  aborted: boolean,
): void {
  safeSend("job:progress", {
    jobSearchId,
    message: aborted ? "Analyse abgebrochen" : "Analyse abgeschlossen",
    phase: "done",
    source: "enrich",
    owner: "batch",
  })
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

const batchEnrichAbortControllers = new Map<string, AbortController>()
```

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/app/ipc-vacancies.ts
git commit -m "refactor: remove outgoing parse calls from ipc-vacancies, keep VacancyWithStatusSchema"
```

---

## Task 14: Update `src/app/ipc-setup.ts`

**Files:**
- Modify: `src/app/ipc-setup.ts`

### Step 1: Replace imports and remove outgoing `.parse()` calls

Replace the entire file content with:

```ts
import type { AppSetupState } from "@/models/setup"
import type { ConfigRepository } from "@/app/config"
import type { SecretsRepository } from "@/app/secrets"
import type { SetupRepository } from "@/app/setup"
import type { IpcHandle } from "./ipc-handlers.js"

export function registerSetupHandlers(
  handle: IpcHandle,
  services: SetupHandlerServices,
  controls: SetupHandlerControls,
): void {
  handle("setup:state:load", () => ({ state: services.setupRepo.load() }))
  handle("setup:state:save", async (update: Partial<AppSetupState>) =>
    services.setupRepo.save(update),
  )
  handle("setup:state:complete", async () => services.setupRepo.complete())
  handle("setup:clear-data", async () => clearAppData({ services, controls }))
  handle("app:close", () => {
    controls.closeApp()
    return { ok: true as const }
  })
}

export async function clearAppData({
  services,
  controls,
}: {
  services: SetupHandlerServices
  controls: SetupHandlerControls
}): Promise<{ ok: true }> {
  let failure: unknown

  controls.closeDatabase()

  try {
    controls.deleteDatabaseFiles()
    await services.configRepo.save({})
    await services.secretsRepo.save({})
    controls.deleteSecretsFile()
    await services.setupRepo.reset()
  } catch (error) {
    failure = error
  } finally {
    controls.reopenDatabase()
  }

  if (failure) {
    throw toError(failure)
  }

  return { ok: true }
}

interface SetupHandlerControls {
  closeDatabase: () => void
  deleteDatabaseFiles: () => void
  deleteSecretsFile: () => void
  reopenDatabase: () => void
  closeApp: () => void
}

interface SetupHandlerServices {
  configRepo: ConfigRepository
  secretsRepo: SecretsRepository
  setupRepo: SetupRepository
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
```

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/app/ipc-setup.ts
git commit -m "refactor: remove outgoing parse calls from ipc-setup"
```

---

## Task 15: Update `src/app/ipc-job-searches.ts`

**Files:**
- Modify: `src/app/ipc-job-searches.ts`

### Step 1: Replace imports and remove outgoing `.parse()` calls (keep incoming parses)

Replace the entire file content with:

```ts
import {
  JobSearchSchema,
  JobSearchEditorSnapshotSchema,
} from "@/models/job-search"
import type { SearchMode } from "@/models/job-search"
import type { AppServices } from "."
import type { IpcHandle } from "./ipc-handlers.js"

export function registerJobSearchesHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("job-searches:list", (applicantId?: string) => {
    const list = applicantId
      ? services.jobSearchRepo.listByApplicant(applicantId)
      : services.jobSearchRepo.list()
    return { jobSearches: list }
  })
  handle(
    "job-searches:create",
    (searchTerm: string, applicantId: string, searchMode?: SearchMode) => {
      const id = services.jobSearchRepo.create(
        searchTerm,
        applicantId,
        searchMode,
      )
      return { id, applicantId }
    },
  )
  handle("job-searches:load", (id: string) => services.jobSearchRepo.load(id))
  handle("job-searches:save", (id: string, data: unknown) => {
    const validated = JobSearchSchema.parse(data)
    services.jobSearchRepo.save(id, validated)
    return { ok: true as const }
  })
  handle("job-searches:delete", (id: string) => {
    services.jobSearchRepo.delete(id)
    return { deleted: id }
  })

  handle("job-searches:draft:load", (applicantId: string) => ({
    draft: services.jobSearchRepo.loadDraft(applicantId),
  }))
  handle("job-searches:draft:save", (applicantId: string, draft: unknown) => {
    const validated = JobSearchEditorSnapshotSchema.parse(draft)
    services.jobSearchRepo.saveDraft(applicantId, validated)
    return { ok: true as const }
  })
  handle("job-searches:draft:delete", (applicantId: string) => {
    services.jobSearchRepo.deleteDraft(applicantId)
    return { deleted: applicantId }
  })
  handle("job-searches:draft:finalize", (applicantId: string) => {
    const id = services.jobSearchRepo.finalizeDraft(applicantId)
    return { id, applicantId }
  })

  handle("job-searches:cover-letter:load", (id: string) => ({
    content: services.jobSearchRepo.loadApplicationCoverLetter(id, ""),
  }))
  handle("job-searches:cover-letter:save", (id: string, content: string) => {
    services.jobSearchRepo.saveApplicationCoverLetter(id, "", content)
    return { ok: true as const }
  })
  handle("job-searches:cover-letter:generate", async (id: string) => ({
    content: await services.coverLetterWriter.generate(id),
  }))
  handle(
    "job-searches:draft:cover-letter:generate",
    async (applicantId: string) => ({
      content: await services.coverLetterWriter.generateFromDraft(applicantId),
    }),
  )
}
```

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/app/ipc-job-searches.ts
git commit -m "refactor: remove outgoing parse calls from ipc-job-searches, keep incoming parses"
```

---

## Task 16: Update `src/ui/data/applicants.ts`

**Files:**
- Modify: `src/ui/data/applicants.ts`

### Step 1: Replace `@/api` imports with local wrappers and model imports

Replace the entire file content with:

```ts
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  Applicant,
  ApplicantDraftSnapshot,
  ResumeTemplate,
} from "@/models/applicant"
import { ApplicantSchema, ApplicantInfoSchema } from "@/models/applicant"
import { CreatedIdSchema } from "@/utils/schemas"
import { api } from "./internal/api"

const ApplicantDraftResponseSchema = z.object({
  draft: z
    .object({
      snapshot: ApplicantSchema,
      meaningful: z.boolean(),
    })
    .optional(),
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
    mutationFn: (snapshot: ApplicantDraftSnapshot) =>
      api().invoke("applicants:draft:save", snapshot),
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
```

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/ui/data/applicants.ts
git commit -m "refactor: move applicant response wrappers into ui/data/applicants"
```

---

## Task 17: Update `src/ui/data/settings.ts`

**Files:**
- Modify: `src/ui/data/settings.ts`

### Step 1: Replace `@/api` imports with model imports

Replace the `@/api` import block with:

```ts
import {
  LlmProviderInfoSchema,
  CommuteProviderInfoSchema,
  LlmModelSchema,
  ResolvedConfigSchema,
} from "@/models/config"
import {
  MaskedSecretsRecordSchema,
  SecretTestResultSchema,
} from "@/models/secrets"
```

Remove the `z` import if it becomes unused (it is still used for `z.array(...)`).

The rest of the file remains unchanged.

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/ui/data/settings.ts
git commit -m "refactor: import settings schemas from models, remove api dependency"
```

---

## Task 18: Update `src/ui/data/setup.ts`

**Files:**
- Modify: `src/ui/data/setup.ts`

### Step 1: Replace `@/api` imports with local wrappers and model imports

Replace the entire file content with:

```ts
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AppSetupStateSchema } from "@/models/setup"
import { OkSchema } from "@/utils/schemas"
import type { AppSetupState } from "@/models/setup"
import { api } from "./internal/api"

const SetupStateLoadResultSchema = z.object({
  state: AppSetupStateSchema.optional(),
})

export function useSetupState() {
  return useQuery({
    queryKey: ["setup-state"],
    queryFn: async () => {
      return SetupStateLoadResultSchema.parse(
        await api().invoke("setup:state:load"),
      )
    },
  })
}

export function useSaveSetupState() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (update: Partial<AppSetupState>) =>
      AppSetupStateSchema.parse(await api().invoke("setup:state:save", update)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["setup-state"] }),
  })
}

export function useCompleteSetupState() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () =>
      AppSetupStateSchema.parse(await api().invoke("setup:state:complete")),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["setup-state"] }),
  })
}

export function useClearAllData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () =>
      OkSchema.parse(await api().invoke("setup:clear-data")),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

export function closeApp(): Promise<{ ok: true }> {
  return api()
    .invoke("app:close")
    .then((result) => OkSchema.parse(result))
}
```

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/ui/data/setup.ts
git commit -m "refactor: move setup response wrappers into ui/data/setup"
```

---

## Task 19: Update `src/ui/data/job-searches.ts`

**Files:**
- Modify: `src/ui/data/job-searches.ts`

### Step 1: Replace `@/api` imports with local wrappers and model imports

Replace the entire file content with:

```ts
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import type {
  JobSearch,
  JobSearchEditorSnapshot,
  JobSearchInfo,
} from "@/models/job-search"

import {
  JobSearchSchema,
  JobSearchEditorSnapshotSchema,
  JobSearchInfoSchema,
  JobSearchDraftSchema,
} from "@/models/job-search"

import type {
  Activity,
  VacancyDTO,
  VacancySource,
  VacancyStatus,
} from "@/models/vacancy"

import { VacancyWithStatusSchema } from "@/models/vacancy"

import { api } from "./internal/api"

import { jobSearchQueryKeys, invalidateQuery } from "./job-search-query-keys"

const JobSearchListResponseSchema = z.object({
  jobSearches: z.array(JobSearchInfoSchema),
})

const JobSearchDraftResponseSchema = z.object({
  draft: JobSearchDraftSchema.optional(),
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
    queryFn: async () =>
      JobSearchSchema.parse(await api().invoke("job-searches:load", id)),
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
    mutationFn: (snapshot: JobSearchEditorSnapshot) =>
      api().invoke("job-searches:draft:save", applicantId, snapshot),
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
        await api().invoke(
          "job-searches:vacancies:cover-letter:load",
          id,
          hash,
        ),
      ),
    enabled: !!id && !!hash,
  })
}

export function useUpdateVacancyCoverLetter(id: string, hash: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api().invoke(
        "job-searches:vacancies:cover-letter:save",
        id,
        hash,
        content,
      ),
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
          "job-searches:vacancies:cover-letter:generate",
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

export type VacancyWithStatus = VacancyDTO & {
  status: VacancyStatus
  sources: VacancySource[]
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
```

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/ui/data/job-searches.ts
git commit -m "refactor: move job-search response wrappers into ui/data/job-searches"
```

---

## Task 20: Update `src/ui/data/job-search-crawl.ts`

**Files:**
- Modify: `src/ui/data/job-search-crawl.ts`

### Step 1: Replace `@/api` import with local wrapper

Replace the entire file content with:

```ts
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "./internal/api"
import { invalidateQuery, jobSearchQueryKeys } from "./job-search-query-keys"

const SiteInfoSchema = z.object({
  name: z.string(),
  supportedModes: z.array(z.string()),
})

const SitesListResponseSchema = z.object({
  sites: z.array(SiteInfoSchema),
})

export function useStartJobSearchCrawl(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api().invoke("job-searches:crawl:start", id),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(id)),
  })
}

export function useAbortJobSearchCrawl(id: string) {
  return useMutation({
    mutationFn: () => api().invoke("job-searches:crawl:abort", id),
  })
}

export function useSiteListView() {
  const query = useSites()
  return {
    ...query,
    data: query.data ?? EMPTY_SITE_LIST,
  }
}

function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async () =>
      SitesListResponseSchema.parse(await api().invoke("sites:list")),
  })
}

const EMPTY_SITE_LIST: { sites: SiteInfo[] } = { sites: [] }

type SiteInfo = { name: string; supportedModes: string[] }
```

### Step 2: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 3: Commit

```bash
git add src/ui/data/job-search-crawl.ts
git commit -m "refactor: move crawl response wrappers into ui/data/job-search-crawl"
```

---

## Task 21: Extract Inline Schemas in Plugins and Supporting Files

**Files:**
- Modify: `src/plugins/job-site/xing/index.ts`
- Modify: `src/plugins/job-site/dm/index.ts`
- Modify: `src/plugins/openai-compatible/index.ts`
- Modify: `src/plugins/commute/google-maps/index.ts`
- Modify: `src/app/secrets/encrypted.ts`

### Step 1: `xing/index.ts` — extract `JobPostingJsonLdSchema`

Replace the `asJobPosting` function with a module-level schema + function:

```ts
const JobPostingJsonLdSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  datePosted: z.string().optional(),
  hiringOrganization: z.object({ name: z.string().optional() }).optional(),
  jobLocation: z
    .union([
      z.object({
        address: z
          .object({
            streetAddress: z.string().optional(),
            postalCode: z.string().optional(),
            addressLocality: z.string().optional(),
          })
          .optional(),
      }),
      z.array(
        z.object({
          address: z
            .object({
              streetAddress: z.string().optional(),
              postalCode: z.string().optional(),
              addressLocality: z.string().optional(),
            })
            .optional(),
        }),
      ),
    ])
    .optional(),
})

function asJobPosting(value: unknown): JobPostingJsonLd | undefined {
  const result = JobPostingJsonLdSchema.safeParse(value)
  return result.success ? result.data : undefined
}
```

### Step 2: `dm/index.ts` — extract `JobPostingJsonLdSchema`

Apply the exact same replacement as in `xing/index.ts` (the schema shape is identical).

### Step 3: `openai-compatible/index.ts` — extract completion and model-list schemas

Add module-level constants:

```ts
const CompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().optional() }).optional(),
      }),
    )
    .optional(),
})

const ModelListResponseSchema = z.object({
  data: z.array(z.record(z.unknown())),
})
```

Replace the inline `z.object(...)` in `fetchCompletion` with:

```ts
    const json = CompletionResponseSchema.parse(
      JSON.parse(await response.text()),
    )
```

Replace the inline `z.object(...)` in `fetchModels` with:

```ts
      const data = ModelListResponseSchema.parse(
        JSON.parse(await response.text()),
      )
```

### Step 4: `google-maps/index.ts` — extract `DirectionsResponseSchema`

The file already has `DistanceMatrixResponseSchema` at module level. Add:

```ts
const DirectionsResponseSchema = z.object({ status: z.string() })
```

Replace the inline parse in `ping` with:

```ts
    const data = DirectionsResponseSchema.parse(
      JSON.parse(await response.text()),
    )
```

### Step 5: `app/secrets/encrypted.ts` — extract `SecretsFileSchema`

Add module-level constant:

```ts
const SecretsFileSchema = z.object({
  openrouterApiKey: z.string().optional(),
  requestyApiKey: z.string().optional(),
  googleMapsApiKey: z.string().optional(),
})
```

Replace the inline parse in `load` with:

```ts
        return resolveSecrets(
          SecretsFileSchema.parse(JSON.parse(decrypted)),
        )
```

### Step 6: Verify

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 7: Commit

```bash
git add src/plugins/job-site/xing/index.ts src/plugins/job-site/dm/index.ts src/plugins/openai-compatible/index.ts src/plugins/commute/google-maps/index.ts src/app/secrets/encrypted.ts
git commit -m "refactor: extract inline schemas to module-level named constants"
```

---

## Task 22: Delete `src/api/` and `src/app/schemas.ts`

**Files:**
- Delete: `src/api/applicants.ts`
- Delete: `src/api/vacancy.ts`
- Delete: `src/api/job-searches.ts`
- Delete: `src/api/settings.ts`
- Delete: `src/api/setup.ts`
- Delete: `src/api/crawl.ts`
- Delete: `src/api/ok-response.ts`
- Delete: `src/api/index.ts`
- Delete: `src/app/schemas.ts`

### Step 1: Remove files

```bash
rm -rf src/api
rm src/app/schemas.ts
```

### Step 2: Verify nothing references `@/api`

Run:
```bash
grep -rn "@/api" src/ --include="*.ts" --include="*.tsx"
```
Expected: **no output**.

### Step 3: Verify build and lint

Run:
```bash
npm run fix
```
Expected: clean exit.

### Step 4: Commit

```bash
git add -A
git commit -m "chore: delete src/api and src/app/schemas.ts"
```

---

## Task 23: Final Verification

**Files:**
- All modified files

### Step 1: Run linter and auto-fix

```bash
npm run fix
```
Expected: clean exit.

### Step 2: Run full test suite

```bash
npm test:all
```
Expected: all tests pass.

### Step 3: Run build

```bash
npx electron-vite build
```
Expected: clean build with no TypeScript errors.

### Step 4: Commit if any fixes were applied

```bash
git diff --quiet || git add -A && git commit -m "chore: fix lint after api removal"
```

---

## Plan Review

**Status:** Approved

**Spec Coverage Check:**
- ✅ Delete `src/api/` — Task 22
- ✅ Move domain schemas to `src/models/<domain>/` — Tasks 2–7
- ✅ Move UI wrappers to `src/ui/data/*.ts` — Tasks 16–20
- ✅ Move generic utility schemas to `src/utils/schemas.ts` — Task 1
- ✅ Remove outgoing `.parse()` from `app/` IPC handlers — Tasks 11–15
- ✅ Keep incoming `.parse()` for IPC arguments — preserved in Tasks 11, 13, 15
- ✅ Eliminate repo↔api duplication — Tasks 8–10
- ✅ Extract inline schemas to named constants — Tasks 1, 21
- ✅ Convert inline schemas in plugins — Task 21

**Placeholder Scan:** No placeholders, TODOs, or vague instructions found.

**Type Consistency:**
- `VacancyWithStatusSchema` defined in `models/vacancy/schemas.ts` and consumed by `app/ipc-vacancies.ts` and `ui/data/job-searches.ts`
- `ApplicantSchema` defined in `models/applicant/schemas.ts` and consumed by `app/ipc-applicants.ts`, `ui/data/applicants.ts`, and `repositories/applicant/sqlite/index.ts`
- `JobSearchSchema` / `JobSearchEditorSnapshotSchema` defined in `models/job-search/schemas.ts` and consumed by `app/ipc-job-searches.ts`, `ui/data/job-searches.ts`, and `repositories/job-search/sqlite/index.ts`
- `OkSchema` defined in `utils/schemas.ts` and consumed by `ui/data/setup.ts`
- `CreatedIdSchema` defined in `utils/schemas.ts` and consumed by `ui/data/applicants.ts`
