# Design: Migrate from typia to Zod for Runtime Validation

## Summary

Replace `typia` (compiler-plugin-based runtime validation) with `zod` (schema-first
runtime validation) for all trust-boundary crossings. Remove the compiler plugin,
add standard npm dependencies, and introduce a shared `src/api/` layer for IPC
contract schemas used by both main and renderer processes.

## Motivation

- **Build speed**: `@typia/unplugin` adds 2-5s per build processing TypeScript types
  through the compiler API. Zod has zero build overhead.
- **IDE support**: typia's compiler plugin requires bundler integration and is
  poorly supported in JetBrains IDEs. Zod works identically in any editor.
- **TypeScript version coupling**: typia is tightly coupled to TS compiler
  internals — upgrades frequently break it. Zod is a standard npm package.
- **LLM comprehension**: Zod has 431× more npm downloads than typia (143M vs 331K
  weekly), meaning AI coding assistants have vastly more training examples.
- **Simplicity**: remove one category of build tooling (compiler plugins) from the
  project.

Runtime performance is explicitly non-critical for this project — the difference
between typia's generated native checks and Zod's schema interpreter is
microseconds vs nanoseconds, irrelevant for an Electron desktop app.

## Approach

### Schema-first, but only at boundaries

Zod schemas become the source of truth for DTOs that cross trust boundaries.
TypeScript types are inferred from schemas via `z.infer<typeof schema>`.
Rich domain types (discriminated unions, classes, resolve functions) stay pure
TypeScript — no schemas.

```
BEFORE (type-first, typia):        AFTER (schema-first, Zod):
  interface → typia magic             z.object({...})      ← source of truth
       ↓                                  ↓
  typia.assert<T>(data)              type T = z.infer<typeof schema>
                                     schema.parse(data)
```

### Trust boundaries that get schemas

| Boundary | Examples | Schema location |
|---|---|---|
| IPC (main ↔ renderer) | `Config`, `Applicant`, `JobSearch`, `LlmModel[]` | `src/api/` |
| External API JSON | `ApiSearchResponse`, `DistanceMatrixResponse` | Plugin file (local) |
| Storage/DB rows | `VacancyDTO`, `ApplicantRow`, `JobSearchRow` | Repository file (local) |
| LLM structured output | `AssessResult`, `ConsultationSuggestion[]` | Service file (local) |

### What stays pure TypeScript

Rich domain models (`Vacancy` class), discriminated unions (`Activity`,
`VacancyStatus`, `MatchScore`), internal helpers (`BaseActivity`,
`CommuteDurations`), constants, and resolve functions. No schemas for these.

## Architecture: `src/api/` Shared Layer

### Purpose

A new shared layer containing Zod schemas for IPC contracts. Both the main
process (`app/`) and renderer (`ui/data`) import from it to validate data
crossing the Electron process boundary.

### Structure

```
src/api/
  index.ts               // barrel: re-exports all schemas
  settings.ts            // ConfigSchema, LlmModelSchema, MaskedSecretSchema...
  applicants.ts          // ApplicantSchema, ApplicantInfoSchema, ApplicantDraftSchema...
  job-searches.ts        // JobSearchSchema, JobSearchInfoSchema, JobSearchDraftSchema...
  setup.ts               // AppSetupStateSchema, SetupStateLoadResultSchema...
  vacancy.ts             // VacancyDTOSchema, VacancyWithStatusSchema...
  crawl.ts               // CrawlSitesSchema...
  progress.ts            // ProgressPayloadSchema...
```

### Schema file example

```ts
// src/api/settings.ts
import { z } from "zod"

export const ConfigSchema = z.object({
  provider: z.enum(["openrouter", "requesty"]).optional(),
  assessmentModel: z.string().optional(),
  coverLetterModel: z.string().optional(),
  consultationModel: z.string().optional(),
})
export type ConfigDTO = z.infer<typeof ConfigSchema>

export const LlmModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricing: z.object({ prompt: z.string(), completion: z.string() }),
})
export type LlmModelDTO = z.infer<typeof LlmModelSchema>
```

### Architecture enforcement

```ts
// eslint.config.ts addition
"api": { shared: true },
"app": { imports: [..., "api"] },
"app/*": { imports: [..., "api"] },
"ui/data": { imports: ["models/+", "api"] },
```

`shared: true` means any layer may import from `api/` — it's a pure contract
module with no internal dependencies, similar to `utils/`.

## Usage Patterns

### Backend: validate outgoing responses

```ts
// src/app/ipc-settings.ts
import { ConfigSchema } from "@/api"

handle("settings:config:load", () => {
  const raw = services.configRepo.load()
  const resolved = resolveConfig(raw)
  return ConfigSchema.parse(resolved)
})
```

### Backend: validate incoming parameters

```ts
// src/app/ipc-applicants.ts
import { ApplicantSchema, ApplicantDraftSchema } from "@/api"

handle("applicants:save", (id: string, data: unknown) => {
  const validated = ApplicantSchema.parse(data)
  services.applicantRepo.save(id, validated)
  return { ok: true }
})

handle("applicants:draft:save", (draft: unknown) => {
  const validated = ApplicantDraftSchema.parse(draft)
  services.applicantRepo.saveDraft(validated)
  return { ok: true }
})
```

### Renderer: validate IPC responses

