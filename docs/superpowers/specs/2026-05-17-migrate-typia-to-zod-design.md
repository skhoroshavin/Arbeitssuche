# Design: Migrate from typia to Zod for Runtime Validation

## Summary

Replace `typia` (compiler-plugin-based runtime validation) with `zod` (schema-first
runtime validation) for all trust-boundary crossings. Remove the compiler plugin,
add standard npm dependencies, and move schemas directly into `src/models/` (domain
schemas), `src/utils/` (shared utility schemas), and local files (plugin/repository/
service schemas). No `src/api/` layer.

## Motivation

- **Build speed**: `@typia/unplugin` adds 2-5s per build processing TypeScript types
  through the compiler API. Zod has zero build overhead.
- **IDE support**: typia's compiler plugin requires bundler integration and is
  poorly supported in JetBrains IDEs. Zod works identically in any editor.
- **TypeScript version coupling**: typia is tightly coupled to TS compiler
  internals — upgrades frequently break it. Zod is a standard npm package.
- **LLM comprehension**: Zod has 431× more npm downloads than typia (143M vs 331K
  weekly), meaning AI coding assistants have vastly more training examples.
- **Simplicity**: remove one category of build tooling (compiler plugins) from
  the project.

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
| IPC (main ↔ renderer) | `Config`, `Applicant`, `JobSearch`, `LlmModel[]` | Domain schemas in `src/models/<domain>/schemas.ts`; UI response wrappers local to each `src/ui/data/*.ts` |
| External API JSON | `ApiSearchResponse`, `DistanceMatrixResponse` | Local to the plugin (`src/plugins/*/`) as private named `const` |
| Storage/DB rows | `VacancyDTO`, `ApplicantRow`, `JobSearchRow` | `src/models/<domain>/schemas.ts` — imported by repositories (no duplication) |
| LLM structured output | `AssessResult`, `ConsultationSuggestion[]` | Local to the service (`src/services/*/`) |

Only domain schemas live in `src/models/` — they are the shared contract between
main and renderer processes. All other boundary schemas live alongside the code
that owns that boundary (plugin, repository, service), following the existing
architecture where each layer owns its external interfaces.

### What stays pure TypeScript

Rich domain models (`Vacancy` class), discriminated unions (`Activity`,
`VacancyStatus`, `MatchScore`), internal helpers (`BaseActivity`,
`CommuteDurations`), constants, and resolve functions. No schemas for these.

## Architecture: Schema Placement Rules

| Category | Destination | Rationale |
|---|---|---|
| Domain schemas (Applicant, VacancyDTO, JobSearch, Activity, CommuteInfo, AppSetupState, AppConfig, etc.) | `src/models/<domain>/schemas.ts` | Both `app/` (incoming validation) and `repositories/` (hydration) may legally import `models/*`. Eliminates repo↔api duplication. |
| UI response wrappers (`ApplicantListResponseSchema`, `VacancyListResponseSchema`, `ContentSchema`, etc.) | Local to each `src/ui/data/*.ts` file | The UI owns the IPC response contract. Composed from `models/*` schemas. |
| Generic utility schemas (`OkSchema`, `CreatedIdSchema`, `DeletedIdSchema`) | `src/utils/schemas.ts` | Shared between `app/` (where outgoing `.parse()` is removed) and `ui/data/` (where response parsing is kept). Kept minimal. |
| Plugin API schemas (Arbeitsagentur response, Google Maps distance matrix, OpenAI completion response) | Stay in plugin files as private named `const` | Plugin interfaces are already type-safe. These are internal parsing guards, not exported. |
| JobPosting JSON-LD schemas | Stay as private named `const` in `xing/` and `dm/` | Site-specific parsing; similarity is coincidental. |

### Key behavior change in `app/`

- **Remove outgoing `.parse()` calls** from IPC handlers. TypeScript already
  enforces return types on both sides of the IPC boundary.
- **Keep incoming `.parse()` calls** for IPC arguments (e.g.
  `ApplicantSchema.parse(data)`), because arguments arrive as `unknown`.
- Delete `src/app/schemas.ts`.

## Usage Patterns

### Backend: validate incoming parameters only

```ts
// src/app/ipc-applicants.ts
import { ApplicantSchema } from "@/models/applicant"

handle("applicants:save", (id: string, data: unknown) => {
  const validated = ApplicantSchema.parse(data)
  services.applicantRepo.save(id, validated)
  return { ok: true }
})
```

### Renderer: validate IPC responses

```ts
// src/ui/data/settings.ts
import { ResolvedConfigSchema } from "@/models/config"
import { z } from "zod"

const ConfigResponseSchema = ResolvedConfigSchema

function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: async () =>
      ConfigResponseSchema.parse(await api().invoke("settings:config:load")),
  })
}
```

### Repository: import domain schemas from models

