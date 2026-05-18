# Implementation Plan: Migrate from typia to Zod

## Task 1: Setup — dependencies, scaffolding, and architecture config

**Files:**
- Modify: `package.json`
- Create: `src/api/index.ts`
- Create: `src/api/settings.ts`
- Create: `src/api/applicants.ts`
- Create: `src/api/job-searches.ts`
- Create: `src/api/setup.ts`
- Create: `src/api/vacancy.ts`
- Create: `src/api/crawl.ts`
- Create: `src/api/progress.ts`
- Modify: `eslint.config.ts`

- [ ] **Step 1: Install zod and zod-to-json-schema**

```bash
npm install zod zod-to-json-schema
```

Expected: packages added to `package.json` and `node_modules/`.

- [ ] **Step 2: Create src/api/ barrel file**

Create `src/api/index.ts` (empty barrel — will be populated as schemas are added):

```ts
export * from "./settings.js"
export * from "./applicants.js"
export * from "./job-searches.js"
export * from "./setup.js"
export * from "./vacancy.js"
export * from "./crawl.js"
export * from "./progress.js"
```

- [ ] **Step 3: Create src/api/settings.ts with all settings IPC schemas**

```ts
import { z } from "zod"

export const LlmProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
})
export type LlmProviderInfoDTO = z.infer<typeof LlmProviderInfoSchema>

export const CommuteProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  instructions: z.string(),
})
export type CommuteProviderInfoDTO = z.infer<typeof CommuteProviderInfoSchema>

export const LlmModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
  }),
})
export type LlmModelDTO = z.infer<typeof LlmModelSchema>

export const MaskedSecretSchema = z.object({
  masked: z.string(),
  isSet: z.boolean(),
})
export type MaskedSecretDTO = z.infer<typeof MaskedSecretSchema>

export const MaskedSecretsRecordSchema = z.record(MaskedSecretSchema)

export const ResolvedConfigSchema = z.object({
  provider: z.enum(["openrouter", "requesty"]),
  assessmentModel: z.string(),
  coverLetterModel: z.string(),
  consultationModel: z.string(),
})
export type ResolvedConfigDTO = z.infer<typeof ResolvedConfigSchema>

export const SecretTestResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
})
export type SecretTestResultDTO = z.infer<typeof SecretTestResultSchema>

export const OkSchema = z.object({ ok: z.literal(true) })
```

- [ ] **Step 4: Create src/api/applicants.ts with all applicant IPC schemas**

```ts
import { z } from "zod"

const AddressSchema = z.object({
  street: z.string(),
  zip: z.string(),
  city: z.string(),
})

export const ApplicantPersonalSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  birthdate: z.string().optional(),
  gender: z.string().optional(),
  address: AddressSchema.optional(),
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

const ApplicantEducationSchema = z.object({
  institution: z.string(),
  course: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  discloseDates: z.boolean().optional(),
  highlights: z.array(z.string()).optional(),
})

const ApplicantSkillSchema = z.object({
  name: z.string(),
})

const ApplicantLanguageSchema = z.object({
  language: z.string(),
  level: z.string(),
})

const ApplicantCertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
  discloseDates: z.boolean().optional(),
  description: z.string().optional(),
})

const ApplicantDiscloseSchema = z.object({
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
export type ApplicantDTO = z.infer<typeof ApplicantSchema>

export const ApplicantInfoSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
})
export type ApplicantInfoDTO = z.infer<typeof ApplicantInfoSchema>

export const ApplicantDraftSchema = z.object({
  snapshot: ApplicantSchema,
  meaningful: z.boolean(),
})

export const ApplicantDraftResponseSchema = z.object({
  draft: ApplicantDraftSchema.optional(),
})

export const ApplicantListResponseSchema = z.object({
  applicants: z.array(ApplicantInfoSchema),
})

export const CreatedIdSchema = z.object({ id: z.string() })

export const DeletedIdSchema = z.object({ deleted: z.string() })

export const SavedOkSchema = z.object({ ok: z.literal(true) })

export const SuggestionsResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      searchTerm: z.string(),
      searchMode: z.enum(["employment", "entry-level", "apprenticeship"]),
      reason: z.string(),
    }),
  ),
})
```

- [ ] **Step 5: Create src/api/job-searches.ts with all job-search IPC schemas**

```ts
import { z } from "zod"

export const SearchParametersSchema = z.object({
  searchTerm: z.string(),
  radiusKm: z.number(),
  searchMode: z.enum(["employment", "entry-level", "apprenticeship"]),
  sources: z.array(z.string()),
  maxResults: z.number().optional(),
})
export type SearchParametersDTO = z.infer<typeof SearchParametersSchema>

export const SearchPreferencesSchema = z.object({
  maxDistanceKm: z.number().optional(),
  maxCommuteMinutes: z.number().optional(),
  freeText: z.array(z.string()),
})
export type SearchPreferencesDTO = z.infer<typeof SearchPreferencesSchema>

export const JobSearchSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
  params: SearchParametersSchema,
  preferences: SearchPreferencesSchema,
})
export type JobSearchDTO = z.infer<typeof JobSearchSchema>

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

export const JobSearchDraftResponseSchema = z.object({
  draft: JobSearchDraftSchema.optional(),
})

export const JobSearchInfoSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
  searchTerm: z.string(),
})
export type JobSearchInfoDTO = z.infer<typeof JobSearchInfoSchema>

export const JobSearchListResponseSchema = z.object({
  jobSearches: z.array(JobSearchInfoSchema),
})

export const CreatedJobSearchIdSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
})

export const ContentSchema = z.object({ content: z.string() })

export const DeletedTrueSchema = z.object({ deleted: z.literal(true) })
```

- [ ] **Step 6: Create src/api/setup.ts with all setup state IPC schemas**

```ts
import { z } from "zod"

export const AppSetupStateSchema = z.object({
  completed: z.boolean(),
  lastPhase: z.enum(["settings", "applicant", "job-search"]).optional(),
  lastStep: z.string().optional(),
  applicantId: z.string().optional(),
})
export type AppSetupStateDTO = z.infer<typeof AppSetupStateSchema>

export const SetupStateLoadResultSchema = z.object({
  state: AppSetupStateSchema.optional(),
})
export type SetupStateLoadResultDTO = z.infer<typeof SetupStateLoadResultSchema>

export const ClearDataOkSchema = z.object({ ok: z.literal(true) })
```

- [ ] **Step 7: Create src/api/vacancy.ts with vacancy IPC schemas**

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

export const CommuteDurationsSchema = z.object({
  morning: z.number(),
  day: z.number(),
  evening: z.number(),
})

export const CommuteInfoSchema = z.object({
  distance: z.string(),
  durations: CommuteDurationsSchema,
  fetchedAt: z.string(),
})