```ts
// src/ui/data/settings.ts
import { ConfigSchema, LlmModelSchema } from "@/api"

function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: async () =>
      ConfigSchema.parse(await api().invoke("settings:config:load")),
  })
}
```

### Plugin: validate external API JSON

```ts
// src/plugins/job-site/arbeitsagentur/index.ts
// Schema defined locally in the plugin file
const ApiSearchResponseSchema = z.object({
  stellenangebote: z.array(z.object({ refnr: z.string() })).optional(),
  maxErgebnisse: z.number(),
  page: z.number(),
  size: z.number(),
})

// ...
const data = ApiSearchResponseSchema.parse(JSON.parse(await response.text()))
```

### Plugin: type guard replacement

```ts
// BEFORE
const posting = typia.is<JobPostingJsonLd>(jsonLd) ? jsonLd : undefined

// AFTER
const posting = JobPostingJsonLdSchema.safeParse(jsonLd).success
  ? jsonLd
  : undefined
```

### LLM structured output: JSON Schema generation

```ts
// src/services/vacancy-enricher/assess.ts
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

const AssessResultSchema = z.object({
  summary: z.string(),
  matchScore: z.enum(["very-bad", "bad", "ok", "good", "excellent"]),
})

const ASSESS_SCHEMA: TypedSchema<AssessResult> = {
  schema: zodToJsonSchema(AssessResultSchema),
  parse: (input: string) => AssessResultSchema.parse(JSON.parse(input)),
}
```

## `toStrictSchema` Adaptation

`src/plugins/openai-compatible/strict-schema.ts` currently transforms typia's
JSON Schema output (which uses `$ref` references to `components/schemas`) into
OpenAI strict-mode format. Zod's `zod-to-json-schema` produces a different
structure (more inline, fewer or no `$ref`s). The function needs to handle
Zod's format instead.

Key differences to handle:
- **`$ref` resolution**: May be simpler or unnecessary — depends on whether
  `zod-to-json-schema` emits `$ref`s for this project's schemas
- **`oneOf` → `anyOf`**: Still needed (OpenAI strict mode uses `anyOf`)
- **`oneOf(const)` → `enum`**: Still needed
- **Optional → nullable + required**: Still needed (OpenAI strict mode requires
  all properties in `required`)
- **`additionalProperties: false`**: Still needed

The existing `toStrictSchema` test suite serves as the acceptance criteria:
all existing tests must pass against the Zod-generated schemas.

## Files to Change

### Remove
- `typia` from `package.json` (dependency)
- `@typia/unplugin` from `package.json` (devDependency)
- `UnpluginTypia()` from `electron.vite.config.ts`

### Add
- `zod` to `package.json` (dependency)
- `zod-to-json-schema` to `package.json` (dependency)
- `src/api/` directory with schemas for each IPC domain

### Modify (~15 source files)
- `src/ui/data/*.ts` (5 files): replace `typia.assert<T>()` with schema `.parse()`
- `src/ui/hooks/job-progress.ts`: replace `typia.is<T>()` with `.safeParse()`
- `src/app/ipc-*.ts` (5 files): add validation on incoming params and outgoing responses
- `src/app/secrets/encrypted.ts`: replace `typia.json.assertParse<T>()`
- `src/plugins/job-site/*/index.ts` (3 files): replace `typia.json.assertParse<T>()` / `typia.is<T>()`
- `src/plugins/openai-compatible/index.ts`: replace `typia.json.assertParse<T>()`
- `src/plugins/openai-compatible/strict-schema.ts`: adapt to Zod's JSON Schema format
- `src/plugins/browser/stub/index.ts`: replace `typia.json.assertParse<T>()`
- `src/plugins/commute/google-maps/index.ts`: replace `typia.json.assertParse<T>()`
- `src/repositories/**/*.ts` (3 files): replace `typia.assert<T>()`
- `src/services/vacancy-enricher/assess.ts`: replace `typia.json.schema<T>()` + `typia.json.createAssertParse<T>()`
- `src/services/vacancy-enricher/extract-contact.ts`: same
- `src/services/job-consultant/consult-searches.ts`: same
- `src/utils/database.ts`: replace `typia.assert<T>()`
- `eslint.config.ts`: add `api` shared layer

## Migration Strategy

Incremental, file-by-file. Each file can be migrated independently:

1. **Setup phase**: add `zod` + `zod-to-json-schema` to `package.json`, create
   `src/api/` scaffolding, add `api` to eslint config
2. **IPC contracts**: create schemas in `src/api/`, migrate `ui/data/*` consumers
   and `app/ipc-*.ts` handlers in pairs
3. **Plugin schemas**: migrate `src/plugins/**/*.ts` local schemas
4. **Repository schemas**: migrate `src/repositories/**/*.ts`
5. **LLM schemas**: migrate `src/services/*` schemas + adapt `toStrictSchema`
6. **Cleanup**: remove `typia`, `@typia/unplugin`, `UnpluginTypia` from config
7. **Verify**: full test suite passes

## Risks

1. **`toStrictSchema` adaptation**: The only non-trivial piece. Mitigated by
   the existing test suite which serves as acceptance criteria.
2. **Discriminated unions**: `Activity` type is a discriminated union on `type`.
   Zod's `z.discriminatedUnion()` handles this — need to verify exact behavioral
   match for optional fields.
3. **`resolve*` functions**: Currently work at type level merging defaults with
   partials. These stay pure TypeScript — Zod schemas validate the wire format
   (after resolve) separately.