```ts
// src/repositories/vacancy/sqlite/index.ts
import { VacancyDTOSchema } from "@/models/vacancy"

function hydrate(row: unknown) {
  return VacancyDTOSchema.parse(row)
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

## Files to Create

### `src/models/applicant/schemas.ts`

- `ApplicantSchema`
- `ApplicantPersonalSchema`
- `ApplicantExperienceSchema`
- `ApplicantEducationSchema`
- `ApplicantSkillSchema`
- `ApplicantLanguageSchema`
- `ApplicantCertificationSchema`
- `ApplicantDiscloseSchema`
- `ApplicantInfoSchema`

### `src/models/vacancy/schemas.ts`

- `VacancyDTOSchema`
- `VacancyContactSchema`
- `CommuteInfoSchema`
- `ActivitySchema`
- `VacancySourceSchema`

### `src/models/job-search/schemas.ts`

- `JobSearchSchema`
- `SearchParametersSchema`
- `SearchPreferencesSchema`
- `JobSearchEditorSnapshotSchema`
- `JobSearchDraftSchema`
- `JobSearchInfoSchema`

### `src/models/setup/schemas.ts`

- `AppSetupStateSchema`

### `src/models/config/schemas.ts`

- `ResolvedConfigSchema`
- `LlmModelSchema`
- `LlmProviderInfoSchema`
- `CommuteProviderInfoSchema`

### `src/models/secrets/schemas.ts`

- `MaskedSecretsRecordSchema`
- `SecretTestResultSchema`
- `MaskedSecretSchema`

### `src/utils/schemas.ts`

- `OkSchema`
- `CreatedIdSchema`
- `DeletedIdSchema`

## Files to Modify

### `src/models/*/index.ts`

Add `export * from "./schemas.js"` to:
- `src/models/applicant/index.ts`
- `src/models/vacancy/index.ts`
- `src/models/job-search/index.ts`
- `src/models/setup/index.ts`
- `src/models/config/index.ts`
- `src/models/secrets/index.ts`

### `src/repositories/vacancy/sqlite/index.ts`

- Delete local copies of `VacancyContactSchema`, `CommuteInfoSchema`, `ActivitySchema`, `VacancyDTOSchema`.
- Import from `@/models/vacancy` instead.

### `src/repositories/job-search/sqlite/index.ts`

- Import `JobSearchSchema` and `JobSearchEditorSnapshotSchema` from `@/models/job-search` instead of `@/api`.

### `src/repositories/applicant/sqlite/index.ts`

- Import `ApplicantSchema` from `@/models/applicant` instead of `@/api`.

### `src/app/ipc-*.ts` (5 files)

- Import domain schemas from `models/*` or define wrappers locally.
- Remove outgoing `.parse()` calls on plain objects (`{ ok: true }`, `{ id }`).
- Keep incoming `.parse()` for arguments arriving as `unknown`.

### `src/ui/data/*.ts` (5 files)

- Define local response wrapper schemas composed from `models/*` schemas.
- Remove `@/api` imports.

### `src/plugins/job-site/xing/index.ts`

- Extract inline `asJobPosting` schema to module-level `JobPostingJsonLdSchema` (private).

### `src/plugins/job-site/dm/index.ts`

- Extract inline `asJobPosting` schema to module-level `JobPostingJsonLdSchema` (private).

### `src/plugins/openai-compatible/index.ts`

- Extract inline completion response schema to module-level `CompletionResponseSchema` (private).

### `src/plugins/commute/google-maps/index.ts`

- Extract inline `DistanceMatrixResponseSchema` to module-level (already named; keep private).

### `src/app/secrets/encrypted.ts`

- Extract inline secrets shape to module-level `SecretsFileSchema` (private).

### `src/utils/database.ts`

- Extract inline `z.object({ data: z.string() })` to module-level `DataColumnSchema` (private).

## Files to Delete

- `src/api/applicants.ts`
- `src/api/vacancy.ts`
- `src/api/job-searches.ts`
- `src/api/settings.ts`
- `src/api/setup.ts`
- `src/api/crawl.ts`
- `src/api/ok-response.ts`
- `src/api/index.ts`
- `src/app/schemas.ts`

## Data Flow

### Before

```
models/ → defines TypeScript interfaces
api/    → defines Zod schemas for IPC (mix of domain + wrappers)
app/    → imports from api/, .parse() outgoing responses
ui/data → imports from api/, .parse() incoming responses
repositories/ → imports from api/ OR duplicates schemas inline
```

### After

```
models/    → defines TypeScript interfaces + Zod schemas
app/       → imports domain schemas from models/, .parse() incoming only
ui/data    → composes local wrapper schemas from models/, .parse() responses
repositories/ → imports domain schemas from models/ (no duplication)
plugins/   → private named schemas for internal API parsing
utils/     → minimal shared utility schemas
```

## Migration Strategy

Incremental, file-by-file. Each file can be migrated independently:

1. **Setup phase**: add `zod` + `zod-to-json-schema` to `package.json`, create
   `src/models/*/schemas.ts` files, add utility schemas
2. **IPC contracts**: migrate `ui/data/*` consumers and `app/ipc-*.ts` handlers
   to import from `models/*` instead of `@/api`
3. **Repositories**: migrate `src/repositories/**/*.ts` to import from `models/*`,
   delete duplicate local schemas
4. **Plugin schemas**: migrate `src/plugins/**/*.ts` local schemas, extract
   inline schemas to named `const`
5. **LLM schemas**: migrate `src/services/*` schemas + adapt `toStrictSchema`
6. **Cleanup**: remove `typia`, `@typia/unplugin`, `UnpluginTypia` from config;
   delete `src/api/` and `src/app/schemas.ts`
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

## Error Handling

No behavioral changes to error handling. Zod parse failures on IPC arguments will
still throw, caught by the existing IPC handler wrapper.

## Testing

- Run `npm run fix` to catch lint/import issues.
- Run `npm test:all` to verify no runtime regressions from schema moves.
- Verify `npm run build` passes (no broken type references).

## Dependencies

- Remove: `typia`, `@typia/unplugin`
- Add: `zod`, `zod-to-json-schema` (already present if prior work done)