export const FoundActivitySchema = z.object({
  type: z.literal("found"),
  date: z.string(),
  notes: z.string().optional(),
  site: z.string(),
  url: z.string(),
  description: z.string().optional(),
  contact: VacancyContactSchema.optional(),
})

export const NotFoundActivitySchema = z.object({
  type: z.literal("not-found"),
  date: z.string(),
  notes: z.string().optional(),
  site: z.string(),
})

export const AppliedActivitySchema = z.object({
  type: z.literal("applied"),
  date: z.string(),
  notes: z.string().optional(),
})

export const InvitedActivitySchema = z.object({
  type: z.literal("invited"),
  date: z.string(),
  notes: z.string().optional(),
  interviewDate: z.string(),
})

export const InterviewedActivitySchema = z.object({
  type: z.literal("interviewed"),
  date: z.string(),
  notes: z.string().optional(),
  outcome: z.enum(["completed", "cancelled"]),
})

export const OfferedActivitySchema = z.object({
  type: z.literal("offered"),
  date: z.string(),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  salary: z.string().optional(),
})

export const RejectedActivitySchema = z.object({
  type: z.literal("rejected"),
  date: z.string(),
  notes: z.string().optional(),
})

export const NotInterestedActivitySchema = z.object({
  type: z.literal("not-interested"),
  date: z.string(),
  notes: z.string().optional(),
})

export const ActivitySchema = z.discriminatedUnion("type", [
  FoundActivitySchema,
  NotFoundActivitySchema,
  AppliedActivitySchema,
  InvitedActivitySchema,
  InterviewedActivitySchema,
  OfferedActivitySchema,
  RejectedActivitySchema,
  NotInterestedActivitySchema,
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
  commute: z.record(CommuteInfoSchema),
  activityHistory: z.array(ActivitySchema),
  active: z.boolean(),
})
export type VacancyDTODTO = z.infer<typeof VacancyDTOSchema>

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

export const VacancyListResponseSchema = z.object({
  vacancies: z.array(VacancyWithStatusSchema),
  totalCount: z.number(),
  generatedAt: z.string(),
  latestCrawl: z.string(),
})
```

- [ ] **Step 8: Create src/api/crawl.ts with crawl/sites IPC schemas**

```ts
import { z } from "zod"

export const SiteInfoSchema = z.object({
  name: z.string(),
  supportedModes: z.array(z.string()),
})

export const SitesListResponseSchema = z.object({
  sites: z.array(SiteInfoSchema),
})
```

- [ ] **Step 9: Create src/api/progress.ts with progress IPC schemas**

```ts
import { z } from "zod"

