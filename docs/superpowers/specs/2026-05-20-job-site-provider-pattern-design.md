# Job-Site Plugin: Provider Pattern + Empty-String Sentinels + Test Simplification

## Goal

Align job-site plugins with the LLM provider pattern, eliminate optional fields from data models, and simplify integration tests.

## Architecture

```
src/plugins/job-site/
├── index.ts              # JobSiteProvider interface, PROVIDERS array, public API
├── arbeitsagentur/
│   ├── index.ts          # exports ArbeitsagenturProvider: JobSiteProvider
│   └── index.test.ts
├── dm/
│   ├── index.ts
│   ├── html_samples/
│   └── index.test.ts
├── xing/
│   ├── index.ts
│   ├── html_samples/
│   └── index.test.ts
├── zalando/
│   ├── index.ts
│   ├── html_samples/
│   └── index.test.ts
├── utils/
│   └── index.ts
└── integration.test.ts
```

### Registration (mirrors `src/plugins/llm/`)

Each site module (`arbeitsagentur/index.ts`, etc.) exports a `JobSiteProvider` object literal. `index.ts` imports each and collects them in a `PROVIDERS` array.

Public API:
- `getJobSiteProviders()` → `JobSiteProviderInfo[]` (id, name, supportedModes)
- `getJobSiteProvider(id)` → `JobSiteProvider`
- `getJobSiteProviderIds()` → `string[]` (replaces `getJobSiteNames()`)

The `REGISTRY` record is removed. The `createJobSite()` function is removed — callers use `getJobSiteProvider(id).createScraper(browser)` instead.

## Interfaces

### `JobSiteProvider` (new — the static provider)

```ts
interface JobSiteProvider {
  readonly id: string
  readonly name: string
  readonly supportedModes: readonly SearchMode[]
  readonly skipIntegrationTests: boolean
  createScraper(browser: Browser): JobSite
}

interface JobSiteProviderInfo {
  id: string
  name: string
  supportedModes: readonly SearchMode[]
}
```

