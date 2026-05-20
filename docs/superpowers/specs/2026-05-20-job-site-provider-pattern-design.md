# Job-Site Plugin: Provider Pattern + Empty-String Sentinels + Test Simplification

## Goal

Align job-site plugins with the LLM provider pattern, eliminate optional fields from data models, and simplify integration tests.

## Architecture

```
src/plugins/job-site/
├── index.ts              # JobSiteProvider, VacancyAddress, DateString interfaces, PROVIDERS array, public API
├── make-date-string.ts   # makeDateString() factory — normalizes raw date strings to ISO 8601 DateString
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

### `JobSiteProviderInfo` and `JobSiteProvider` (mirrors LLM's `LlmProviderInfo` / `LlmProvider`)

```ts
interface JobSiteProviderInfo {
  readonly id: string
  readonly name: string
  readonly supportedModes: readonly SearchMode[]
}

interface JobSiteProvider extends JobSiteProviderInfo {
  createScraper(browser: Browser): JobSite
}
```

`getJobSiteProviders()` returns `JobSiteProviderInfo[]`.

### LLM provider interfaces (same extend-info pattern)

```ts
interface LlmProviderInfo {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly instructions: string
}

interface LlmProvider extends LlmProviderInfo {
  createClient(apiKey: string, model: string): LlmClient
  createModelRegistry(): LlmModelRegistry
  ping(apiKey: string): Promise<boolean>
}
```

Replaces the current `type LlmProviderInfo = Pick<LlmProvider, ...>` with an explicit interface. The rest of `LlmClient`, `LlmModelRegistry`, etc. are unchanged.



### `JobSite` (pure scraper — no identity or metadata)

```ts
interface JobSite {
  getVacancyList(criteria: SearchCriteria, pageId?: string): Promise<VacancyListPage>
  getVacancyDetails(url: string): Promise<VacancyDetails>
}
```

`name` and `supportedModes` are removed. Identity and mode resolution live solely on `JobSiteProvider`. The crawler receives providers (which carry metadata) and calls `provider.createScraper(browser)` internally when it needs to scrape.

### `VacancyDetails`

```ts
interface VacancyDetails {
  url: string
  title: string
  company: string
  address: VacancyAddress        // was address?: string
  descriptionHtml: string        // was descriptionHtml?: string
  startDate: DateString          // was startDate?: string
  publishedAt: DateString        // was publishedAt?: string
  contact: VacancyContact        // was contact?: VacancyContact
}
```

### `VacancyContact` (all fields required `string`)

```ts
interface VacancyContact {
  name: string                   // was name?: string
  email: string                  // was email?: string
  phone: string                  // was phone?: string
}
```

Empty string `""` means "no data" throughout. No `undefined`, no `?`.

### `VacancyAddress` (class with helpers)

```ts
class VacancyAddress {
  constructor(
    readonly street: string,
    readonly zipCode: string,
    readonly city: string,
  ) {}

  /** Flat string for storage and commute. Format: "street, zipCode city" (skips empty parts). */
  format(): string