export const ProgressPayloadSchema = z.object({
  message: z.string(),
  phase: z
    .enum(["search", "scan", "enrich", "complete", "done"])
    .optional(),
  source: z.enum(["crawl", "enrich"]).optional(),
  owner: z.enum(["crawl", "batch"]).optional(),
  vacanciesUpdated: z.boolean().optional(),
  enrichProgress: z
    .object({ completed: z.number(), total: z.number() })
    .optional(),
  jobSearchId: z.string().optional(),
})
export type ProgressPayloadDTO = z.infer<typeof ProgressPayloadSchema>
```

- [ ] **Step 10: Add `api` layer to eslint architecture config**

In `eslint.config.ts`, add to the `architecture` object:

```ts
"api": {
  shared: true,
},
```

And modify the `app`, `app/*`, and `ui/data` entries to include `"api"` in their imports:

```ts
app: {
  imports: [
    "app/+",
    "utils/+",
    "models/+",
    "plugins/+",
    "services/+",
    "api",
  ],
},
"app/*": {
  imports: [
    "app/+",
    "utils/+",
    "models/+",
    "plugins/+",
    "services/+",
    "api",
  ],
},
"ui/data": {
  imports: ["models/+", "api"],
},
```

- [ ] **Step 11: Run fix to verify no lint violations**

```bash
npm run fix
```

Expected: passes with no errors from the new `api/` files.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json src/api/ eslint.config.ts
git commit -m "feat: add zod dependency, create src/api/ IPC schemas, update architecture config"
```

---

## Task 2: Migrate renderer-side IPC validation (src/ui/data/*.ts)

**Files:**
- Modify: `src/ui/data/settings.ts:17,109,125,170,202,220,228`
- Modify: `src/ui/data/applicants.ts:10,33,42,71,132,142`
- Modify: `src/ui/data/job-searches.ts:17,35,63,93,129,149,158,171,203,231,313,323`
- Modify: `src/ui/data/setup.ts:2,10,22,35,46,56`
- Modify: `src/ui/data/job-search-crawl.ts:2,33`

- [ ] **Step 1: Migrate src/ui/data/settings.ts**

Replace all `typia.assert<T>(...)` with the corresponding schema `.parse(...)`.

At line 17, replace `import typia from "typia"` with:

```ts
import { z } from "zod"
import {
  LlmProviderInfoSchema,
  CommuteProviderInfoSchema,
  MaskedSecretsRecordSchema,
  SecretTestResultSchema,
  ResolvedConfigSchema,
  LlmModelSchema,
} from "@/api"
```

Replace each `typia.assert<...>(await api().invoke(...))` call:

- Line 109: `typia.assert<LlmProviderInfo[]>(await api().invoke("settings:llm-providers"))` → `z.array(LlmProviderInfoSchema).parse(await api().invoke("settings:llm-providers"))`

- Line 125: `typia.assert<CommuteProviderInfo[]>(...)` → `z.array(CommuteProviderInfoSchema).parse(...)`

- Line 170: `typia.assert<Record<string, MaskedSecret>>(...)` → `MaskedSecretsRecordSchema.parse(...)`

- Line 202: `typia.assert<{ ok: boolean; error?: string }>(...)` → `SecretTestResultSchema.parse(...)`

- Line 220: `typia.assert<ResolvedConfig>(...)` → `ResolvedConfigSchema.parse(...)`

- Line 228: `typia.assert<LlmModel[]>(...)` → `z.array(LlmModelSchema).parse(...)`

- [ ] **Step 2: Migrate src/ui/data/applicants.ts**

Replace `import typia from "typia"` with:

```ts
import { z } from "zod"
import {
  ApplicantSchema,
  ApplicantDraftResponseSchema,
  CreatedIdSchema,
  SuggestionsResponseSchema,
  ApplicantListResponseSchema,
} from "@/api"
```

Replace each `typia.assert<...>(await api().invoke(...))`:

- Line 33: `typia.assert<Applicant>(await api().invoke("applicants:load", id))` → `ApplicantSchema.parse(await api().invoke("applicants:load", id))`

- Line 42: `typia.assert<{ draft?: ApplicantDraft }>(await api().invoke("applicants:draft:load"))` → `ApplicantDraftResponseSchema.parse(await api().invoke("applicants:draft:load"))`

- Line 71: `typia.assert<{ id: string }>(await api().invoke("applicants:draft:finalize"))` → `CreatedIdSchema.parse(await api().invoke("applicants:draft:finalize"))`

- Line 132: `typia.assert<{ suggestions: ConsultationSuggestion[] }>(await api().invoke("applicants:consult-searches", applicantId))` → `SuggestionsResponseSchema.parse(await api().invoke("applicants:consult-searches", applicantId))`

- Line 142: `typia.assert<{ applicants: ApplicantInfo[] }>(await api().invoke("applicants:list"))` → `ApplicantListResponseSchema.parse(await api().invoke("applicants:list"))`

- [ ] **Step 3: Migrate src/ui/data/job-searches.ts**

Replace `import typia from "typia"` with:

```ts
import { z } from "zod"
import {
  JobSearchSchema,
  JobSearchDraftResponseSchema,
  CreatedJobSearchIdSchema,
  ContentSchema,
  VacancyWithStatusSchema,
  JobSearchListResponseSchema,
  VacancyListResponseSchema,
} from "@/api"
```

Replace each `typia.assert<...>(...)`:

- Line 35: `typia.assert<JobSearch>(await api().invoke("job-searches:load", id))` → `JobSearchSchema.parse(await api().invoke("job-searches:load", id))`

- Line 63: `typia.assert<{ draft?: JobSearchDraft }>(await api().invoke("job-searches:draft:load", applicantId))` → `JobSearchDraftResponseSchema.parse(await api().invoke("job-searches:draft:load", applicantId))`

- Line 93: `typia.assert<{ id: string; applicantId: string }>(await api().invoke("job-searches:draft:finalize", applicantId))` → `CreatedJobSearchIdSchema.parse(await api().invoke("job-searches:draft:finalize", applicantId))`

- Lines 129, 149, 158, 171, 203: each `typia.assert<{ content: string }>(...)` → `ContentSchema.parse(...)`

- Line 231: `typia.assert<VacancyWithStatus>(await api().invoke("job-searches:vacancies:load", id, hash))` → `VacancyWithStatusSchema.parse(await api().invoke("job-searches:vacancies:load", id, hash))`

- Line 313: `typia.assert<{ jobSearches: JobSearchInfo[] }>(await api().invoke("job-searches:list", applicantId))` → `JobSearchListResponseSchema.parse(await api().invoke("job-searches:list", applicantId))`

- Line 323: `typia.assert<VacancyListResponse>(await api().invoke("job-searches:vacancies:list", id))` → `VacancyListResponseSchema.parse(await api().invoke("job-searches:vacancies:list", id))`

- [ ] **Step 4: Migrate src/ui/data/setup.ts**

Replace `import typia from "typia"` with:

```ts
import {
  SetupStateLoadResultSchema,
  AppSetupStateSchema,
  ClearDataOkSchema,
} from "@/api"
```

Replace each `typia.assert<...>(...)`:

- Line 10: `return typia.assert<SetupStateLoadResult>(await api().invoke("setup:state:load"))` → `return SetupStateLoadResultSchema.parse(await api().invoke("setup:state:load"))`

- Line 22: `typia.assert<AppSetupState>(await api().invoke("setup:state:save", update))` → `AppSetupStateSchema.parse(await api().invoke("setup:state:save", update))`

- Line 35: `typia.assert<AppSetupState>(await api().invoke("setup:state:complete"))` → `AppSetupStateSchema.parse(await api().invoke("setup:state:complete"))`

- Line 46: `typia.assert<{ ok: true }>(await api().invoke("setup:clear-data"))` → `ClearDataOkSchema.parse(await api().invoke("setup:clear-data"))`

- Line 56: `.then((result) => typia.assert<{ ok: true }>(result))` → `.then((result) => ClearDataOkSchema.parse(result))`  
  (also need `import { ClearDataOkSchema }` in the `closeApp` function's file or inline)

- [ ] **Step 5: Migrate src/ui/data/job-search-crawl.ts**

Replace `import typia from "typia"` with:

```ts
import { SitesListResponseSchema } from "@/api"
```

- Line 33: `typia.assert<{ sites: { name: string; supportedModes: string[] }[] }>(await api().invoke("sites:list"))` → `SitesListResponseSchema.parse(await api().invoke("sites:list"))`

- [ ] **Step 6: Run unit tests for the migrated files**

```bash
npm test
```

Expected: all existing tests pass. The schemas should validate the same data the typia assertions did.

- [ ] **Step 7: Commit**

```bash
git add src/ui/data/
git commit -m "refactor: replace typia assertions with Zod schemas in ui/data layer"
```

---

## Task 3: Add Zod validation to backend IPC handlers (src/app/ipc-*.ts)

**Files:**
- Modify: `src/app/ipc-settings.ts`
- Modify: `src/app/ipc-applicants.ts`
- Modify: `src/app/ipc-job-searches.ts`
- Modify: `src/app/ipc-vacancies.ts`
- Modify: `src/app/ipc-setup.ts`

Note: `src/app/ipc-crawl.ts` does not return IPC responses (it sends events via `safeSend`), so it needs no schema validation changes.

- [ ] **Step 1: Migrate src/app/ipc-settings.ts — validate outgoing responses**

Add imports after existing imports:

```ts
import { z } from "zod"
import {
  ResolvedConfigSchema,
  MaskedSecretsRecordSchema,
  LlmProviderInfoSchema,
  CommuteProviderInfoSchema,
  LlmModelSchema,
  SecretTestResultSchema,
  OkSchema,
  SitesListResponseSchema,
} from "@/api"
```

Wrap handler returns with `Schema.parse(...)`:

- `handle("sites:list", () => ({ sites: getJobSiteInfos() }))` →  
  `handle("sites:list", () => SitesListResponseSchema.parse({ sites: getJobSiteInfos() }))`

- `handle("settings:llm:secrets", () => maskedSecretsFor(...))` →  
  `handle("settings:llm:secrets", () => MaskedSecretsRecordSchema.parse(maskedSecretsFor(...)))`

- `handle("settings:commute:secrets", () => maskedSecretsFor(...))` →  
  `handle("settings:commute:secrets", () => MaskedSecretsRecordSchema.parse(maskedSecretsFor(...)))`

- `handle("settings:llm-providers", () => getLlmProviders())` →  
  `handle("settings:llm-providers", () => z.array(LlmProviderInfoSchema).parse(getLlmProviders()))`

- `handle("settings:commute-providers", () => getCommuteProviders())` →  
  `handle("settings:commute-providers", () => z.array(CommuteProviderInfoSchema).parse(getCommuteProviders()))`

- `handle("settings:llm-models", () => services.modelRegistry.fetchModels())` →  
  `handle("settings:llm-models", async () => z.array(LlmModelSchema).parse(await services.modelRegistry.fetchModels()))`

- `handle("settings:config:load", () => resolveConfig(services.configRepo.load()))` →  
  `handle("settings:config:load", () => ResolvedConfigSchema.parse(resolveConfig(services.configRepo.load())))`

- `handle("settings:config:save", ...)` → wrap the `return { ok: true }` with:  
  `return OkSchema.parse({ ok: true })`

- `handle("settings:llm:secret:save", ...)` → return `OkSchema.parse({ ok: true })`

- `handle("settings:llm:secret:clear", ...)` → return `OkSchema.parse({ ok: true })`

- `handle("settings:llm:secret:test", ...)` → return `SecretTestResultSchema.parse({ ok, error })` or `SecretTestResultSchema.parse({ ok: false, error: "..." })` (adapt the existing logic)

- Same pattern for commute secret save/clear/test

- [ ] **Step 2: Migrate src/app/ipc-applicants.ts — validate incoming and outgoing**

Add imports:

```ts
import {
  ApplicantSchema,
  ApplicantInfoSchema,
  ApplicantDraftResponseSchema,
  CreatedIdSchema,
  SavedOkSchema,
  DeletedIdSchema,
  SuggestionsResponseSchema,
  ApplicantListResponseSchema,
} from "@/api"
```

Validate outgoing:
- `handle("applicants:list", () => ({ applicants: services.applicantRepo.list() }))` →  
  `handle("applicants:list", () => ApplicantListResponseSchema.parse({ applicants: services.applicantRepo.list() }))`

- `handle("applicants:create", (name: string) => { ... return { id } })` →  
  validate with `CreatedIdSchema.parse({ id })`

- `handle("applicants:load", (id: string) => services.applicantRepo.load(id))` →  
  `handle("applicants:load", (id: string) => ApplicantSchema.parse(services.applicantRepo.load(id)))`

- `handle("applicants:save", (id: string, data: unknown) => {` — change signature from `data: Applicant` to `data: unknown`, validate with `const validated = ApplicantSchema.parse(data)`, use `validated` instead of `data`, return `SavedOkSchema.parse({ ok: true })`

- `handle("applicants:delete", ...)` → `DeletedIdSchema.parse({ deleted: id })`

- `handle("applicants:draft:load", ...)` → `ApplicantDraftResponseSchema.parse({ draft })`

- `handle("applicants:draft:save", (draft: unknown) => {` — change signature to `unknown`, validate with `ApplicantSchema.parse(draft)`, return `SavedOkSchema.parse({ ok: true })`

- `handle("applicants:draft:delete", ...)` → `SavedOkSchema.parse({ ok: true })`

- `handle("applicants:draft:finalize", ...)` → `CreatedIdSchema.parse({ id })`

- `handle("applicants:consult-searches", (id: string) => ...)` → `SuggestionsResponseSchema.parse({ suggestions: await services.jobConsultant.consult(id) })`

- [ ] **Step 3: Add validation to src/app/ipc-job-searches.ts**

Add imports after existing imports:

```ts
import {
  JobSearchSchema,
  JobSearchEditorSnapshotSchema,
  JobSearchListResponseSchema,
  CreatedJobSearchIdSchema,
  SavedOkSchema,
  DeletedIdSchema,
  JobSearchDraftResponseSchema,
  ContentSchema,
} from "@/api"
```

Wrap handler returns with `.parse()` and validate incoming `unknown` params where appropriate:

- `handle("job-searches:list", ...)` → `JobSearchListResponseSchema.parse(...)`
- `handle("job-searches:load", ...)` → `JobSearchSchema.parse(...)`
- `handle("job-searches:create", ...)` → `CreatedJobSearchIdSchema.parse(...)`
- `handle("job-searches:save", (id, data: unknown) => ...)` → validate `data` with `JobSearchSchema.parse(data)`, return `SavedOkSchema.parse(...)`
- `handle("job-searches:delete", ...)` → `DeletedIdSchema.parse(...)`  _(returns `{ deleted: id }` with string id, not boolean true)_
- `handle("job-searches:draft:load", ...)` → `JobSearchDraftResponseSchema.parse(...)`
- `handle("job-searches:draft:save", (applicantId, draft: unknown) => ...)` → validate with `JobSearchEditorSnapshotSchema.parse(draft)`, return `SavedOkSchema.parse(...)`
- `handle("job-searches:draft:delete", ...)` → `DeletedIdSchema.parse(...)`
- `handle("job-searches:draft:finalize", ...)` → `CreatedJobSearchIdSchema.parse(...)`
- `handle("job-searches:cover-letter:load", ...)` → `ContentSchema.parse(...)`
- `handle("job-searches:cover-letter:save", ...)` → `SavedOkSchema.parse(...)`
- `handle("job-searches:cover-letter:generate", ...)` → `ContentSchema.parse(...)`
- `handle("job-searches:draft:cover-letter:generate", ...)` → `ContentSchema.parse(...)`

- [ ] **Step 4: Add validation to src/app/ipc-vacancies.ts**

Add imports after existing imports:

```ts
import {
  VacancyListResponseSchema,
  VacancyWithStatusSchema,
  ContentSchema,
  SavedOkSchema,
} from "@/api"
```

Wrap handler returns:

- `handle("job-searches:vacancies:list", ...)` → `VacancyListResponseSchema.parse(...)`
- `handle("job-searches:vacancies:load", ...)` → `VacancyWithStatusSchema.parse(...)`
- `handle("job-searches:vacancies:add-activity", ...)` → `SavedOkSchema.parse(...)`
- `handle("job-searches:vacancies:cover-letter:load", ...)` → `ContentSchema.parse(...)`
- `handle("job-searches:vacancies:cover-letter:save", ...)` → `SavedOkSchema.parse(...)`
- `handle("job-searches:vacancies:cover-letter:generate", ...)` → `ContentSchema.parse(...)`

Note: `vacancies:seed` is an internal handler called during crawl and does not need schema validation. `vacancies:re-enrich` and `vacancies:enrich-unenriched` handlers return `{ ok: true }` and `{ count: number }` respectively — use `SavedOkSchema` or inline parse as appropriate.

- [ ] **Step 5: Add validation to src/app/ipc-setup.ts**

Add imports:

```ts
import { AppSetupStateSchema, SetupStateLoadResultSchema, ClearDataOkSchema } from "@/api"
```

Wrap returns:
- `handle("setup:state:load", ...)` → `SetupStateLoadResultSchema.parse(...)`
- `handle("setup:state:save", ...)` → `AppSetupStateSchema.parse(...)`
- `handle("setup:state:complete", ...)` → `AppSetupStateSchema.parse(...)`
- `handle("setup:clear-data", ...)` → `ClearDataOkSchema.parse(...)`

- [ ] **Step 6: Run tests**

```bash
npm test -- src/app/ipc-setup.test.ts
npm test
```

Expected: all existing tests pass.

- [ ] **Step 7: Run fix**

```bash
npm run fix
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/
git commit -m "refactor: add Zod validation to IPC handlers on send and receive sides"
```

---

## Task 4: Migrate plugin boundary schemas

**Files:**
- Modify: `src/plugins/job-site/arbeitsagentur/index.ts:1,30,43`
- Modify: `src/plugins/commute/google-maps/index.ts:1,71,105`
- Modify: `src/plugins/openai-compatible/index.ts:1,129,152`
- Modify: `src/plugins/browser/stub/index.ts:4,10`
- Modify: `src/plugins/job-site/xing/index.ts:1,92`
- Modify: `src/plugins/job-site/dm/index.ts:1,92`

- [ ] **Step 1: Migrate arbeitsagentur plugin**

Replace `import typia from "typia"` with `import { z } from "zod"`.

Define local schemas (no `src/api/` involvement — these are external API contracts):

```ts
const ApiSearchResponseSchema = z.object({
  stellenangebote: z.array(z.object({ refnr: z.string() })).optional(),
  maxErgebnisse: z.number(),
  page: z.number(),
  size: z.number(),
})

const ApiJobDetailsSchema = z.object({
  stellenangebotsTitel: z.string().optional(),
  stellenangebotsBeschreibung: z.string().optional(),
  firma: z.string().optional(),
  stellenlokationen: z
    .array(
      z.object({
        adresse: z
          .object({
            strasse: z.string().optional(),
            plz: z.string().optional(),
            ort: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  eintrittszeitraum: z.object({ von: z.string().optional() }).optional(),
  veroeffentlichungszeitraum: z.object({ von: z.string().optional() }).optional(),
  referenznummer: z.string().optional(),
})
```

Replace:
- `typia.json.assertParse<ApiSearchResponse>(await response.text())` → `ApiSearchResponseSchema.parse(JSON.parse(await response.text()))`
- `typia.json.assertParse<ApiJobDetails>(await response.text())` → `ApiJobDetailsSchema.parse(JSON.parse(await response.text()))`

Remove local `interface ApiSearchResponse` and `interface ApiJobDetails` — types are now inferred from schemas.

- [ ] **Step 2: Migrate google-maps plugin**

Replace `import typia from "typia"` with `import { z } from "zod"`.

Define local schemas:

```ts
const DistanceMatrixElementSchema = z.object({
  status: z.string(),
  distance: z.object({ text: z.string() }).optional(),
  duration: z.object({ value: z.number() }).optional(),
})

const DistanceMatrixResponseSchema = z.object({
  rows: z.array(z.object({ elements: z.array(DistanceMatrixElementSchema) })),
  status: z.string(),
})

const PingStatusSchema = z.object({ status: z.string() })
```

Replace:
- `typia.json.assertParse<{ status: string }>(await response.text())` → `PingStatusSchema.parse(JSON.parse(await response.text()))`
- `typia.json.assertParse<DistanceMatrixResponse>(await response.text())` → `DistanceMatrixResponseSchema.parse(JSON.parse(await response.text()))`

Remove local `interface DistanceMatrixResponse` and `interface DistanceMatrixElement`.

- [ ] **Step 3: Migrate openai-compatible plugin**

Replace `import typia from "typia"` with `import { z } from "zod"`.

Define local schema:

```ts
const ChatCompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().optional() }).optional(),
      }),
    )
    .optional(),
})
```

Replace:
- `typia.json.assertParse<{ choices?: Array<{ message?: { content?: string } }> }>(await response.text())` (×2 occurrences in `fetchCompletion` and `fetchModels`) → `ChatCompletionResponseSchema.parse(JSON.parse(await response.text()))`

For the model registry fetch, also define and use a schema for the models list response:

```ts
const ModelsResponseSchema = z.object({
  data: z.array(z.record(z.unknown())),
})
```

Replace:
- `typia.json.assertParse<{ data: Record<string, unknown>[] }>(await response.text())` → `ModelsResponseSchema.parse(JSON.parse(await response.text()))`

- [ ] **Step 4: Migrate browser/stub plugin**

Replace `import typia from "typia"` with `import { z } from "zod"`.

Replace:
- `typia.json.assertParse<Record<string, string>>(gunzipSync(...).toString("utf8"))` → `z.record(z.string()).parse(JSON.parse(gunzipSync(...).toString("utf8")))`

- [ ] **Step 5: Migrate xing and dm plugins — type guard usage**

In `src/plugins/job-site/xing/index.ts` and `src/plugins/job-site/dm/index.ts`:

Replace `import typia from "typia"` with `import { z } from "zod"`.

Define local `JobPostingJsonLdSchema`:

```ts
const JobPostingAddressSchema = z.object({
  streetAddress: z.string().optional(),
  postalCode: z.string().optional(),
  addressLocality: z.string().optional(),
})

const JobPostingJsonLdSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  datePosted: z.string().optional(),
  hiringOrganization: z.object({ name: z.string().optional() }).optional(),
  jobLocation: z
    .union([
      z.object({ address: JobPostingAddressSchema.optional() }),
      z.array(z.object({ address: JobPostingAddressSchema.optional() })),
    ])
    .optional(),
})
```

Replace:
- `typia.is<JobPostingJsonLd>(jsonLd)` → `JobPostingJsonLdSchema.safeParse(jsonLd).success`

- [ ] **Step 6: Run integration tests for the plugins**

```bash
npm run test:crawler
```

Expected: all integration tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/plugins/
git commit -m "refactor: replace typia with Zod in plugin boundary schemas"
```

---

## Task 5: Migrate repository boundary schemas

**Files:**
- Modify: `src/repositories/vacancy/sqlite/index.ts:1,60,130`
- Modify: `src/repositories/applicant/sqlite/index.ts:18,74,131-133,158`
- Modify: `src/repositories/job-search/sqlite/index.ts:123,186-187,204,231`

- [ ] **Step 1: Migrate vacancy SQLite repository**

Replace `import typia from "typia"` with `import { z } from "zod"`.

Define local schemas:

```ts
const VacancyMetaSchema = z.object({
  generated_at: z.string(),
  latest_crawl: z.string(),
})

const PartialVacancyDTOSchema = z.object({
  hash: z.string().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  urls: z.array(z.string()).optional(),
  addresses: z.array(z.string()).optional(),
  contact: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  startDate: z.string().optional(),
  description: z.string().optional(),
  enriched: z.boolean().optional(),
  enrichmentDirty: z.boolean().optional(),
  summary: z.string().optional(),
  matchScore: z.enum(["very-bad", "bad", "ok", "good", "excellent"]).optional(),
  commute: z.record(z.unknown()).optional(),
  activityHistory: z.array(z.unknown()).optional(),
  active: z.boolean().optional(),
}).passthrough() // allow extra fields for forward compatibility
```

Replace:
- `typia.assert<{ generated_at: string; latest_crawl: string }>(metaRaw)` → `VacancyMetaSchema.parse(metaRaw)`
- `typia.assert<Partial<VacancyDTO>>(stripLegacyCommute(data))` → `PartialVacancyDTOSchema.parse(stripLegacyCommute(data))`

- [ ] **Step 2: Migrate applicant SQLite repository**

Replace `import typia from "typia"` with `import { z } from "zod"`.

Define local schemas:

```ts
const ApplicantRowSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
})

const ApplicantDraftRowSchema = z.object({
  data: z.string(),
  meaningful: z.number(),
})
```

Replace:
- `typia.assert<Applicant>(applicant)` → use the existing `ApplicantSchema` from `@/api` (the DB stores the same DTO that crosses IPC):  
  `import { ApplicantSchema } from "@/api"` → `ApplicantSchema.parse(applicant)`
- `typia.assert<ApplicantDraftRow>(raw)` → `ApplicantDraftRowSchema.parse(raw)`
- `typia.assert<ApplicantDraftSnapshot>(JSON.parse(parsed.data))` → `ApplicantSchema.parse(JSON.parse(parsed.data))`
- `typia.assert<ApplicantRow>(raw)` → `ApplicantRowSchema.parse(raw)`

- [ ] **Step 3: Migrate job-search SQLite repository**

Replace `import typia from "typia"` with `import { z } from "zod"`.

Define local schemas:

```ts
const JobSearchRowSchema = z.object({
  id: z.string(),
  applicant_id: z.string(),
  search_term: z.string(),
})

const JobSearchDraftRowSchema = z.object({
  data: z.string(),
  meaningful: z.number(),
})

const ContentRowSchema = z.object({ content: z.string() })
```

Replace:
- `typia.assert<JobSearch>(jobSearch)` → `import { JobSearchSchema } from "@/api"` → `JobSearchSchema.parse(jobSearch)`
- `typia.assert<JobSearchDraftRow>(raw)` → `JobSearchDraftRowSchema.parse(raw)`
- `typia.assert<JobSearchEditorSnapshot>(JSON.parse(parsed.data))` → `import { JobSearchEditorSnapshotSchema } from "@/api"` → `JobSearchEditorSnapshotSchema.parse(JSON.parse(parsed.data))`
- `typia.assert<{ content: string }>(raw).content` → `ContentRowSchema.parse(raw).content`
- `typia.assert<JobSearchRow>(raw)` → `JobSearchRowSchema.parse(raw)`

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all existing tests pass, including repository tests.

- [ ] **Step 5: Commit**

```bash
git add src/repositories/
git commit -m "refactor: replace typia with Zod in repository boundary schemas"
```

---

## Task 6: Migrate LLM structured output schemas + adapt toStrictSchema

**Files:**
- Modify: `src/services/vacancy-enricher/assess.ts:1,25`
- Modify: `src/services/vacancy-enricher/extract-contact.ts:1,64`
- Modify: `src/services/job-consultant/consult-searches.ts:1,16`
- Modify: `src/plugins/openai-compatible/strict-schema.ts`
- Modify: `src/plugins/llm/openai-compatible/strict-schema.test.ts`

- [ ] **Step 1: Migrate assess.ts**

Replace `import typia from "typia"` with `import { z } from "zod"` and `import { zodToJsonSchema } from "zod-to-json-schema"`.

Define schema:

```ts
const AssessResultSchema = z.object({
  summary: z.string(),
  matchScore: z.enum(["very-bad", "bad", "ok", "good", "excellent"]),
})
```

Replace:
```ts
const ASSESS_SCHEMA: TypedSchema<AssessResult> = {
  schema: typia.json.schema<AssessResult>(),
  parse: typia.json.createAssertParse<AssessResult>(),
}
```

With:
```ts
const ASSESS_SCHEMA: TypedSchema<z.infer<typeof AssessResultSchema>> = {
  schema: zodToJsonSchema(AssessResultSchema),
  parse: (input: string) => AssessResultSchema.parse(JSON.parse(input)),
}
```

Remove local `interface AssessResult` — type is now inferred from schema.

- [ ] **Step 2: Migrate extract-contact.ts**

Replace `import typia from "typia"` with `import { z } from "zod"` and `import { zodToJsonSchema } from "zod-to-json-schema"`.

Define schemas:

```ts
const RawContactSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
})

const RawContactResultSchema = z.object({
  addresses: z.array(z.string()),
  contact: RawContactSchema.nullable(),
})
```

Replace:
```ts
const EXTRACT_CONTACT_SCHEMA: TypedSchema<RawContactResult> = {
  schema: typia.json.schema<RawContactResult>(),
  parse: typia.json.createAssertParse<RawContactResult>(),
}
```

With:
```ts
const EXTRACT_CONTACT_SCHEMA: TypedSchema<z.infer<typeof RawContactResultSchema>> = {
  schema: zodToJsonSchema(RawContactResultSchema),
  parse: (input: string) => RawContactResultSchema.parse(JSON.parse(input)),
}
```

Remove local interfaces.

- [ ] **Step 3: Migrate consult-searches.ts**

Replace `import typia from "typia"` with `import { z } from "zod"` and `import { zodToJsonSchema } from "zod-to-json-schema"`.

Define schema:

```ts
const ConsultationSuggestionSchema = z.object({
  searchTerm: z.string(),
  searchMode: z.enum(["employment", "entry-level", "apprenticeship"]),
  reason: z.string(),
})

const ConsultationSuggestionsSchema = z.array(ConsultationSuggestionSchema)
```

Replace:
```ts
const CONSULT_SEARCHES_SCHEMA: TypedSchema<ConsultationSuggestion[]> = {
  schema: typia.json.schema<ConsultationSuggestion[]>(),
  parse: typia.json.createAssertParse<ConsultationSuggestion[]>(),
}
```

With:
```ts
const CONSULT_SEARCHES_SCHEMA: TypedSchema<z.infer<typeof ConsultationSuggestionsSchema>> = {
  schema: zodToJsonSchema(ConsultationSuggestionsSchema),
  parse: (input: string) => ConsultationSuggestionsSchema.parse(JSON.parse(input)),
}
```

- [ ] **Step 4: Adapt toStrictSchema for Zod's JSON Schema format**

**Context:** `zod-to-json-schema` produces a different JSON Schema structure than typia's `json.schema()`. Key differences:
- No `$ref` / `components/schemas` — everything is inlined
- `z.enum()` → `{ type: "string", enum: [...] }` (not `oneOf([{ const: "x" }])`)
- Optional properties are omitted from `required` array
- `z.string().nullable().optional()` → `anyOf: [{ type: "string" }, { type: "null" }]` (already uses `anyOf`, not `oneOf`)
- `additionalProperties: false` is already set

The existing `toStrictSchema` function needs to be simplified:
- Remove `$ref` resolution and `components` handling (defensive code can stay but is unnecessary)
- Keep optional → nullable + required transformation (this is the main feature still needed)
- Keep `additionalProperties: false` enforcement (already set by zod, but keep defensively)
- Keep `oneOf(const)` → `enum` as defensive code
- Keep `oneOf` → `anyOf` transformation as defensive code
- Remove the `Definitions` type and `resolveReference` function (no `$ref`s to resolve)

Replace `src/plugins/openai-compatible/strict-schema.ts` with the adapted implementation:

```ts
/**
 * Transforms a JSON Schema into OpenAI strict-mode-compatible format:
 * - Adds additionalProperties: false to all objects
 * - Makes optional properties nullable and required
 * - Converts oneOf with const values to enum (defensive)
 * - Converts remaining oneOf to anyOf (OpenAI strict mode uses anyOf)
 */