`getJobSiteProviders()` returns `JobSiteProviderInfo[]` (subset, like LLM's `LlmProviderInfo`).

### `JobSite` (unchanged name, created by provider)

```ts
interface JobSite {
  readonly name: string
  readonly supportedModes: SearchMode[]
  getVacancyList(criteria: SearchCriteria, pageId?: string): Promise<VacancyListPage>
  getVacancyDetails(url: string): Promise<VacancyDetails>
}
```

`name` and `supportedModes` stay on the scraper because `site-crawler` reads them from the instance.

### `VacancyDetails` (all fields required `string`)

```ts
interface VacancyDetails {
  url: string
  title: string
  company: string
  address: string            // was address?: string
  descriptionHtml: string    // was descriptionHtml?: string
  startDate: string          // was startDate?: string
  publishedAt: string        // was publishedAt?: string
  contact: VacancyContact    // was contact?: VacancyContact
}
```

### `VacancyContact` (all fields required `string`)

```ts
interface VacancyContact {
  name: string               // was name?: string
  email: string              // was email?: string
  phone: string              // was phone?: string
}
```

Empty string `""` means "no data" throughout. No `undefined`, no `?`.

`SearchCriteria`, `VacancyListPage`, and `SearchMode` are unchanged.

## Per-Site Extraction Changes

Each site's `extractVacancy` (or equivalent) must return a complete `VacancyDetails` with all fields present. Empty strings for missing data.

| Site | What changes |
|------|-------------|
| **arbeitsagentur** | `contact: undefined` → `{ name: "", email: "", phone: "" }`. `buildAddressFromLocations` return `string \| undefined` → `string` (`""` when no address). `descriptionHtml` / `startDate` / `publishedAt` get `?? ""`. |
| **dm** | Add missing `startDate: ""` and `contact: { name: "", email: "", phone: "" }`. Address fallback chain needs terminal `?? ""`. `descriptionHtml` / `publishedAt` get `?? ""`. |
| **xing** | Add missing `startDate: ""`. `address` needs terminal `?? ""`. `extractContact` must return `VacancyContact` (empty name/phone when only email present, or all-empty when nothing found). |
| **zalando** | Add missing `startDate: ""` and `publishedAt: ""`. `address` from `normalizeOptionalText` needs `?? ""`. `descriptionHtml` needs `?? ""`. `createContact` must return `VacancyContact` (never `undefined`). |

### Internal helpers

`normalizeOptionalText` stays as-is (`string | undefined` return). Callers add `?? ""` at the boundary where they construct `VacancyDetails`. No new utility needed.

## Downstream Impact

### `src/services/vacancy-processor/process.ts`

`contactFromDetails()` function is deleted. The `?? ""` fallbacks and `?.` guards on contact fields disappear.

Before:
```ts
const contact = contactFromDetails(details)
// contactFromDetails had: name: details.contact?.name ?? "", etc.
```

After:
```ts
const contact = details.contact  // already VacancyContact with string fields
```

`details.address ? [details.address] : []` stays — an empty string still produces an empty array, which is correct behavior.

### `src/services/site-crawler/site-crawler.ts` and `paginate.ts`

No interface changes — the crawler still receives `JobSite[]`. The factory that creates those `JobSite` instances changes in the layers above.

### `src/services/vacancy-scanner/vacancy-scanner.ts`

- Constructor: `listJobSiteNames: () => string[]` → `listJobSiteProviderIds: () => string[]`
- `scan()`: `JobSiteFactory` signature stays `(id: string) => JobSite` — the factory implementation changes, but the scanner's API is unchanged

### `src/app/crawl-manager.ts`

Factory changes from `(name) => createJobSite(name, browser)` to `(id) => getJobSiteProvider(id).createScraper(browser)`.

### `src/app/composition/create-services.ts`

`getJobSiteNames` → `getJobSiteProviderIds`.

### `src/app/ipc-settings.ts`

`sites:list` handler: `getJobSiteInfos()` → `getJobSiteProviders()` (return type is compatible — both have `name`).

## Test Changes

### Unit tests (`{site}/index.test.ts`)

- `createXingSite(browser)` → `XingProvider.createScraper(browser)` (access the exported provider, not a free function)
- `createDmSite(browser)` → `DmProvider.createScraper(browser)`, etc.
- Assertions that check `toBeTruthy()` on optional fields switch to checking non-empty strings: `expect(vacancy.address.length).toBeGreaterThan(0)` instead of `expect(vacancy.address).toBeTruthy()`
- Tests that omit optional fields when constructing expected results must include all fields

### Integration test (`integration.test.ts`)

Before:
```ts
const SKIPPED_SITES = new Set(["xing"])  // hardcoded in test

for (const { name, supportedModes } of getJobSiteInfos()) {
  const skip = SKIPPED_SITES.has(name)
  test.skipIf(skip)(`${name} ...`, async () => {
    const site = createJobSite(name, browser)
    // ...
  })
}
```

After:
```ts
for (const provider of getJobSiteProviders()) {
  test.skipIf(provider.skipIntegrationTests)(`${provider.id} ...`, async () => {
    const site = provider.createScraper(browser)
    // ...
  })
}
```

**Pagination test:** unchanged (unique URLs across max 3 pages, overlapping diagnostics logged).

**Vacancy details test:** replaces Berlin geography check with a generic quality assertion: scrape up to 5 vacancies, assert at least one has non-empty `title`, non-empty `company`, and non-empty `url`. This confirms the scraper produces usable data without coupling to a specific city or regex.

### `vacancy-processor` tests

Tests that relied on `contactFromDetails` or optional field guards need updates matching the simplified `process.ts`. No behavioral change — same output, less indirection.

## Files Touched

| File | Change |
|------|--------|
| `src/plugins/job-site/index.ts` | New interfaces, `PROVIDERS` array, `getJobSiteProviders()`, `getJobSiteProvider()`. Remove `REGISTRY`, `createJobSite()`, `getJobSiteInfos()`, `getJobSiteNames()`, `SiteEntry`, `isRegistryKey`. |
| `src/plugins/job-site/arbeitsagentur/index.ts` | Export `ArbeitsagenturProvider: JobSiteProvider`. Extraction returns all-required fields. |
| `src/plugins/job-site/dm/index.ts` | Export `DmProvider: JobSiteProvider`. Extraction returns all-required fields. |
| `src/plugins/job-site/xing/index.ts` | Export `XingProvider: JobSiteProvider`. Extraction returns all-required fields. |
| `src/plugins/job-site/zalando/index.ts` | Export `ZalandoProvider: JobSiteProvider`. Extraction returns all-required fields. |
| `src/plugins/job-site/{site}/index.test.ts` | Update factory calls to provider access, fix assertions. |
| `src/plugins/job-site/integration.test.ts` | Remove `SKIPPED_SITES`, use `skipIntegrationTests`, generic quality check. |
| `src/services/vacancy-processor/process.ts` | Delete `contactFromDetails()`, simplify field access. |
| `src/services/vacancy-processor/process.test.ts` (or equivalent) | Update for simplified `process.ts`. |
| `src/services/site-crawler/site-crawler.ts` | No interface changes. |
| `src/services/site-crawler/paginate.ts` | No changes. |
| `src/services/vacancy-scanner/vacancy-scanner.ts` | `listJobSiteNames` → `listJobSiteProviderIds` (constructor param rename). |
| `src/app/crawl-manager.ts` | Factory: `createJobSite(name, browser)` → `getJobSiteProvider(id).createScraper(browser)`. |
| `src/app/composition/create-services.ts` | `getJobSiteNames` → `getJobSiteProviderIds`. |
| `src/app/ipc-settings.ts` | `getJobSiteInfos()` → `getJobSiteProviders()`. |

## Out of Scope

- Changing `normalizeOptionalText` or other shared utilities
- Adding new job-site plugins
- Changing the LLM provider pattern
- Integration test timeouts or infrastructure
- UI component changes (they consume `models/vacancy`, which already uses non-optional `VacancyContact` — no changes needed)
