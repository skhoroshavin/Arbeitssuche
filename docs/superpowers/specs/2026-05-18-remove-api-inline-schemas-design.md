# Remove `src/api/` and Eliminate Inline/Duplicated Zod Schemas

## Context

The codebase contains a `src/api/` directory that exports Zod schemas used as IPC response contracts between the Electron main process (`app/`) and the React renderer (`ui/`). However:

- `src/api/vacancy.ts` and `src/repositories/vacancy/sqlite/index.ts` contain **identical copies** of `VacancyContactSchema`, `CommuteInfoSchema`, `ActivitySchema`, and `VacancyDTOSchema`.
- `src/plugins/job-site/xing/index.ts` and `dm/index.ts` duplicate the same inline `asJobPosting` JSON-LD schema.
- Many schemas are declared as `const` but not exported, while inline `z.object()` / `z.array()` calls are used throughout `api/` files.
- The `app/` IPC handlers `.parse()` **outgoing** responses (e.g. `SavedOkSchema.parse({ ok: true })`) despite both ends being the same TypeScript codebase.

## Goal

1. **Delete `src/api/` entirely.**
2. **Move domain schemas** to `src/models/<domain>/` alongside their TypeScript interfaces.
3. **Move UI response wrapper schemas** into the `src/ui/data/*.ts` files that consume them.
4. **Convert all inline schemas** to top-level named `const` declarations.
5. **Eliminate duplication** — the vacancy repo and other consumers import from `models/` instead of copying schemas.

## Architecture

### Schema Placement Rules

| Category | Destination | Rationale |
|---|---|---|
| Domain schemas (Applicant, VacancyDTO, JobSearch, Activity, CommuteInfo, AppSetupState, AppConfig, etc.) | `src/models/<domain>/schemas.ts` | Both `app/` (incoming validation) and `repositories/` (hydration) may legally import `models/*`. Eliminates the repo↔api duplication. |
| UI response wrappers (`ApplicantListResponseSchema`, `VacancyListResponseSchema`, `ContentSchema`, etc.) | Local to each `src/ui/data/*.ts` file | The UI owns the IPC response contract. Composed from `models/*` schemas. |
| Generic utility schemas (`OkSchema`, `CreatedIdSchema`, `DeletedIdSchema`) | `src/utils/schemas.ts` | Shared between `app/` (where outgoing `.parse()` is removed) and `ui/data/` (where response parsing is kept). Kept minimal. |
| Plugin API schemas (Arbeitsagentur response, Google Maps distance matrix, OpenAI completion response) | Stay in plugin files as private named `const` | Plugin interfaces are already type-safe. These are internal parsing guards, not exported. |
| JobPosting JSON-LD schemas | Stay as private named `const` in `xing/` and `dm/` | Site-specific parsing; similarity is coincidental. |

### Key Behavior Change in `app/`

- **Remove outgoing `.parse()` calls** from IPC handlers. TypeScript already enforces return types on both sides of the IPC boundary.
- **Keep incoming `.parse()` calls** for IPC arguments (e.g. `ApplicantSchema.parse(data)`), because arguments arrive as `unknown`.
- Delete `src/app/schemas.ts`.

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

### `src/models/applicant/index.ts`

Add `export * from "./schemas.js"`.

### `src/models/vacancy/index.ts`

Add `export * from "./schemas.js"`.

### `src/models/job-search/index.ts`

Add `export * from "./schemas.js"`.

### `src/models/setup/index.ts`

Add `export * from "./schemas.js"`.

### `src/models/config/index.ts`

Add `export * from "./schemas.js"`.

### `src/models/secrets/index.ts`

Add `export * from "./schemas.js"`.

### `src/repositories/vacancy/sqlite/index.ts`

- Delete local copies of `VacancyContactSchema`, `CommuteInfoSchema`, `ActivitySchema`, `VacancyDTOSchema`.
- Import from `@/models/vacancy` instead.

### `src/repositories/job-search/sqlite/index.ts`

- Import `JobSearchSchema` and `JobSearchEditorSnapshotSchema` from `@/models/job-search` instead of `@/api`.

### `src/repositories/applicant/sqlite/index.ts`

- Import `ApplicantSchema` from `@/models/applicant` instead of `@/api`.

### `src/app/ipc-applicants.ts`

- Import `ApplicantSchema`, `ApplicantListResponseSchema`, `CreatedIdSchema`, `ApplicantDraftResponseSchema`, `SuggestionsResponseSchema` from `models/applicant` or define wrappers locally.
- Remove outgoing `.parse()` calls on `{ ok: true }` and `{ id }` — return plain objects.
- Keep incoming `.parse()` for `ApplicantSchema.parse(data)`.

### `src/app/ipc-settings.ts`

- Import schemas from `models/config`, `models/secrets`, `utils/schemas`.
- Remove outgoing `.parse()` calls.

### `src/app/ipc-vacancies.ts`

- Import `VacancyWithStatusSchema`, `VacancyListResponseSchema`, `ContentSchema` from `models/vacancy` or define locally.
- Remove outgoing `.parse()` calls.
- Keep `VacancyWithStatusSchema.parse()` for `job-searches:vacancies:load` (it builds a computed object).

### `src/app/ipc-setup.ts`

- Import `AppSetupStateSchema`, `SetupStateLoadResultSchema` from `models/setup`.
- Remove outgoing `.parse()` calls.

### `src/app/ipc-job-searches.ts`

- Import schemas from `models/job-search`.
- Remove outgoing `.parse()` calls.
- Keep incoming `.parse()` for `JobSearchSchema.parse(data)` and `JobSearchEditorSnapshotSchema.parse(draft)`.

### `src/ui/data/applicants.ts`

- Define local response wrappers:
  - `ApplicantListResponseSchema`
  - `ApplicantDraftResponseSchema`
  - `SuggestionsResponseSchema`
- Import domain schemas (`ApplicantSchema`) from `models/applicant`.
- Remove `@/api` import.

### `src/ui/data/settings.ts`

- Define local response wrappers:
  - `LlmProviderInfoSchema` → import from `models/config`
  - `CommuteProviderInfoSchema` → import from `models/config`
  - `MaskedSecretsRecordSchema` → import from `models/secrets`
  - `SecretTestResultSchema` → import from `models/secrets`
  - `ResolvedConfigSchema` → import from `models/config`
  - `LlmModelSchema` → import from `models/config`
- Remove `@/api` import.

### `src/ui/data/setup.ts`

- Define local wrappers:
  - `SetupStateLoadResultSchema`
  - `AppSetupStateSchema` → import from `models/setup`
  - `ClearDataOkSchema` → import from `utils/schemas`
- Remove `@/api` import.

### `src/ui/data/job-searches.ts`

- Define local response wrappers:
  - `JobSearchListResponseSchema`
  - `JobSearchDraftResponseSchema`
  - `CreatedJobSearchIdSchema`
  - `ContentSchema`
  - `VacancyWithStatusSchema`
  - `VacancyListResponseSchema`
- Import domain schemas from `models/job-search` and `models/vacancy`.
- Remove `@/api` import.

### `src/ui/data/job-search-crawl.ts`

- Define local `SitesListResponseSchema`.
- Remove `@/api` import.

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

## Error Handling

No behavioral changes to error handling. Zod parse failures on IPC arguments will still throw, caught by the existing IPC handler wrapper.

## Testing

- Run `npm run fix` to catch lint/import issues.
- Run `npm test:all` to verify no runtime regressions from schema moves.
- Verify `npm run build` passes (no broken type references).

## Dependencies

No new dependencies. Existing `zod` usage remains unchanged.