export function toStrictSchema(input: object): Record<string, unknown> {
  if (!isRecord(input)) throw new Error("Invalid schema input")
  return resolve(input)
}

function resolve(node: Record<string, unknown>): Record<string, unknown> {
  const result = resolveChildren(node)
  makeStrictObject(result)
  return result
}

function resolveChildren(
  node: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) {
    const handler = CHILD_HANDLERS[key]
    const handled = handler ? handler(value, result) : false
    if (!handled) result[key] = value
  }
  return result
}

const CHILD_HANDLERS: Record<string, ChildHandler> = {
  oneOf: (value, result) => {
    if (!isRecordArray(value)) return false
    resolveOneOf(value, result)
    return true
  },
  anyOf: (value, result) => {
    if (!isRecordArray(value)) return false
    result.anyOf = value.map((v) => (isRecord(v) ? resolve(v) : v))
    return true
  },
  items: (value, result) => {
    if (!isRecord(value)) return false
    result.items = resolve(value)
    return true
  },
  properties: (value, result) => {
    if (!isRecord(value)) return false
    result.properties = resolveProperties(value)
    return true
  },
}

function makeStrictObject(result: Record<string, unknown>): void {
  if (result.type !== "object" || !isRecord(result.properties)) return

  const required = isStringArray(result.required)
    ? [...result.required]
    : []
  const allProperties = Object.keys(result.properties)
  const optional = allProperties.filter(
    (property) => !required.includes(property),
  )

  if (optional.length > 0) {
    const properties = result.properties
    for (const property of optional) {
      properties[property] = {
        anyOf: [properties[property], { type: "null" }],
      }
    }
    result.required = allProperties
  }

  result.additionalProperties = false
}