  /** True when street, zipCode, and city are all non-empty. */
  isValid(): boolean
}
```

An empty (absent) address is `new VacancyAddress("", "", "")`. The `format()` method skips empty components: `"Musterstraße 1, 10115 Berlin"`, `"Berlin"`, `"10115 Berlin"`.

### `DateString` (branded wrapper, like `JobSearchID`)

```ts
interface DateString {
  readonly value: string  // ISO 8601 date, e.g. "2026-01-15"
}
```

A factory function `makeDateString(raw: string): DateString` normalizes the input to ISO 8601 at the extraction boundary. If the input cannot be parsed, returns `""` as the value. Consumers extract `.value` for the plain ISO string.

`SearchCriteria`, `VacancyListPage`, and `SearchMode` are unchanged.

## Per-Site Extraction Changes

Each site's `extractVacancy` (or equivalent) must return a complete `VacancyDetails` with all fields present. Empty strings for missing data.

| Site | What changes |
|------|-------------|
| **arbeitsagentur** | `contact` → non-optional `VacancyContact`. `buildAddressFromLocations` returns `VacancyAddress` (API gives `strasse`, `plz`, `ort` — map directly). Dates normalized to `DateString` via `makeDateString()`. `descriptionHtml` gets `?? ""`. |
| **dm** | Add missing `startDate`, `contact`, `publishedAt`. JSON-LD gives `streetAddress`/`postalCode`/`addressLocality` → map to `VacancyAddress`. HTML fallback parsed from `"Adresse"` `<dd>`. Dates via `makeDateString()`. `descriptionHtml` gets `?? ""`. |
| **xing** | Add missing `startDate`. JSON-LD gives structured address → map to `VacancyAddress`. HTML fallback parsed from location selector. Dates via `makeDateString()`. `extractContact` returns `VacancyContact` (all-empty when nothing found). |
| **zalando** | Add missing `startDate`, `publishedAt`. Flat location text from `<dd>` parsed into `VacancyAddress` (best-effort split on `", "`; city-only when just a city name). Dates via `makeDateString()`. `descriptionHtml` gets `?? ""`. `createContact` returns `VacancyContact` (never `undefined`). |

### Internal helpers

`normalizeOptionalText` stays as-is (`string | undefined` return). Callers add `?? ""` at the boundary.

`makeDateString(raw: string): DateString` — new shared utility. Parses ISO 8601, German date formats (`DD.MM.YYYY`), and JSON-LD dates. Returns `{ value: "" }` for unparseable input.

`VacancyAddress` — class with `format()` for flat string output and `isValid()` for quality checks. Each extraction function constructs one from its source fields.

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

**Address:** `details.address` is now a `VacancyAddress`. Use `details.address.isValid()` to decide whether to include it, and `details.address.format()` to get the flat string for the model's `addresses: string[]` and for commute lookups. The old `details.address ? [details.address] : []` becomes `details.address.isValid() ? [details.address.format()] : []`.

**Dates:** `details.startDate` and `details.publishedAt` are `DateString`. Extract `.value` for the model (which stores `string`). `details.startDate.value` replaces `details.startDate ?? ""`.

### `src/services/site-crawler/site-crawler.ts`

`CrawlOptions.sites: JobSite[]` → `CrawlOptions.providers: JobSiteProvider[]`. Adds `browser: Browser` to `CrawlOptions`. The crawler calls `provider.createScraper(options.browser)` internally for each provider, and reads `provider.name` / `provider.supportedModes` directly for logging and mode resolution.

### `src/services/site-crawler/paginate.ts`

`resolveEffectiveMode(site, mode)` → `resolveEffectiveMode(supportedModes, mode)` — takes `readonly SearchMode[]` directly instead of a `JobSite`.

`fetchSearchPage(site, criteria, pageId, pageNumber)` → `fetchSearchPage(scraper, siteName, criteria, pageId, pageNumber)` — takes a `JobSite` (scraper) and a `string` (site name for error logging) separately.

### `src/services/vacancy-scanner/vacancy-scanner.ts`

- Constructor: receives `listProviderIds: () => string[]` and `getProvider: (id: string) => JobSiteProvider` (replaces `listJobSiteNames`)
- `scan()`: loses `siteFactory: JobSiteFactory` parameter, gains `browser: Browser`. Resolves provider IDs → providers internally, passes `{ providers, browser }` to `siteCrawler.crawl()`

### `src/app/crawl-manager.ts`

Passes `browser` directly to `vacancyScanner.scan()` instead of wrapping it in a factory closure.

### `src/app/composition/create-services.ts`

`getJobSiteNames` → `getJobSiteProviderIds`. Additionally passes `getJobSiteProvider` to `VacancyScanner` constructor (for ID → provider resolution).

### `src/app/ipc-settings.ts`

`sites:list` handler: `getJobSiteInfos()` → `getJobSiteProviders()` (return type is compatible — both have `name`).

## Test Changes

### Unit tests (`{site}/index.test.ts`)

- `createXingSite(browser)` → `XingProvider.createScraper(browser)` (access the exported provider, not a free function)
- `createDmSite(browser)` → `DmProvider.createScraper(browser)`, etc.
- Address assertions use `vacancy.address.isValid()` or check individual `street`/`zipCode`/`city` fields
- Date assertions check `vacancy.startDate.value` / `vacancy.publishedAt.value` for ISO 8601 format or empty string
- `descriptionHtml` assertions: `expect(vacancy.descriptionHtml.length).toBeGreaterThan(0)` replaces `toBeTruthy()`
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
const SKIP_SITES = new Set(["xing"])

for (const provider of getJobSiteProviders()) {
  test.skipIf(SKIP_SITES.has(provider.id))(`/${provider.id} ...`, async () => {
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
| `src/plugins/job-site/index.ts` | New interfaces (`JobSiteProvider`, `JobSiteProviderInfo`, `VacancyAddress`, `DateString`), `PROVIDERS` array, `getJobSiteProviders()`, `getJobSiteProvider()`, `getJobSiteProviderIds()`. Remove `REGISTRY`, `createJobSite()`, `getJobSiteInfos()`, `getJobSiteNames()`, `SiteEntry`, `isRegistryKey`. |
| `src/plugins/job-site/make-date-string.ts` | New file: `makeDateString(raw)` normalizes to ISO 8601 `DateString`. |
| `src/plugins/llm/index.ts` | `LlmProviderInfo` becomes explicit interface (not `Pick`), `LlmProvider` extends it. Same extend-info pattern. |
| `src/plugins/job-site/arbeitsagentur/index.ts` | Export `ArbeitsagenturProvider: JobSiteProvider`. Extraction returns all-required fields. |
| `src/plugins/job-site/dm/index.ts` | Export `DmProvider: JobSiteProvider`. Extraction returns all-required fields. |
| `src/plugins/job-site/xing/index.ts` | Export `XingProvider: JobSiteProvider`. Extraction returns all-required fields. |
| `src/plugins/job-site/zalando/index.ts` | Export `ZalandoProvider: JobSiteProvider`. Extraction returns all-required fields. |
| `src/plugins/job-site/{site}/index.test.ts` | Update factory calls to provider access, fix assertions. |
| `src/plugins/job-site/integration.test.ts` | Uses local `SKIP_SITES` set (unchanged mechanism). Generic quality check replaces Berlin regex. |
| `src/services/vacancy-processor/process.ts` | Delete `contactFromDetails()`, simplify field access. |
| `src/services/vacancy-processor/process.test.ts` (or equivalent) | Update for simplified `process.ts`. |
| `src/services/site-crawler/site-crawler.ts` | `CrawlOptions.sites` → `providers`, adds `browser`. Internally calls `createScraper` and reads provider metadata. |
| `src/services/site-crawler/paginate.ts` | `resolveEffectiveMode` takes `supportedModes` directly. `fetchSearchPage` takes `scraper` + `siteName` separately. |
| `src/services/vacancy-scanner/vacancy-scanner.ts` | Constructor: receives `listProviderIds` + `getProvider`. `scan()`: loses `siteFactory`, gains `browser`. |
| `src/app/crawl-manager.ts` | Passes `browser` directly to `scan()` (no more factory closure). |
| `src/app/composition/create-services.ts` | `getJobSiteNames` → `getJobSiteProviderIds`, passes `getJobSiteProvider` to scanner. |
| `src/app/ipc-settings.ts` | `getJobSiteInfos()` → `getJobSiteProviders()`. |


## Out of Scope

- Changing `normalizeOptionalText` or other shared utilities
- Adding new job-site plugins
- Integration test timeouts or infrastructure
- UI component changes (they consume `models/vacancy`, which already uses non-optional `VacancyContact` — no changes needed)