function resolveOneOf(
  value: Record<string, unknown>[],
  result: Record<string, unknown>,
): void {
  if (isConstEnum(value)) {
    result.type = "string"
    result.enum = value.map((entry) => entry.const)
  } else {
    result.anyOf = value.map((entry) => resolve(entry))
  }
}

function resolveProperties(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  for (const [propertyName, propertySchema] of Object.entries(value)) {
    properties[propertyName] = isRecord(propertySchema)
      ? resolve(propertySchema)
      : propertySchema
  }
  return properties
}

type ChildHandler = (
  value: unknown,
  result: Record<string, unknown>,
) => boolean

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(isRecord)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  )
}

function isConstEnum(
  items: Record<string, unknown>[],
): items is Array<{ const: unknown }> {
  return items.every((entry) => "const" in entry)
}
```

- [ ] **Step 5: Update strict-schema tests for Zod-style inputs**

Replace `src/plugins/llm/openai-compatible/strict-schema.test.ts` with tests using Zod-style JSON Schema inputs (inlined, no `$ref`/`components`):

```ts
import { describe, it, expect } from "vitest"
import { toStrictSchema } from "@/plugins/openai-compatible"

describe("toStrictSchema", () => {
  it("adds additionalProperties: false to object", () => {
    const input = {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    }

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: false,
    })
  })

  it("converts oneOf with const values to enum (defensive)", () => {
    const input = {
      type: "object",
      properties: {
        score: {
          oneOf: [{ const: "low" }, { const: "high" }],
        },
      },
      required: ["score"],
    }

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        score: { type: "string", enum: ["low", "high"] },
      },
      required: ["score"],
      additionalProperties: false,
    })
  })

  it("converts optional properties to nullable and adds to required", () => {
    const input = {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
      },
      required: [],
    }

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        name: { anyOf: [{ type: "string" }, { type: "null" }] },
        email: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
      required: ["name", "email"],
      additionalProperties: false,
    })
  })

  it("converts oneOf type alternatives to anyOf", () => {
    const input = {
      type: "object",
      properties: {
        contact: {
          oneOf: [
            { type: "null" },
            {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
            },
          ],
        },
      },
      required: ["contact"],
    }

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        contact: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
              additionalProperties: false,
            },
          ],
        },
      },
      required: ["contact"],
      additionalProperties: false,
    })
  })

  it("handles array with inline items", () => {
    const input = {
      type: "array",
      items: {
        type: "object",
        properties: { value: { type: "number" } },
        required: ["value"],
      },
    }

    expect(toStrictSchema(input)).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: { value: { type: "number" } },
        required: ["value"],
        additionalProperties: false,
      },
    })
  })

  it("transforms Zod AssessResult schema (enum, no optional)", () => {
    const input = {
      type: "object",
      properties: {
        summary: { type: "string" },
        matchScore: {
          type: "string",
          enum: ["very-bad", "bad", "ok", "good", "excellent"],
        },
      },
      required: ["summary", "matchScore"],
      additionalProperties: false,
    }

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        summary: { type: "string" },
        matchScore: {
          type: "string",
          enum: ["very-bad", "bad", "ok", "good", "excellent"],
        },
      },
      required: ["summary", "matchScore"],
      additionalProperties: false,
    })
  })

  it("transforms Zod ContactExtractionResult schema with optional nullable contact", () => {
    const input = {
      type: "object",
      properties: {
        addresses: { type: "array", items: { type: "string" } },
        contact: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              properties: {
                name: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
                email: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
                phone: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
              },
              additionalProperties: false,
            },
          ],
        },
      },
      required: ["addresses"],
      additionalProperties: false,
    }

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        addresses: { type: "array", items: { type: "string" } },
        contact: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              properties: {
                name: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
                email: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
                phone: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
              },
              required: ["name", "email", "phone"],
              additionalProperties: false,
            },
          ],
        },
      },
      required: ["addresses", "contact"],
      additionalProperties: false,
    })
  })

  it("throws on invalid input", () => {
    expect(() => toStrictSchema("not an object")).toThrow(
      "Invalid schema input",
    )
  })
})
```

Note: The test file import path changed from `"."` to `"@/plugins/openai-compatible"` since the test file is at `src/plugins/llm/openai-compatible/` and the source is at `src/plugins/openai-compatible/`. Verify the import resolves correctly. If the test module re-exports `toStrictSchema` (the LLM module likely re-exports from the openai-compatible module), the import path should be `"../.."` or whatever the actual relative path is. Check the existing import in the test and adjust if needed.

- [ ] **Step 6: Run strict-schema tests**

```bash
npm test -- src/plugins/llm/openai-compatible/strict-schema.test.ts
```

Expected: ALL tests PASS.

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: all tests pass, including the openai-compatible client test (which uses `TypedSchema` and `completeJSON`).

- [ ] **Step 8: Commit**

```bash
git add src/services/ src/plugins/openai-compatible/ src/plugins/llm/
git commit -m "refactor: replace typia JSON schema with zod-to-json-schema, adapt toStrictSchema"
```

---

## Task 7: Migrate src/app/secrets/encrypted.ts

**Files:**
- Modify: `src/app/secrets/encrypted.ts:3,21`

- [ ] **Step 1: Replace typia validation in load()**

Replace `import typia from "typia"` at line 3 with `import { z } from "zod"`.

Define a local schema for the Secrets DTO (matches `src/models/secrets/index.ts`):

```ts
const SecretsSchema = z.object({
  openrouterApiKey: z.string().optional(),
  requestyApiKey: z.string().optional(),
  googleMapsApiKey: z.string().optional(),
})
```

Replace line 21:
```ts
// BEFORE
return resolveSecrets(typia.json.assertParse<Secrets>(decrypted))
// AFTER
return resolveSecrets(SecretsSchema.parse(JSON.parse(decrypted)))
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/app/secrets/secrets.test.ts
```

Expected: tests pass.

- [ ] **Step 3: Run fix**

```bash
npm run fix
```

- [ ] **Step 4: Commit**

```bash
git add src/app/secrets/encrypted.ts
git commit -m "refactor: replace typia with Zod in encrypted secrets repository"
```

---

## Task 8: Migrate src/utils/json-ld.ts

**Files:**
- Modify: `src/utils/json-ld.ts:1,14`

- [ ] **Step 1: Replace typia.json.isParse with Zod**

Replace `import typia from "typia"` at line 1 with `import { z } from "zod"`.

Replace lines 13-17:
```ts
// BEFORE
try {
  const data = typia.json.isParse<Record<string, unknown>>(
    $(element).html() || "",
  )
  if (data && data["@type"] === type) {
    result = data
  }
} catch {
  // invalid JSON — skip
}
// AFTER
const raw = $(element).html() || ""
let data: Record<string, unknown> | undefined
try {
  data = z.record(z.unknown()).parse(JSON.parse(raw))
} catch {
  data = undefined
}
if (data?.["@type"] === type) {
  result = data
}
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/utils/json-ld.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run fix**

```bash
npm run fix
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/json-ld.ts
git commit -m "refactor: replace typia with Zod in utils/json-ld.ts"
```

---

## Task 9: Migrate utils/database.ts

**Files:**
- Modify: `src/utils/database.ts:3,70`

- [ ] **Step 1: Replace typia in Statement.getJsonData**

Replace `import typia from "typia"` with `import { z } from "zod"`.

Define local schema:

```ts
const DataRowSchema = z.object({ data: z.string() })
```

Replace:
- `JSON.parse(typia.assert<{ data: string }>(row).data)` → `JSON.parse(DataRowSchema.parse(row).data)`

- [ ] **Step 2: Run tests**

```bash
npm test -- src/utils/database.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/utils/database.ts
git commit -m "refactor: replace typia with Zod in utils/database.ts"
```

---

## Task 10: Migrate progress type guard (src/ui/hooks/job-progress.ts)

**Files:**
- Modify: `src/ui/hooks/job-progress.ts:3,47`

- [ ] **Step 1: Replace typia.is with safeParse**

Replace `import typia from "typia"` with `import { z } from "zod"` (bare module import, no `@/` path — compatible with `ui/hooks` architecture rule `imports: []`).

Define the progress schema locally in the hook file (cannot import from `@/api` due to `ui/hooks` layer restriction):

```ts
const ProgressPayloadSchema = z.object({
  message: z.string(),
  phase: z
    .enum(["search", "scan", "enrich", "complete", "done"])
    .optional(),
  source: z.enum(["crawl", "enrich"]).optional(),
  owner: z.enum(["crawl", "batch"]).optional(),
  vacanciesUpdated: z.boolean().optional(),
  enrichProgress: z
    .object({ completed: z.number(), total: z.number() })
    .optional(),
  jobSearchId: z.string().optional(),
})
```

Replace:
- `if (!typia.is<ProgressPayload>(data)) return` → `const parsed = ProgressPayloadSchema.safeParse(data); if (!parsed.success) return; const payload = parsed.data`  
  Then update the subsequent code to use `payload` instead of `data` (the type-narrowed variable).

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/ui/hooks/job-progress.ts
git commit -m "refactor: replace typia.is with Zod safeParse in job-progress hook"
```

---

## Task 11: Cleanup — remove typia and compiler plugin

**Files:**
- Modify: `package.json`
- Modify: `electron.vite.config.ts`

- [ ] **Step 1: Remove typia and @typia/unplugin from package.json**

```bash
npm uninstall typia
npm uninstall @typia/unplugin
```

Expected: packages removed from `package.json` and `node_modules/`.

- [ ] **Step 2: Remove UnpluginTypia from electron.vite.config.ts**

In `electron.vite.config.ts`, remove the import and usage:

Remove: `import UnpluginTypia from "@typia/unplugin/vite"`

Change:
```ts
main: {
  plugins: [copyTemplatesPlugin(), UnpluginTypia()],
```

To:
```ts
main: {
  plugins: [copyTemplatesPlugin()],
```

And:
```ts
renderer: {
  root: "src/ui",
  plugins: [react(), tailwindcss(), UnpluginTypia()],
```

To:
```ts
renderer: {
  root: "src/ui",
  plugins: [react(), tailwindcss()],
```

- [ ] **Step 3: Verify build works without the plugin**

```bash
npm run dev
```

Check that electron-vite dev starts without errors related to missing typia.

- [ ] **Step 4: Run fix**

```bash
npm run fix
```

Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json electron.vite.config.ts
git commit -m "chore: remove typia and @typia/unplugin"
```

---

## Task 12: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test:all
```

Expected: ALL tests pass (unit + integration + e2e).

- [ ] **Step 2: Run fix**

```bash
npm run fix
```

Expected: no lint errors, no unused deps.

- [ ] **Step 3: Verify no remaining typia references**

```bash
grep -rn "typia" --include="*.ts" --include="*.tsx" src/
```

Expected: no output (zero references remaining).

- [ ] **Step 4: Commit**

```bash
git commit -am "chore: final verification after typia-to-zod migration"
```
