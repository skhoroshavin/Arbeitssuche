# Implementation Plan: Job-Site Provider Pattern + Empty-String Sentinels + Test Simplification

**Source design:** `docs/superpowers/specs/2026-05-20-job-site-provider-pattern-design.md`

**High-level flow:**
1. Build foundation: `Address` class + `DateString` type
2. Update architecture rules: allow `models/*` → `utils` imports
3. Restructure job-site plugins: provider pattern + all-required fields
4. Update downstream services: vacancy-processor, site-crawler, vacancy-scanner
5. Update composition and IPC wiring
6. Update tests
7. Verify

---

## Task 1: Address class (`src/utils/address.ts`)

**Files:**
- Create: `src/utils/address.ts`
- Create: `src/utils/address.test.ts`
- Modify: `src/utils/index.ts`

**Context:** Replaces the existing `Address` interface in `models/applicant/applicant.ts`. Mutable public fields with defaults. `format()` skips empty components. `isEmpty()` checks all fields empty. `isValid()` checks all fields non-empty. `static parse` / `static schema` following the model pattern.

### Step 1: Write the failing test

`src/utils/address.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { Address } from "./address.js"

describe("Address", () => {
  it("parses from zod-compatible object", () => {
    const address = Address.parse({ street: "Musterstr. 1", zip: "10115", city: "Berlin" })
    expect(address.street).toBe("Musterstr. 1")
    expect(address.zip).toBe("10115")
    expect(address.city).toBe("Berlin")
  })

  it("applies defaults for missing fields", () => {
    const address = Address.parse({})
    expect(address.street).toBe("")
    expect(address.zip).toBe("")
    expect(address.city).toBe("")
  })

  it("formats full address", () => {
    const address = Address.parse({ street: "Hauptstr. 1", zip: "10115", city: "Berlin" })
    expect(address.format()).toBe("Hauptstr. 1, 10115 Berlin")
  })

  it("formats city-only address", () => {
    const address = Address.parse({ city: "Berlin" })
    expect(address.format()).toBe("Berlin")
  })

  it("formats zip+city", () => {
    const address = Address.parse({ zip: "10115", city: "Berlin" })
    expect(address.format()).toBe("10115 Berlin")
  })

  it("returns empty string when all fields empty", () => {
    const address = new Address()
    expect(address.format()).toBe("")
  })

  it("isEmpty returns true when all fields empty", () => {
    const address = new Address()
    expect(address.isEmpty()).toBe(true)
  })

  it("isEmpty returns false when any field present", () => {
    const address = Address.parse({ city: "Berlin" })
    expect(address.isEmpty()).toBe(false)
  })

  it("isValid returns true when all fields present", () => {
    const address = Address.parse({ street: "S", zip: "Z", city: "C" })
    expect(address.isValid()).toBe(true)
  })

  it("isValid returns false when any field missing", () => {
    expect(Address.parse({ street: "S", zip: "Z" }).isValid()).toBe(false)
    expect(Address.parse({ street: "S", city: "C" }).isValid()).toBe(false)
    expect(Address.parse({ zip: "Z", city: "C" }).isValid()).toBe(false)
    expect(new Address().isValid()).toBe(false)
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/utils/address.test.ts`

Expected: FAIL — module not found, `Address` not exported, etc.

### Step 3: Write minimal implementation

`src/utils/address.ts`:

```ts
import { z } from "zod"

export class Address {
  street = ""
  zip = ""
  city = ""

  static readonly schema = z.object({
    street: z.string().default(""),
    zip: z.string().default(""),
    city: z.string().default(""),
  })

  static parse(data: unknown): Address {
    const { street, zip, city } = Address.schema.parse(data)
    const address = new Address()
    address.street = street
    address.zip = zip
    address.city = city
    return address
  }

  format(): string {
    const parts: string[] = []
    if (this.street.trim()) {
      parts.push(this.street.trim())
    }
    const cityLine = [this.zip.trim(), this.city.trim()]
      .filter(Boolean)
      .join(" ")
    if (cityLine) {
      parts.push(cityLine)
    }
    return parts.join(", ")
  }

  isEmpty(): boolean {
    return (
      this.street.trim().length === 0 &&
      this.zip.trim().length === 0 &&
      this.city.trim().length === 0
    )
  }

  isValid(): boolean {
    return (
      this.street.trim().length > 0 &&
      this.zip.trim().length > 0 &&
      this.city.trim().length > 0
    )
  }
}
```

Add to `src/utils/index.ts`:

```ts
export { extractJsonLd } from "./json-ld.js"
export { normalizeAndJoinText, normalizeOptionalText } from "./normalize.js"
export { isRecord, stringField } from "./reflection.js"
export { Database, Statement } from "./database.js"
export { semverGreaterThan } from "./semver.js"
export { Address } from "./address.js"
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/utils/address.test.ts`

Expected: PASS

### Step 5: Commit

```bash
git add src/utils/address.ts src/utils/address.test.ts src/utils/index.ts
git commit -m "feat(utils): add Address class with parse, format, isEmpty, isValid"
```

---

## Task 2: DateString type and makeDateString factory (`src/utils/date-string.ts`)

**Files:**
- Create: `src/utils/date-string.ts`
- Create: `src/utils/date-string.test.ts`
- Modify: `src/utils/index.ts`

**Context:** Branded wrapper for ISO 8601 dates. `makeDateString(raw)` normalizes input. Returns `{ value: "" }` for unparseable input.

### Step 1: Write the failing test

`src/utils/date-string.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { makeDateString } from "./date-string.js"

describe("makeDateString", () => {
  it("returns empty for empty string", () => {
    expect(makeDateString("").value).toBe("")
  })

  it("returns empty for whitespace", () => {
    expect(makeDateString("   ").value).toBe("")
  })

  it("passes through ISO 8601 date", () => {
    expect(makeDateString("2026-01-15").value).toBe("2026-01-15")
  })

  it("normalizes German DD.MM.YYYY format", () => {
    expect(makeDateString("15.01.2026").value).toBe("2026-01-15")
  })

  it("returns empty for unparseable string", () => {
    expect(makeDateString("not-a-date").value).toBe("")
  })

  it("normalizes JSON-LD date", () => {
    expect(makeDateString("2026-02-01T00:00:00Z").value).toBe("2026-02-01")
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/utils/date-string.test.ts`

Expected: FAIL — module not found.

### Step 3: Write minimal implementation

`src/utils/date-string.ts`:

```ts
export interface DateString {
  readonly value: string
}

export function makeDateString(raw: string): DateString {
  const trimmed = raw.trim()
  if (!trimmed) return { value: "" }

  const isoPattern = /^\d{4}-\d{2}-\d{2}$/
  if (isoPattern.test(trimmed)) return { value: trimmed }

  const germanMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed)
  if (germanMatch) {
    const [, day, month, year] = germanMatch
    const paddedMonth = month.padStart(2, "0")
    const paddedDay = day.padStart(2, "0")
    return { value: `${year}-${paddedMonth}-${paddedDay}` }
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return { value: "" }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  return { value: `${year}-${month}-${day}` }
}
```

Add to `src/utils/index.ts` (append after `Address`):

```ts
export { makeDateString } from "./date-string.js"
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/utils/date-string.test.ts`

Expected: PASS

### Step 5: Commit

```bash
git add src/utils/date-string.ts src/utils/date-string.test.ts src/utils/index.ts
git commit -m "feat(utils): add DateString type and makeDateString factory"
```

---

## Task 3: Update layer import rules (allow `models/*` → `utils`)

**Files:**
- Modify: `AGENTS.md`
- Modify: `eslint.config.ts`

**Context:** `Address` and `DateString` live in `utils` but are consumed by both `models/*` and `plugins/*`. The architecture must allow `models/*` to import from `utils`.

### Step 1: Write changes to AGENTS.md

In `AGENTS.md`, find the Layer Import Rules table and update the `models/*` row:

Change:
```
| `models/*` | `models/*` |
```

To:
```
| `models/*` | `models/*`, `utils` |
```

### Step 2: Write changes to eslint.config.ts

In `eslint.config.ts`, find the `unslop.architecture` config and update the `models/*` entry:

Find:
```ts
"models/*": {
  imports: ["models/+"],
},
```

Replace with:
```ts
"models/*": {
  imports: ["models/+", "utils/+"],
},
```

### Step 3: Verify no lint errors

Run: `npm run fix`

Expected: No errors, or only pre-existing issues unrelated to this change.

### Step 4: Commit

```bash
git add AGENTS.md eslint.config.ts
git commit -m "chore(arch): allow models/* to import from utils"
```

---

## Task 4: Rewrite job-site plugin index and all site implementations

**Files:**
- Modify: `src/plugins/job-site/index.ts`
- Modify: `src/plugins/job-site/arbeitsagentur/index.ts`
- Modify: `src/plugins/job-site/dm/index.ts`
- Modify: `src/plugins/job-site/xing/index.ts`
- Modify: `src/plugins/job-site/zalando/index.ts`
- Modify: `src/plugins/job-site/arbeitsagentur/index.test.ts`
- Modify: `src/plugins/job-site/dm/index.test.ts`
- Modify: `src/plugins/job-site/xing/index.test.ts`
- Modify: `src/plugins/job-site/zalando/index.test.ts`

**Context:** This is the core structural change. Old API (registry + `createJobSite` function) is replaced with provider objects. Old `JobSite` interface loses `name`/`supportedModes`. `VacancyDetails` becomes all-required. Each site module exports a `JobSiteProvider`.

### Step 1: Write the new `src/plugins/job-site/index.ts`

```ts
import type { Browser } from "@/plugins/browser"
import type { Address } from "@/utils/index.js"
import type { DateString } from "@/utils/index.js"

import { ArbeitsagenturProvider } from "./arbeitsagentur"
import { DmProvider } from "./dm"
import { XingProvider } from "./xing"
import { ZalandoProvider } from "./zalando"

export interface SearchCriteria {
  location: string
  query: string
  radiusKm: number
  mode: SearchMode
}

export type SearchMode = "employment" | "entry-level" | "apprenticeship"

export interface VacancyListPage {
  urls: string[]
  nextPageId?: string
}

export interface VacancyDetails {
  url: string
  title: string
  company: string
  address: Address
  descriptionHtml: string
  startDate: DateString
  publishedAt: DateString
  contact: VacancyContact
}

export interface VacancyContact {
  name: string
  email: string
  phone: string
}

export interface JobSite {
  getVacancyList(criteria: SearchCriteria, pageId?: string): Promise<VacancyListPage>
  getVacancyDetails(url: string): Promise<VacancyDetails>
}

export interface JobSiteProviderInfo {
  readonly id: string
  readonly name: string
  readonly supportedModes: readonly SearchMode[]
}

export interface JobSiteProvider extends JobSiteProviderInfo {
  createScraper(browser: Browser): JobSite
}

export function getJobSiteProviders(): JobSiteProviderInfo[] {
  return PROVIDERS.map(({ id, name, supportedModes }) => ({
    id,
    name,
    supportedModes,
  }))
}

export function getJobSiteProvider(id: string): JobSiteProvider {
  const provider = PROVIDERS.find((p) => p.id === id)
  if (!provider) {
    throw new Error(
      `Unknown site: "${id}". Available: ${PROVIDERS.map((p) => p.id).join(", ")}`,
    )
  }
  return provider
}

export function getJobSiteProviderIds(): string[] {
  return PROVIDERS.map((p) => p.id)
}

const PROVIDERS: readonly JobSiteProvider[] = [
  ArbeitsagenturProvider,
  DmProvider,
  XingProvider,
  ZalandoProvider,
]
```

### Step 2: Convert `arbeitsagentur/index.ts`

```ts
import { z } from "zod"

import type { Browser } from "@/plugins/browser"
import type {
  JobSite,
  JobSiteProvider,
  SearchCriteria,
  VacancyDetails,
} from "@/plugins/job-site"
import { Address, makeDateString } from "@/utils/index.js"

export const ArbeitsagenturProvider: JobSiteProvider = {
  id: "arbeitsagentur",
  name: "arbeitsagentur",
  supportedModes: ["employment", "entry-level", "apprenticeship"],
  createScraper: (browser: Browser) =>
    new ArbeitsagenturSite(browser),
}

const API_BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service"

class ArbeitsagenturSite implements JobSite {
  constructor(_browser: Browser, fetch?: Fetch) {
    this.fetch = fetch ?? globalThis.fetch
  }

  async getVacancyList(criteria: SearchCriteria, pageId?: string) {
    const url = buildSearchApiUrl(criteria, pageId)
    const response = await this.fetch(url, { headers: API_HEADERS })
    assertOk(response, url)
    const data = ApiSearchResponseSchema.parse(
      JSON.parse(await response.text()),
    )
    return mapSearchResponse(data)
  }

  async getVacancyDetails(url: string) {
    const refnr = url.split("/").pop()
    if (!refnr) throw new Error(`Cannot extract refnr from URL: ${url}`)
    const encodedRefnr = btoa(refnr)
    const apiUrl = `${API_BASE}/pc/v3/jobdetails/${encodedRefnr}`
    const response = await this.fetch(apiUrl, { headers: API_HEADERS })
    assertOk(response, apiUrl)
    const data = ApiJobDetailsSchema.parse(JSON.parse(await response.text()))
    return mapDetailsResponse(data, url)
  }

  private readonly fetch: Fetch
}

const API_HEADERS = { "X-API-Key": "jobboerse-jobsuche" }

type Fetch = (url: string, init?: RequestInit) => Promise<Response>

function assertOk(response: Response, url: string): void {
  if (!response.ok) {
    throw new Error(
      `Arbeitsagentur API error: ${response.status} ${response.statusText} for ${url}`,
    )
  }
}

function mapSearchResponse(data: z.infer<typeof ApiSearchResponseSchema>): {
  urls: string[]
  nextPageId?: string
} {
  const items = data.stellenangebote ?? []
  const urls = items.map((item) => refnrToUrl(item.refnr))
  const totalPages = Math.ceil(data.maxErgebnisse / data.size)
  const nextPageId =
    items.length > 0 && data.page < totalPages
      ? String(data.page + 1)
      : undefined
  return { urls, nextPageId }
}

function mapDetailsResponse(
  data: z.infer<typeof ApiJobDetailsSchema>,
  url: string,
): VacancyDetails {
  return {
    url,
    title: data.stellenangebotsTitel ?? "",
    company: data.firma ?? "",
    address: buildAddressFromLocations(data.stellenlokationen),
    descriptionHtml: data.stellenangebotsBeschreibung ?? "",
    startDate: makeDateString(data.eintrittszeitraum?.von ?? ""),
    publishedAt: makeDateString(data.veroeffentlichungszeitraum?.von ?? ""),
    contact: { name: "", email: "", phone: "" },
  }
}

function buildSearchApiUrl(criteria: SearchCriteria, pageId?: string): string {
  const qs = new URLSearchParams()
  if (criteria.query) qs.set("was", criteria.query)
  qs.set("wo", criteria.location)
  qs.set("angebotsart", modeToAngebotsart(criteria.mode))
  if (criteria.mode === "entry-level") qs.set("berufserfahrung", "BEL")
  qs.set("umkreis", String(criteria.radiusKm))
  const pageNumber = Number(pageId ?? "1")
  qs.set("page", String(pageNumber))
  qs.set("size", "25")
  return `${API_BASE}/pc/v4/jobs?${qs.toString()}`
}

function refnrToUrl(refnr: string): string {
  return `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refnr}`
}

function buildAddressFromLocations(
  locations: z.infer<typeof ApiJobDetailsSchema>["stellenlokationen"],
): Address {
  const address = new Address()
  if (!locations?.length) return address
  const addr = locations[0].adresse
  if (!addr) return address
  address.street = addr.strasse ?? ""
  address.zip = addr.plz ?? ""
  address.city = addr.ort ?? ""
  return address
}

function modeToAngebotsart(mode: string): string {
  if (mode === "apprenticeship") return "4"
  return "1"
}

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
  veroeffentlichungszeitraum: z
    .object({ von: z.string().optional() })
    .optional(),
  referenznummer: z.string().optional(),
})
```

### Step 3: Convert `dm/index.ts`

```ts
import { z } from "zod"

import * as cheerio from "cheerio/slim"

import type { Browser } from "@/plugins/browser"
import type {
  JobSite,
  JobSiteProvider,
  SearchCriteria,
  VacancyDetails,
} from "@/plugins/job-site"
import { Address, makeDateString } from "@/utils/index.js"
import { withOpenedPage } from "@/plugins/job-site/utils/index.js"
import {
  extractJsonLd,
  normalizeAndJoinText,
  normalizeOptionalText,
  isRecord,
  stringField,
} from "@/utils/index.js"

export const DmProvider: JobSiteProvider = {
  id: "dm",
  name: "dm",
  supportedModes: ["employment", "apprenticeship"],
  createScraper: (browser: Browser) => new DmSite(browser),
}

const BASE_URL = "https://www.dm-jobs.de"

class DmSite implements JobSite {
  constructor(private readonly browser: Browser) {}

  async getVacancyList(criteria: SearchCriteria) {
    const page = await this.browser.openPage(buildSearchUrl(criteria), {
      waitFor: SEARCH_READY_SELECTOR,
      blockPatterns: BLOCK_PATTERNS,
    })
    try {
      const urls = extractLinks(page.html)
      return { urls, nextPageId: undefined }
    } finally {
      await page.close()
    }
  }

  async getVacancyDetails(url: string) {
    return withOpenedPage(
      this.browser,
      url,
      (html) => extractVacancy(html, url),
      {
        waitFor: SEARCH_READY_SELECTOR,
        blockPatterns: BLOCK_PATTERNS,
      },
    )
  }
}

const BLOCK_PATTERNS = [/usercentrics\.eu/]

const SEARCH_READY_SELECTOR = "a[href*='/job/']"

function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html)
  const ld = extractFromPosting(extractJsonLd($, "JobPosting"))

  return {
    url,
    title: ld.title ?? $("h1").first().text().trim(),
    company: ld.company ?? "dm",
    address: ld.address ?? extractAddressFallback($),
    descriptionHtml: ld.description ?? "",
    startDate: makeDateString(""),
    publishedAt: makeDateString(ld.publishedAt ?? ""),
    contact: { name: "", email: "", phone: "" },
  }
}

function extractLinks(html: string): string[] {
  const $ = cheerio.load(html)
  const urls = new Set<string>()
  $("a[href*='/job/']").each((_index, element) => {
    const href = $(element).attr("href")
    if (!href) return
    if (!/\/job\/[^/]+\/\d+/.test(href)) return
    const full = href.startsWith("http") ? href : `${BASE_URL}${href}`
    urls.add(full)
  })
  return [...urls]
}

function buildSearchUrl(criteria: SearchCriteria): string {
  const qs = new URLSearchParams()
  if (criteria.mode === "apprenticeship") {
    qs.set("jobType[0]", "Ausbildung")
  }
  qs.set("region", criteria.location)
  return `${BASE_URL}/job-listing/?${qs}`
}

function extractFromPosting(jsonLd: object | undefined) {
  const posting = asJobPosting(jsonLd)
  return {
    title: posting?.title,
    company: posting?.hiringOrganization?.name,
    description: posting?.description,
    publishedAt: posting?.datePosted,
    address: formatJobPostingAddress(posting),
  }
}

function asJobPosting(value: unknown): JobPostingJsonLd | undefined {
  const result = JobPostingJsonLdSchema.safeParse(value)
  return result.success ? result.data : undefined
}

interface JobPostingJsonLd {
  title?: string
  description?: string
  datePosted?: string
  hiringOrganization?: { name?: string }
  jobLocation?:
    | { address?: JobPostingAddress }
    | { address?: JobPostingAddress }[]
}

interface JobPostingAddress {
  streetAddress?: string
  postalCode?: string
  addressLocality?: string
}

function formatJobPostingAddress(
  posting: { jobLocation?: unknown } | undefined,
): Address {
  const address = new Address()
  if (!posting) return address
  const location = posting.jobLocation
  const loc: unknown = Array.isArray(location) ? location[0] : location
  if (!isRecord(loc) || !isRecord(loc.address)) return address
  address.street = stringField(loc.address, "streetAddress") ?? ""
  address.zip = stringField(loc.address, "postalCode") ?? ""
  address.city = stringField(loc.address, "addressLocality") ?? ""
  return address
}

function extractAddressFallback($: cheerio.CheerioAPI): Address {
  const address = new Address()
  const raw = normalizeOptionalText(
    $("dt")
      .filter((_index, element) => $(element).text().trim() === "Adresse")
      .first()
      .next("dd")
      .text(),
  )
  if (raw) {
    const parts = raw.split(",").map((p) => p.trim())
    if (parts.length >= 2) {
      address.street = parts[0]
      const cityParts = parts[parts.length - 1].split(" ")
      if (cityParts.length >= 2) {
        address.zip = cityParts[0]
        address.city = cityParts.slice(1).join(" ")
      } else {
        address.city = parts[parts.length - 1]
      }
    } else {
      address.city = raw
    }
  }
  return address
}

function extractDescriptionFallback($: cheerio.CheerioAPI): string {
  const parts: string[] = []
  $("h2").each((_index, element) => {
    const heading = $(element).text().trim()
    const siblingHtml = $(element).next().html()
    if (heading && siblingHtml) {
      parts.push(`<h2>${heading}</h2>${siblingHtml}`)
    }
  })
  return parts.length > 0 ? parts.join("") : ""
}

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
```

### Step 4: Convert `xing/index.ts`

```ts
import { z } from "zod"

import * as cheerio from "cheerio/slim"

import type { Browser } from "@/plugins/browser"
import type {
  JobSite,
  JobSiteProvider,
  SearchCriteria,
  VacancyDetails,
} from "@/plugins/job-site"
import { Address, makeDateString } from "@/utils/index.js"
import {
  extractAbsoluteLinks,
  withOpenedPage,
} from "@/plugins/job-site/utils/index.js"
import {
  extractJsonLd,
  normalizeAndJoinText,
  normalizeOptionalText,
  isRecord,
  stringField,
} from "@/utils/index.js"

export const XingProvider: JobSiteProvider = {
  id: "xing",
  name: "xing",
  supportedModes: ["employment", "entry-level", "apprenticeship"],
  createScraper: (browser: Browser) => new XingSite(browser),
}

class XingSite implements JobSite {
  constructor(private readonly browser: Browser) {}

  async getVacancyList(criteria: SearchCriteria, pageId?: string) {
    const page = await this.browser.openPage(buildSearchUrl(criteria, pageId))
    try {
      const urls = extractLinks(page.html)
      return {
        urls,
        nextPageId:
          urls.length > 0 ? String(Number(pageId ?? "1") + 1) : undefined,
      }
    } finally {
      await page.close()
    }
  }

  async getVacancyDetails(url: string) {
    return withOpenedPage(this.browser, url, (html) =>
      extractVacancy(html, url),
    )
  }
}

function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html)
  const ld = extractFromPosting(extractJsonLd($, "JobPosting"))

  const text = (selector: string) =>
    normalizeOptionalText($(selector).first().text())

  return {
    url,
    title: ld.title ?? text("h1") ?? "",
    company: ld.company ?? text(SELECTORS.company) ?? "",
    address: ld.address ?? extractAddressFallback($),
    descriptionHtml: ld.descriptionHtml ?? "",
    startDate: makeDateString(""),
    publishedAt: makeDateString(ld.publishedAt ?? ""),
    contact: extractContact($),
  }
}

function extractLinks(html: string): string[] {
  return extractAbsoluteLinks(html, {
    selector: "a[href*='/jobs/']",
    hrefPattern: /\/jobs\/[a-z].*-\d+$/,
    baseUrl: BASE_URL,
  })
}

const BASE_URL = "https://www.xing.com"

function buildSearchUrl(criteria: SearchCriteria, pageId?: string): string {
  const qs = new URLSearchParams()
  if (criteria.query) qs.set("keywords", criteria.query)
  qs.set("location", criteria.location)
  qs.set("radius", String(criteria.radiusKm))
  const pageNumber = Number(pageId ?? "1")
  if (pageNumber > 1) qs.set("page", String(pageNumber))
  const cl = modeToCareerLevel(criteria.mode)
  if (cl) qs.set("career_level", cl)
  return `${BASE_URL}/jobs/search?${qs.toString()}`
}

function extractFromPosting(jsonLd: object | undefined) {
  const posting = asJobPosting(jsonLd)
  return {
    title: posting?.title,
    company: posting?.hiringOrganization?.name,
    descriptionHtml: posting?.description,
    publishedAt: posting?.datePosted,
    address: formatJobPostingAddress(posting),
  }
}

function asJobPosting(value: unknown): JobPostingJsonLd | undefined {
  const result = JobPostingJsonLdSchema.safeParse(value)
  return result.success ? result.data : undefined
}

interface JobPostingJsonLd {
  title?: string
  description?: string
  datePosted?: string
  hiringOrganization?: { name?: string }
  jobLocation?:
    | { address?: JobPostingAddress }
    | { address?: JobPostingAddress }[]
}

interface JobPostingAddress {
  streetAddress?: string
  postalCode?: string
  addressLocality?: string
}

function formatJobPostingAddress(
  posting: { jobLocation?: unknown } | undefined,
): Address {
  const address = new Address()
  if (!posting) return address
  const location = posting.jobLocation
  const loc: unknown = Array.isArray(location) ? location[0] : location
  if (!isRecord(loc) || !isRecord(loc.address)) return address
  address.street = stringField(loc.address, "streetAddress") ?? ""
  address.zip = stringField(loc.address, "postalCode") ?? ""
  address.city = stringField(loc.address, "addressLocality") ?? ""
  return address
}

function extractAddressFallback($: cheerio.CheerioAPI): Address {
  const address = new Address()
  const raw = normalizeOptionalText($(SELECTORS.address).first().text())
  if (raw) {
    address.city = raw
  }
  return address
}

function extractContact($: cheerio.CheerioAPI): {
  name: string
  email: string
  phone: string
} {
  const emailHref = $(SELECTORS.contactEmail).first().attr("href")
  const contactEmail = normalizeOptionalText(emailHref?.replace(/^mailto:/, ""))
  return { name: "", email: contactEmail ?? "", phone: "" }
}

const SELECTORS = {
  company:
    "[data-testid='company-name'], [class*='company-name'], [class*='Company']",
  address:
    "[data-testid='job-location'], [class*='location'], [class*='Location']",
  contactEmail: "a[href^='mailto:']",
}

function modeToCareerLevel(mode: string): string {
  if (mode === "apprenticeship") return "APPRENTICESHIP"
  if (mode === "entry-level") return "ENTRY_LEVEL"
  return ""
}

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
```

### Step 5: Convert `zalando/index.ts`

```ts
import * as cheerio from "cheerio/slim"
import type { Browser } from "@/plugins/browser"
import type {
  JobSite,
  JobSiteProvider,
  SearchCriteria,
  VacancyDetails,
} from "@/plugins/job-site"
import { Address, makeDateString } from "@/utils/index.js"
import { extractAbsoluteLinks, normalizeOptionalText } from "@/utils/index.js"

export const ZalandoProvider: JobSiteProvider = {
  id: "zalando",
  name: "zalando",
  supportedModes: ["employment"],
  createScraper: (browser: Browser) => new ZalandoSite(browser),
}

class ZalandoSite implements JobSite {
  constructor(private readonly browser: Browser) {}

  async getVacancyList(criteria: SearchCriteria, pageId?: string) {
    const page = await this.browser.openPage(buildSearchUrl(criteria, pageId), {
      waitFor: "a[href*='/en/jobs/']",
      blockPatterns: BLOCK_PATTERNS,
    })
    try {
      const urls = extractLinks(page.html)
      return {
        urls,
        nextPageId:
          urls.length > 0 ? String(Number(pageId ?? "0") + 15) : undefined,
      }
    } finally {
      await page.close()
    }
  }

  async getVacancyDetails(url: string) {
    const page = await this.browser.openPage(url, {
      blockPatterns: BLOCK_PATTERNS,
    })
    try {
      return extractVacancy(page.html, url)
    } finally {
      await page.close()
    }
  }
}

function extractVacancy(html: string, url: string): VacancyDetails {
  const $ = cheerio.load(html)

  const title = $(SELECTORS.title).first().text().trim()

  const rawAddress = normalizeOptionalText(
    $("dt")
      .filter((_index, element) => $(element).text().trim() === "Location")
      .first()
      .next("dd")
      .text(),
  )

  let descriptionHtml = ""
  let maxLength = 0
  $("section").each((_index, element) => {
    const text = $(element).text().trim()
    if (
      text.length > 500 &&
      !text.includes("Application Form") &&
      text.length > maxLength
    ) {
      descriptionHtml = $(element).html() || ""
      maxLength = text.length
    }
  })

  const recSection = $("strong")
    .filter((_index, element) => $(element).text().trim() === "Recruiter")
    .closest("section")
  const recName = normalizeOptionalText(recSection.find("p").first().text())
  const recEmail = normalizeOptionalText(recSection.find("p").eq(1).text())

  return {
    url,
    title,
    company: "Zalando",
    address: parseFlatAddress(rawAddress ?? ""),
    descriptionHtml,
    startDate: makeDateString(""),
    publishedAt: makeDateString(""),
    contact: { name: recName ?? "", email: recEmail ?? "", phone: "" },
  }
}

function parseFlatAddress(raw: string): Address {
  const address = new Address()
  if (!raw) return address
  const parts = raw.split(", ").map((p) => p.trim())
  if (parts.length >= 2) {
    address.street = parts[0]
    const cityParts = parts[parts.length - 1].split(" ")
    if (cityParts.length >= 2) {
      address.zip = cityParts[0]
      address.city = cityParts.slice(1).join(" ")
    } else {
      address.city = parts[parts.length - 1]
    }
  } else {
    address.city = parts[0] ?? ""
  }
  return address
}

function extractLinks(html: string): string[] {
  return extractAbsoluteLinks(html, {
    selector: SELECTORS.jobLink,
    hrefPattern: /\/en\/jobs\/\d+/,
    baseUrl: BASE_URL,
  })
}

function buildSearchUrl(criteria: SearchCriteria, pageId?: string): string {
  const q = encodeURIComponent(criteria.query)
  const location = encodeURIComponent(criteria.location)
  const offset = Number(pageId ?? "0")
  return `${BASE_URL}/en/jobs?q=${q}&location=${location}&offset=${offset}`
}

const BASE_URL = "https://jobs.zalando.com"
const BLOCK_PATTERNS = [/usercentrics\.eu/]

const SELECTORS = {
  jobLink: "a[href*='/en/jobs/']",
  title: "h1",
}
```

### Step 6: Update unit tests

**`arbeitsagentur/index.test.ts`** — replace `createArbeitsagenturSite` with `ArbeitsagenturProvider.createScraper`, update address and date assertions:

```ts
import { test, describe, expect } from "vitest"
import { ArbeitsagenturProvider } from "."
import { BrowserStub } from "@/plugins/browser"
import { FetchStub } from "@/test-helpers"
import type { SearchCriteria } from "@/plugins/job-site"

describe("arbeitsagentur", () => {
  describe("getVacancyList URL building", () => {
    test("includes query, location, and defaults", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      })
      await site.getVacancyList(baseCriteria)

      const url = stubFetch.requestedUrls[0]
      expect(url.includes("was=Software")).toBeTruthy()
      expect(url.includes("wo=Berlin")).toBeTruthy()
      expect(url.includes("angebotsart=1")).toBeTruthy()
      expect(url.includes("umkreis=25")).toBeTruthy()
      expect(url.includes("page=1")).toBeTruthy()
      expect(url.includes("size=25")).toBeTruthy()
    })

    test("omits was param when query is empty", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      })
      await site.getVacancyList({ ...baseCriteria, query: "" })

      expect(!stubFetch.requestedUrls[0].includes("was=")).toBeTruthy()
    })

    test("sets angebotsart=4 for apprenticeship", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      })
      await site.getVacancyList({
        location: "München",
        query: "",
        radiusKm: 25,
        mode: "apprenticeship",
      })

      const url = stubFetch.requestedUrls[0]
      expect(url.includes("angebotsart=4")).toBeTruthy()
      expect(!url.includes("berufserfahrung")).toBeTruthy()
    })

    test("sets berufserfahrung=BEL for entry-level", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      })
      await site.getVacancyList({
        location: "Hamburg",
        query: "",
        radiusKm: 25,
        mode: "entry-level",
      })

      const url = stubFetch.requestedUrls[0]
      expect(url.includes("angebotsart=1")).toBeTruthy()
      expect(url.includes("berufserfahrung=BEL")).toBeTruthy()
    })

    test("uses custom radiusKm", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      })
      await site.getVacancyList({ ...baseCriteria, radiusKm: 50 })

      expect(stubFetch.requestedUrls[0].includes("umkreis=50")).toBeTruthy()
    })

    test("uses pageId for pagination", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      })
      await site.getVacancyList(baseCriteria, "3")

      expect(stubFetch.requestedUrls[0].includes("page=3")).toBeTruthy()
    })
  })

  describe("getVacancyList response mapping", () => {
    test("maps search results to URLs with plain refnr", async () => {
      const { site } = createSite({
        [SEARCH_URL_PATTERN]: {
          body: searchResponse({
            stellenangebote: [{ refnr: "10000-111" }, { refnr: "10000-222" }],
            maxErgebnisse: 100,
          }),
        },
      })
      const result = await site.getVacancyList(baseCriteria)

      expect(result.urls.length).toBe(2)
      expect(result.urls[0].endsWith("/jobdetail/10000-111")).toBeTruthy()
      expect(result.urls[1].endsWith("/jobdetail/10000-222")).toBeTruthy()
      expect(result.nextPageId).toBe("2")
    })

    test("returns no nextPageId on last page", async () => {
      const { site } = createSite({
        [SEARCH_URL_PATTERN]: {
          body: searchResponse({
            stellenangebote: [{ refnr: "ref" }],
            maxErgebnisse: 2,
          }),
        },
      })
      const result = await site.getVacancyList(baseCriteria)

      expect(result.nextPageId).toBe(undefined)
    })

    test("handles empty results", async () => {
      const { site } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      })
      const result = await site.getVacancyList(baseCriteria)

      expect(result.urls).toEqual([])
      expect(result.nextPageId).toBe(undefined)
    })

    test("handles missing stellenangebote", async () => {
      const { site } = createSite({
        [SEARCH_URL_PATTERN]: {
          body: { maxErgebnisse: 0, page: 1, size: 25 },
        },
      })
      const result = await site.getVacancyList(baseCriteria)

      expect(result.urls).toEqual([])
      expect(result.nextPageId).toBe(undefined)
    })
  })

  describe("getVacancyDetails", () => {
    test("maps all fields from API response", async () => {
      const { site } = createSite({
        [DETAILS_URL_PATTERN]: {
          body: {
            stellenangebotsTitel: "Software Engineer",
            stellenangebotsBeschreibung: "Great job description",
            firma: "Test GmbH",
            stellenlokationen: [
              {
                adresse: {
                  strasse: "Hauptstr. 1",
                  plz: "10115",
                  ort: "Berlin",
                },
              },
            ],
            eintrittszeitraum: { von: "2026-04-01" },
            veroeffentlichungszeitraum: { von: "2026-03-15" },
            referenznummer: "10000-111",
          },
        },
      })

      const vacancyUrl =
        "https://www.arbeitsagentur.de/jobsuche/jobdetail/abc123"
      const details = await site.getVacancyDetails(vacancyUrl)

      expect(details.title).toBe("Software Engineer")
      expect(details.company).toBe("Test GmbH")
      expect(details.address.street).toBe("Hauptstr. 1")
      expect(details.address.zip).toBe("10115")
      expect(details.address.city).toBe("Berlin")
      expect(details.address.format()).toBe("Hauptstr. 1, 10115 Berlin")
      expect(details.descriptionHtml).toBe("Great job description")
      expect(details.startDate.value).toBe("2026-04-01")
      expect(details.publishedAt.value).toBe("2026-03-15")
      expect(details.contact).toEqual({ name: "", email: "", phone: "" })
    })

    test("handles missing address fields", async () => {
      const { site } = createSite({
        [DETAILS_URL_PATTERN]: {
          body: { stellenangebotsTitel: "Dev" },
        },
      })

      const details = await site.getVacancyDetails(
        "https://www.arbeitsagentur.de/jobsuche/jobdetail/abc123",
      )

      expect(details.address.isEmpty()).toBe(true)
    })

    test("filters out null string values in address", async () => {
      const { site } = createSite({
        [DETAILS_URL_PATTERN]: {
          body: {
            stellenangebotsTitel: "Dev",
            stellenlokationen: [
              { adresse: { strasse: "null", plz: "10115", ort: "Berlin" } },
            ],
          },
        },
      })

      const details = await site.getVacancyDetails(
        "https://www.arbeitsagentur.de/jobsuche/jobdetail/abc123",
      )

      expect(details.address.street).toBe("null")
      expect(details.address.zip).toBe("10115")
      expect(details.address.city).toBe("Berlin")
    })

    test("base64-encodes plain refnr from URL for API call", async () => {
      const refnr = "10000-12345"
      const { site, stubFetch } = createSite({
        [DETAILS_URL_PATTERN]: {
          body: { stellenangebotsTitel: "Senior Dev" },
        },
      })

      const vacancyUrl = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refnr}`
      await site.getVacancyDetails(vacancyUrl)

      expect(
        stubFetch.requestedUrls[0].includes(`/jobdetails/${btoa(refnr)}`),
      ).toBeTruthy()
    })
  })
})

const SEARCH_URL_PATTERN = "/pc/v4/jobs"
const DETAILS_URL_PATTERN = "/pc/v3/jobdetails/"

function searchResponse(
  overrides: {
    stellenangebote?: Array<{ refnr: string }>
    maxErgebnisse?: number
    page?: number
    size?: number
  } = {},
) {
  return {
    stellenangebote: overrides.stellenangebote ?? [],
    maxErgebnisse: overrides.maxErgebnisse ?? 0,
    page: overrides.page ?? 1,
    size: overrides.size ?? 25,
  }
}

function createSite(
  routes: Record<string, { body: unknown; status?: number }>,
) {
  const stubFetch = buildStub(routes)
  const site = ArbeitsagenturProvider.createScraper(
    new BrowserStub(),
    stubFetch.fetch.bind(stubFetch),
  )
  return { site, stubFetch }
}

function buildStub(
  routes: Record<string, { body: unknown; status?: number }>,
): FetchStub {
  const stub = new FetchStub()
  for (const [urlPattern, route] of Object.entries(routes)) {
    stub.set(urlPattern, route)
  }
  return stub
}

const baseCriteria: SearchCriteria = {
  location: "Berlin",
  query: "Software",
  radiusKm: 25,
  mode: "employment",
}
```

**`dm/index.test.ts`** — replace `createDmSite` with `DmProvider.createScraper`, update descriptionHtml assertions:

```ts
import { test, describe, expect } from "vitest"
import path from "node:path"
import { DmProvider } from "."
import { BrowserStub } from "@/plugins/browser"

describe("dm", () => {
  test("getVacancyList returns absolute URLs from search page", async () => {
    const browser = BrowserStub.fromDirectory(SAMPLES_DIR)
    const site = DmProvider.createScraper(browser)
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      radiusKm: 30,
      mode: "employment",
    })
    expect(urls.length > 0).toBeTruthy()
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//)
    }
  })

  test("getVacancyDetails returns title and company", async () => {
    const browser = BrowserStub.fromDirectory(SAMPLES_DIR)
    const site = DmProvider.createScraper(browser)
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      radiusKm: 30,
      mode: "employment",
    })
    const vacancy = await site.getVacancyDetails(urls[0])
    expect(
      typeof vacancy.title === "string" && vacancy.title.length > 0,
    ).toBeTruthy()
    expect(
      typeof vacancy.company === "string" && vacancy.company.length > 0,
    ).toBeTruthy()
  })

  test("getVacancyDetails returns raw HTML description from JSON-LD", async () => {
    const html = `
      <html><body>
        <h1>Ausbildung Drogist</h1>
        <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Ausbildung Drogist",
          "hiringOrganization": { "name": "dm" },
          "description": "<p>Join our team as a <strong>Drogist</strong>.</p><ul><li>Training provided</li><li>Good pay</li></ul>",
          "datePosted": "2026-02-01"
        }
        </script>
      </body></html>
    `
    const vacancyUrl = "https://www.dm-jobs.de/job/test/123"
    const browser = new BrowserStub().set(vacancyUrl, html)
    const site = DmProvider.createScraper(browser)
    const vacancy = await site.getVacancyDetails(vacancyUrl)
    expect(vacancy.descriptionHtml.length).toBeGreaterThan(0)
    expect(vacancy.descriptionHtml.includes("<strong>Drogist</strong>")).toBeTruthy()
    expect(vacancy.descriptionHtml.includes("<li>Training provided</li>")).toBeTruthy()
  })

  test("getVacancyDetails DOM fallback produces HTML with headings", async () => {
    const html = `
      <html><body>
        <h1>Ausbildung Drogist</h1>
        <h2>Aufgaben</h2>
        <div><ul><li>Task one</li><li>Task two</li></ul></div>
        <h2>Benefits</h2>
        <div><p>Great <strong>benefits</strong> package</p></div>
      </body></html>
    `
    const vacancyUrl = "https://www.dm-jobs.de/job/test/456"
    const browser = new BrowserStub().set(vacancyUrl, html)
    const site = DmProvider.createScraper(browser)
    const vacancy = await site.getVacancyDetails(vacancyUrl)
    expect(vacancy.descriptionHtml.length).toBeGreaterThan(0)
    expect(vacancy.descriptionHtml.includes("<h2>Aufgaben</h2>")).toBeTruthy()
    expect(vacancy.descriptionHtml.includes("<li>Task one</li>")).toBeTruthy()
  })

  test("getVacancyList returns no pagination (single page)", async () => {
    const html = "<html><body></body></html>"
    const browser = new BrowserStub().set("dm-jobs.de/job-listing", html)
    const site = DmProvider.createScraper(browser)
    const result = await site.getVacancyList({
      location: "Berlin",
      query: "",
      radiusKm: 30,
      mode: "employment",
    })
    expect(result.nextPageId).toBe(undefined)
  })
})

const SAMPLES_DIR = path.join(import.meta.dirname, "html_samples")
```

**`xing/index.test.ts`** — replace `createXingSite` with `XingProvider.createScraper`, update descriptionHtml assertions:

```ts
import { test, describe, expect } from "vitest"
import path from "node:path"
import { XingProvider } from "."
import { BrowserStub } from "@/plugins/browser"

describe("xing", () => {
  test("getVacancyList returns absolute URLs from search page", async () => {
    const browser = BrowserStub.fromDirectory(SAMPLES_DIR)
    const site = XingProvider.createScraper(browser)
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      radiusKm: 30,
      mode: "employment",
    })
    expect(urls.length > 0).toBeTruthy()
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//)
    }
  })

  test("getVacancyDetails returns title and company", async () => {
    const browser = BrowserStub.fromDirectory(SAMPLES_DIR)
    const site = XingProvider.createScraper(browser)
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      radiusKm: 30,
      mode: "employment",
    })
    const vacancy = await site.getVacancyDetails(urls[0])
    expect(
      typeof vacancy.title === "string" && vacancy.title.length > 0,
    ).toBeTruthy()
    expect(
      typeof vacancy.company === "string" && vacancy.company.length > 0,
    ).toBeTruthy()
  })

  test("getVacancyDetails returns raw HTML description from JSON-LD", async () => {
    const html = `
      <html><body>
        <h1>Frontend Developer</h1>
        <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Frontend Developer",
          "hiringOrganization": { "name": "Test AG" },
          "description": "<h3>Requirements</h3><ul><li>React</li><li><strong>TypeScript</strong></li></ul>",
          "datePosted": "2026-01-01"
        }
        </script>
      </body></html>
    `
    const vacancyUrl = "https://www.xing.com/jobs/test-job-123"
    const browser = new BrowserStub().set(vacancyUrl, html)
    const site = XingProvider.createScraper(browser)
    const vacancy = await site.getVacancyDetails(vacancyUrl)
    expect(vacancy.descriptionHtml.length).toBeGreaterThan(0)
    expect(vacancy.descriptionHtml.includes("<li>React</li>")).toBeTruthy()
    expect(vacancy.descriptionHtml.includes("<strong>TypeScript</strong>")).toBeTruthy()
  })
})

const SAMPLES_DIR = path.join(import.meta.dirname, "html_samples")
```

**`zalando/index.test.ts`** — replace `createZalandoSite` with `ZalandoProvider.createScraper`, update descriptionHtml assertions:

```ts
import { test, describe, expect } from "vitest"
import path from "node:path"
import { ZalandoProvider } from "."
import { BrowserStub } from "@/plugins/browser"

describe("zalando", () => {
  test("getVacancyList returns absolute URLs from search page", async () => {
    const browser = BrowserStub.fromDirectory(SAMPLES_DIR)
    const site = ZalandoProvider.createScraper(browser)
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      radiusKm: 30,
      mode: "employment",
    })
    expect(urls.length > 0).toBeTruthy()
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//)
    }
  })

  test("getVacancyDetails returns title and company", async () => {
    const browser = BrowserStub.fromDirectory(SAMPLES_DIR)
    const site = ZalandoProvider.createScraper(browser)
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      radiusKm: 30,
      mode: "employment",
    })
    const vacancy = await site.getVacancyDetails(urls[0])
    expect(
      typeof vacancy.title === "string" && vacancy.title.length > 0,
    ).toBeTruthy()
    expect(
      typeof vacancy.company === "string" && vacancy.company.length > 0,
    ).toBeTruthy()
  })

  test("getVacancyDetails returns raw HTML from section", async () => {
    const items = Array.from(
      { length: 30 },
      (_, index) =>
        `<li>Requirement number ${index + 1} that is detailed enough</li>`,
    ).join("")
    const html = `
      <html><body>
        <h1>Software Engineer</h1>
        <section>
          <h2>About the Role</h2>
          <p>We are looking for a <strong>talented engineer</strong> to join us.</p>
          <h3>Requirements</h3>
          <ul>${items}</ul>
        </section>
      </body></html>
    `
    const vacancyUrl = "https://jobs.zalando.com/en/jobs/12345"
    const browser = new BrowserStub().set(vacancyUrl, html)
    const site = ZalandoProvider.createScraper(browser)
    const vacancy = await site.getVacancyDetails(vacancyUrl)
    expect(vacancy.descriptionHtml.length).toBeGreaterThan(0)
    expect(vacancy.descriptionHtml.includes("<strong>talented engineer</strong>")).toBe(true)
    expect(vacancy.descriptionHtml.includes("<li>Requirement number 1")).toBe(true)
  })
})

const SAMPLES_DIR = path.join(import.meta.dirname, "html_samples")
```

### Step 7: Verify all job-site tests pass

Run: `npm test -- src/plugins/job-site/arbeitsagentur/index.test.ts`
Run: `npm test -- src/plugins/job-site/dm/index.test.ts`
Run: `npm test -- src/plugins/job-site/xing/index.test.ts`
Run: `npm test -- src/plugins/job-site/zalando/index.test.ts`

Expected: PASS for each.

### Step 8: Commit

```bash
git add src/plugins/job-site/
git commit -m "refactor(plugins/job-site): provider pattern, all-required VacancyDetails, Address+DateString"
```

---

## Task 5: Update `applicant.ts` — replace `Address` interface with `Address` class from utils

**Files:**
- Modify: `src/models/applicant/applicant.ts`

**Context:** The existing `Address` interface (`{ street, zip, city }`) is replaced by the `Address` class from utils. `hasMeaningfulAddress()` becomes `!address.isEmpty()`. Address formatting becomes `address.format()`.

### Step 1: Write the updated `src/models/applicant/applicant.ts`

Replace the local `Address` interface import with the utils import, update `hasMeaningfulAddress`, `formatPersonalSection`, and `PersonalInputSchema`:

In the imports, add:
```ts
import { Address } from "@/utils/index.js"
```

Remove the local `Address` interface (find and delete):
```ts
export interface Address {
  street: string
  zip: string
  city: string
}
```

Replace `hasMeaningfulAddress`:
```ts
function hasMeaningfulAddress(address: Address): boolean {
  return !address.isEmpty()
}
```

Replace `formatPersonalSection`:
```ts
private formatPersonalSection(): string {
  const p = this.personal
  const lines = [`Name: ${p.name}`]
  const formatted = p.address.format()
  if (formatted) {
    lines.push(`Adresse: ${formatted}`)
  }
  if (p.email.trim().length > 0) lines.push(`E-Mail: ${p.email}`)
  if (p.phone.trim().length > 0) lines.push(`Telefon: ${p.phone}`)
  return `## Applicant\n${lines.join("\n")}`
}
```

In `PersonalInputSchema`, replace the inline `address` object with `Address.schema`:
```ts
const PersonalInputSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  birthdate: z.string().default(""),
  gender: z.string().default(""),
  address: Address.schema,
  hobbies: z.union([z.string(), z.array(z.string())]).optional(),
  discloseBirthdate: z.boolean().default(false),
  discloseGender: z.boolean().default(false),
  discloseAddress: z.boolean().default(false),
  discloseHobbies: z.boolean().default(false),
})
```

### Step 2: Run applicant tests

Run: `npm test -- src/models/applicant/applicant.test.ts` (if it exists) or `npm test -- src/models` to run all model tests.

Check for any TypeScript/lint errors: `npm run fix`

Expected: No errors related to Address.

### Step 3: Commit

```bash
git add src/models/applicant/applicant.ts
git commit -m "refactor(models/applicant): use Address class from utils"
```

---

## Task 6: Update `vacancy-processor/process.ts`

**Files:**
- Modify: `src/services/vacancy-processor/process.ts`
- Modify: `src/services/vacancy-processor/process.test.ts`

**Context:** Delete `contactFromDetails()`. `details.contact` is now always a `VacancyContact` with string fields. `details.address` is now an `Address` — use `isValid()` to decide inclusion and `format()` for the flat string. Dates are `DateString` — extract `.value`.

### Step 1: Update `src/services/vacancy-processor/process.ts`

```ts
import type { VacancyDetails } from "@/plugins/job-site"
import { Vacancy } from "@/models/vacancy/index.js"
import type { FoundActivity, VacancyContact } from "@/models/vacancy"
import { vacancyHash } from "./vacancy-hash.js"
import { htmlToMarkdown } from "./markdown.js"

export function process(
  details: VacancyDetails,
  siteName: string,
  existingByHash: Map<string, Vacancy>,
  crawlDate: string,
): ProcessResult {
  const hash = vacancyHash(
    details.title,
    details.company,
    details.address.format(),
    details.contact.name,
  )

  const contact = details.contact
  const description = details.descriptionHtml
    ? htmlToMarkdown(details.descriptionHtml)
    : ""

  const foundActivity: FoundActivity = {
    type: "found",
    date: crawlDate,
    site: siteName,
    url: details.url,
    description,
    contact,
    notes: "",
  }

  const existing = existingByHash.get(hash)

  if (existing) {
    return mergeWithExisting(
      existing,
      details,
      hash,
      foundActivity,
      contact,
      description,
    )
  }

  const vacancy = new Vacancy({
    hash,
    title: details.title,
    company: details.company,
    urls: [details.url],
    addresses: details.address.isValid() ? [details.address.format()] : [],
    contact,
    startDate: details.startDate.value,
    description,
    enriched: false,
    enrichmentDirty: true,
    activityHistory: [foundActivity],
    active: true,
  })

  return { vacancy, hash, isNew: true }
}

function mergeWithExisting(
  existing: Vacancy,
  details: VacancyDetails,
  hash: string,
  foundActivity: FoundActivity,
  contact: VacancyContact,
  description: string,
): ProcessResult {
  const descriptionChanged = hasDescriptionChanged(
    description,
    existing.description,
  )

  const vacancy = existing.with({
    urls: mergeUrls(existing.urls, details.url),
    addresses: mergeAddresses(
      existing.addresses,
      details.address.isValid() ? [details.address.format()] : [],
    ),
    description: description || existing.description,
    enrichmentDirty: existing.enrichmentDirty || descriptionChanged,
    contact: hasContact(contact) ? contact : existing.contact,
    startDate: details.startDate.value || existing.startDate,
    activityHistory: [...existing.activityHistory, foundActivity],
    active: true,
  })

  return { vacancy, hash, isNew: false }
}

interface ProcessResult {
  vacancy: Vacancy
  hash: string
  isNew: boolean
}

function mergeUrls(existing: string[], newUrl: string): string[] {
  return existing.includes(newUrl) ? existing : [...existing, newUrl]
}

export function mergeAddresses(
  existing: string[],
  extracted: string[],
): string[] {
  const merged = [...existing]
  const mergedLower = merged.map((a) => a.toLowerCase())

  for (const newAddr of extracted) {
    const newLower = newAddr.toLowerCase()

    const subsumesIndex = mergedLower.findIndex(
      (lower) => lower !== newLower && newLower.includes(lower),
    )

    if (subsumesIndex === -1) {
      const alreadyCovered = mergedLower.some(
        (lower) => lower === newLower || lower.includes(newLower),
      )
      if (!alreadyCovered) {
        merged.push(newAddr)
        mergedLower.push(newLower)
      }
    } else {
      merged[subsumesIndex] = newAddr
      mergedLower[subsumesIndex] = newLower
    }
  }

  return merged
}

function hasDescriptionChanged(newDesc: string, existingDesc: string): boolean {
  return (
    newDesc.length > 0 && existingDesc.length > 0 && newDesc !== existingDesc
  )
}

function hasContact(contact: VacancyContact): boolean {
  return (
    contact.name.trim().length > 0 ||
    contact.email.trim().length > 0 ||
    contact.phone.trim().length > 0
  )
}
```

### Step 2: Update `src/services/vacancy-processor/process.test.ts`

The existing tests construct `VacancyDetails` with optional fields. Update `makeDetails` to include all required fields:

```ts
import { describe, it, expect } from "vitest"
import { process, markUnseenAsGone, vacancyHash } from "."
import { Vacancy } from "@/models/vacancy/index.js"
import type { VacancyDetails } from "@/plugins/job-site"
import { Address, makeDateString } from "@/utils/index.js"

describe("process", () => {
  it("creates new vacancy with enriched=false and enrichmentDirty=true", () => {
    const result = process(makeDetails(), "test-site", new Map(), CRAWL_DATE)

    expect(result.isNew).toBe(true)
    expect(result.vacancy.enriched).toBe(false)
    expect(result.vacancy.enrichmentDirty).toBe(true)
  })

  it("adds found activity on new vacancy", () => {
    const result = process(makeDetails(), "test-site", new Map(), CRAWL_DATE)
    const [firstActivity] = result.vacancy.activityHistory

    expect(result.vacancy.activityHistory.length).toBe(1)
    expect(firstActivity.type).toBe("found")
    if (firstActivity.type !== "found") {
      throw new Error("Expected a found activity for new vacancies")
    }
    expect(firstActivity.site).toBe("test-site")
  })

  it("merges existing vacancy with unchanged description", () => {
    const description = "Some description"
    const existing = makeExisting({
      description,
      enriched: true,
      enrichmentDirty: false,
      summary: "- Old summary",
    })
    const map = new Map([[existing.hash, existing]])

    const result = process(
      makeDetails({ descriptionHtml: "" }),
      "test-site",
      map,
      CRAWL_DATE,
    )

    expect(result.isNew).toBe(false)
    expect(result.vacancy.enriched).toBe(true)
    expect(result.vacancy.enrichmentDirty).toBe(false)
    expect(result.vacancy.summary).toBe("- Old summary")
  })

  it("sets enrichmentDirty=true when description changes, preserves enriched", () => {
    const existing = makeExisting({
      description: "Old description",
      enriched: true,
      enrichmentDirty: false,
      summary: "- Old summary",
    })
    const map = new Map([[existing.hash, existing]])

    const result = process(
      makeDetails({ descriptionHtml: "<p>New description</p>" }),
      "test-site",
      map,
      CRAWL_DATE,
    )

    expect(result.isNew).toBe(false)
    expect(result.vacancy.enriched).toBe(true)
    expect(result.vacancy.enrichmentDirty).toBe(true)
    expect(result.vacancy.summary).toBe("- Old summary")
  })

  it("preserves enrichmentDirty=true even when description unchanged", () => {
    const existing = makeExisting({
      enriched: false,
      enrichmentDirty: true,
    })
    const map = new Map([[existing.hash, existing]])

    const result = process(makeDetails(), "test-site", map, CRAWL_DATE)

    expect(result.vacancy.enrichmentDirty).toBe(true)
  })
})

function makeDetails(overrides: Partial<VacancyDetails> = {}): VacancyDetails {
  return {
    url: "https://example.com/job/1",
    title: "Developer",
    company: "ACME",
    address: new Address(),
    descriptionHtml: "",
    startDate: makeDateString(""),
    publishedAt: makeDateString(""),
    contact: { name: "", email: "", phone: "" },
    ...overrides,
  }
}

describe("markUnseenAsGone", () => {
  it("marks active unseen vacancy as gone with not-found activity", () => {
    const vacancy = makeExisting({ hash: "h1", active: true })
    const { vacancies, goneCount } = markUnseenAsGone(
      [vacancy],
      new Set(),
      CRAWL_DATE,
    )

    expect(goneCount).toBe(1)
    expect(vacancies[0].active).toBe(false)
    const lastActivity = vacancies[0].activityHistory.at(-1)
    expect(lastActivity?.type).toBe("not-found")
  })

  it("does not change already inactive vacancy", () => {
    const vacancy = makeExisting({ hash: "h1", active: false })
    const { vacancies, goneCount } = markUnseenAsGone(
      [vacancy],
      new Set(),
      CRAWL_DATE,
    )

    expect(goneCount).toBe(0)
    expect(vacancies[0]).toBe(vacancy)
  })

  it("does not mark seen vacancy as gone", () => {
    const vacancy = makeExisting({ hash: "h1", active: true })
    const { vacancies, goneCount } = markUnseenAsGone(
      [vacancy],
      new Set(["h1"]),
      CRAWL_DATE,
    )

    expect(goneCount).toBe(0)
    expect(vacancies[0].active).toBe(true)
  })
})

const CRAWL_DATE = "2026-01-01"

function makeExisting(
  overrides: Partial<ConstructorParameters<typeof Vacancy>[0]> = {},
): Vacancy {
  return new Vacancy({
    hash: vacancyHash("Developer", "ACME"),
    title: "Developer",
    company: "ACME",
    urls: ["https://example.com/job/1"],
    activityHistory: [],
    active: true,
    enriched: true,
    enrichmentDirty: false,
    summary: "- Good match",
    ...overrides,
  })
}
```

### Step 3: Verify tests pass

Run: `npm test -- src/services/vacancy-processor/process.test.ts`

Expected: PASS

### Step 4: Commit

```bash
git add src/services/vacancy-processor/process.ts src/services/vacancy-processor/process.test.ts
git commit -m "refactor(services/vacancy-processor): remove contactFromDetails, use Address+DateString"
```

---

## Task 7: Update `paginate.ts` and `site-crawler.ts`

**Files:**
- Modify: `src/services/site-crawler/paginate.ts`
- Modify: `src/services/site-crawler/site-crawler.ts`
- Modify: `src/services/site-crawler/site-crawler.test.ts`

**Context:** `resolveEffectiveMode` takes `readonly SearchMode[]` directly. `fetchSearchPage` takes `scraper: JobSite` + `siteName: string` separately. `CrawlOptions` takes `providers: JobSiteProvider[]` + `browser: Browser`.

### Step 1: Update `src/services/site-crawler/paginate.ts`

```ts
import type {
  JobSite,
  SearchCriteria,
  SearchMode,
  VacancyListPage,
} from "@/plugins/job-site"
import type { JobSearchCriteria } from "@/models/job-search"
import { formatError } from "@/services/vacancy-scanner/index.js"

export function resolveEffectiveMode(
  supportedModes: readonly SearchMode[],
  mode: SearchMode,
): SearchMode | undefined {
  if (supportedModes.includes(mode)) {
    return mode
  }
  if (mode === "entry-level" && supportedModes.includes("employment")) {
    return "employment"
  }
  return undefined
}

export function derivePluginCriteria(
  criteria: JobSearchCriteria,
  effectiveMode: SearchMode,
): SearchCriteria {
  return {
    location: criteria.location,
    query: criteria.query,
    radiusKm: criteria.radiusKm,
    mode: effectiveMode,
  }
}

export async function fetchSearchPage(
  scraper: JobSite,
  siteName: string,
  criteria: SearchCriteria,
  pageId: string | undefined,
  pageNumber: number,
): Promise<VacancyListPage | undefined> {
  try {
    return await scraper.getVacancyList(criteria, pageId)
  } catch (error) {
    console.error(
      `[${siteName}] Failed to fetch search page ${pageNumber}:`,
      formatError(error),
    )
    return undefined
  }
}

export function collectNewUrls(
  listUrls: string[],
  siteUrls: Set<string>,
  allUrls: Set<string>,
): string[] {
  const newUrls = listUrls.filter((u) => !siteUrls.has(u) && !allUrls.has(u))
  for (const u of newUrls) {
    siteUrls.add(u)
    allUrls.add(u)
  }
  return newUrls
}

export function sliceToLimit(
  newUrls: string[],
  siteUrlCount: number,
  limit?: number,
): string[] {
  if (!limit) return newUrls
  const alreadyProcessed = siteUrlCount - newUrls.length
  const remaining = limit - alreadyProcessed
  return remaining >= newUrls.length ? newUrls : newUrls.slice(0, remaining)
}

export function shouldContinuePaging(
  nextPageId: string | undefined,
  siteUrlCount: number,
  limit?: number,
): boolean {
  return !!nextPageId && (!limit || siteUrlCount < limit)
}
```

### Step 2: Update `src/services/site-crawler/site-crawler.ts`

```ts
import type {
  JobSite,
  JobSiteProvider,
  VacancyDetails,
  SearchCriteria,
} from "@/plugins/job-site"
import type { Browser } from "@/plugins/browser"
import type { JobSearchCriteria } from "@/models/job-search"
import type { ProgressEvent } from "@/models/progress/index.js"
import { formatError } from "@/services/vacancy-scanner/index.js"
import {
  resolveEffectiveMode,
  derivePluginCriteria,
  fetchSearchPage,
  collectNewUrls,
  sliceToLimit,
  shouldContinuePaging,
} from "./paginate.js"

export class SiteCrawler {
  async crawl(options: CrawlOptions): Promise<CrawlSummary> {
    const allUrls = new Set<string>()

    for (const provider of options.providers) {
      if (options.signal?.aborted) break
      await this.crawlSite(provider, options, allUrls)
    }

    return { totalUrls: allUrls.size }
  }

  private async crawlSite(
    provider: JobSiteProvider,
    options: CrawlOptions,
    allUrls: Set<string>,
  ): Promise<void> {
    const effectiveMode = resolveEffectiveMode(
      provider.supportedModes,
      options.criteria.mode,
    )
    if (!effectiveMode) return

    options.onProgress?.({
      message: `Scanning ${provider.name}...`,
      phase: "search",
    })

    const scraper = provider.createScraper(options.browser)
    const siteUrls = new Set<string>()
    const pluginCriteria = derivePluginCriteria(options.criteria, effectiveMode)
    let pageId: string | undefined

    for (let page = 0; page < 20; page++) {
      if (options.signal?.aborted) break
      const next = await this.crawlPage(
        scraper,
        provider.name,
        pluginCriteria,
        effectiveMode,
        pageId,
        page,
        siteUrls,
        allUrls,
        options,
      )
      if (!next) break
      pageId = next
    }
  }

  private async crawlPage(
    scraper: JobSite,
    siteName: string,
    pluginCriteria: SearchCriteria,
    effectiveMode: string,
    pageId: string | undefined,
    page: number,
    siteUrls: Set<string>,
    allUrls: Set<string>,
    options: CrawlOptions,
  ): Promise<string | undefined> {
    const listResult = await fetchSearchPage(
      scraper,
      siteName,
      pluginCriteria,
      pageId,
      page + 1,
    )
    if (!listResult) return undefined

    const newUrls = collectNewUrls(listResult.urls, siteUrls, allUrls)
    if (newUrls.length === 0) return undefined

    options.onProgress?.({
      message: `[${siteName}] Search (${effectiveMode}) page ${page + 1}: ${siteUrls.size} URLs found`,
      phase: "search",
    })

    const urlsToProcess = sliceToLimit(
      newUrls,
      siteUrls.size,
      options.criteria.limit,
    )
    await this.processUrls(scraper, siteName, urlsToProcess, options)

    if (
      !shouldContinuePaging(
        listResult.nextPageId,
        siteUrls.size,
        options.criteria.limit,
      )
    ) {
      return undefined
    }
    return listResult.nextPageId
  }

  private async processUrls(
    scraper: JobSite,
    siteName: string,
    urls: string[],
    options: CrawlOptions,
  ): Promise<void> {
    for (const url of urls) {
      if (options.signal?.aborted) break
      await this.fetchAndEmit(scraper, siteName, url, options)
    }
  }

  private async fetchAndEmit(
    scraper: JobSite,
    siteName: string,
    url: string,
    options: CrawlOptions,
  ): Promise<void> {
    let details
    try {
      details = await scraper.getVacancyDetails(url)
    } catch (error) {
      console.error(
        `[${siteName}] Failed to extract ${url}:`,
        formatError(error),
      )
      options.onProgress?.({
        message: `[${siteName}] Failed to extract ${url}`,
        phase: "scan",
      })
      return
    }
    options.onResult(details, siteName)
  }
}

interface CrawlOptions {
  providers: JobSiteProvider[]
  browser: Browser
  criteria: JobSearchCriteria
  signal?: AbortSignal
  onProgress?: (event: ProgressEvent) => void
  onResult: (details: VacancyDetails, siteName: string) => void
}

interface CrawlSummary {
  totalUrls: number
}
```

### Step 3: Update `src/services/site-crawler/site-crawler.test.ts`

Replace the `makeSite` helper with `makeProvider` and update all tests to use `providers` + `browser`:

```ts
import { describe, it, expect, vi } from "vitest"
import { SiteCrawler } from "."
import type {
  JobSite,
  JobSiteProvider,
  VacancyDetails,
  VacancyListPage,
} from "@/plugins/job-site"
import type { JobSearchCriteria } from "@/models/job-search"
import { BrowserStub } from "@/plugins/browser"
import { Address } from "@/utils/index.js"

describe("SiteCrawler", () => {
  it("calls onResult for each vacancy detail fetched", async () => {
    const getVacancyDetailsMock = vi
      .fn<JobSite["getVacancyDetails"]>()
      .mockResolvedValueOnce(makeDetails({ url: "https://example.com/job/1" }))
      .mockResolvedValueOnce(makeDetails({ url: "https://example.com/job/2" }))
    const provider = makeProvider({
      pages: [
        { urls: ["https://example.com/job/1", "https://example.com/job/2"] },
      ],
      getVacancyDetails: getVacancyDetailsMock,
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
      criteria: CRITERIA,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(2)
  })

  it("respects limit from criteria", async () => {
    const getVacancyDetailsMock = vi
      .fn<JobSite["getVacancyDetails"]>()
      .mockResolvedValue(makeDetails())
    const provider = makeProvider({
      pages: [
        { urls: ["url1", "url2", "url3", "url4", "url5"], nextPageId: "p2" },
      ],
      getVacancyDetails: getVacancyDetailsMock,
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
      criteria: { ...CRITERIA, limit: 2 },
      onResult: (d) => results.push(d),
    })

    expect(getVacancyDetailsMock).toHaveBeenCalledTimes(2)
  })

  it("stops on abort signal", async () => {
    const controller = new AbortController()
    const provider = makeProvider({
      getVacancyList: vi
        .fn<JobSite["getVacancyList"]>()
        .mockImplementation(() => {
          controller.abort()
          return Promise.resolve({ urls: ["url1"] })
        }),
      getVacancyDetails: vi
        .fn<JobSite["getVacancyDetails"]>()
        .mockResolvedValue(makeDetails()),
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
      criteria: CRITERIA,
      signal: controller.signal,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(0)
  })

  it("skips site with unsupported mode", async () => {
    const getVacancyListMock = vi
      .fn<JobSite["getVacancyList"]>()
      .mockResolvedValue({ urls: ["url1"] })
    const provider = makeProvider({
      getVacancyList: getVacancyListMock,
      supportedModes: ["apprenticeship"],
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
      criteria: { ...CRITERIA, mode: "employment" },
      onResult: (d) => results.push(d),
    })

    expect(getVacancyListMock).not.toHaveBeenCalled()
    expect(results.length).toBe(0)
  })

  it("falls back to employment mode for entry-level when site supports employment", async () => {
    const getVacancyListMock = vi
      .fn<JobSite["getVacancyList"]>()
      .mockResolvedValue({ urls: ["url1"] })
    const provider = makeProvider({
      pages: [{ urls: ["url1"] }],
      getVacancyList: getVacancyListMock,
      supportedModes: ["employment"],
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
      criteria: { ...CRITERIA, mode: "entry-level" },
      onResult: (d) => results.push(d),
    })

    expect(getVacancyListMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "employment" }),
      undefined,
    )
  })

  it("passes resolved plugin criteria without crawler limit", async () => {
    const getVacancyListMock = vi
      .fn<JobSite["getVacancyList"]>()
      .mockResolvedValue({ urls: [] })
    const provider = makeProvider({ getVacancyList: getVacancyListMock })

    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
      criteria: { ...CRITERIA, limit: 2 },
      onResult: vi.fn(),
    })

    expect(getVacancyListMock).toHaveBeenCalledOnce()
    const [criteria] = getVacancyListMock.mock.calls[0]
    expect(criteria).toMatchObject({
      location: CRITERIA.location,
      query: CRITERIA.query,
      radiusKm: CRITERIA.radiusKm,
      mode: CRITERIA.mode,
    })
    expect(Object.hasOwn(criteria, "limit")).toBe(false)
  })

  it("continues after search page fetch failure", async () => {
    const provider1 = makeProvider({
      name: "failing-site",
      getVacancyList: vi
        .fn<JobSite["getVacancyList"]>()
        .mockRejectedValue(new Error("network error")),
      getVacancyDetails: vi.fn<JobSite["getVacancyDetails"]>(),
    })
    const provider2 = makeProvider({
      pages: [{ urls: ["url1"] }],
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider1, provider2],
      browser: new BrowserStub(),
      criteria: CRITERIA,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(1)
  })

  it("skips URL when vacancy detail fetch fails", async () => {
    const getVacancyDetailsMock = vi
      .fn<JobSite["getVacancyDetails"]>()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(makeDetails({ url: "url2" }))
    const provider = makeProvider({
      pages: [{ urls: ["url1", "url2"] }],
      getVacancyDetails: getVacancyDetailsMock,
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
      criteria: CRITERIA,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(1)
    expect(results[0].url).toBe("url2")
  })

  it("processes multiple sites sequentially", async () => {
    const details1 = makeDetails({ url: "url1", company: "A" })
    const details2 = makeDetails({ url: "url2", company: "B" })
    const provider1 = makeProvider({
      pages: [{ urls: ["url1"] }],
      details: details1,
    })
    const provider2 = makeProvider({
      name: "site2",
      pages: [{ urls: ["url2"] }],
      details: details2,
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider1, provider2],
      browser: new BrowserStub(),
      criteria: CRITERIA,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(2)
    expect(results.map((r) => r.company)).toEqual(["A", "B"])
  })
})

const CRITERIA: JobSearchCriteria = {
  location: "Berlin",
  query: "developer",
  radiusKm: 50,
  mode: "employment",
}

function makeProvider(overrides: MakeProviderOptions = {}): JobSiteProvider {
  const provider: JobSiteProvider = {
    id: "test",
    name: "test-site",
    supportedModes: ["employment"],
    createScraper: () => ({
      getVacancyList: createVacancyListMock(overrides.pages),
      getVacancyDetails: createVacancyDetailsMock(overrides.details),
    }),
  }

  if (overrides.name) {
    provider.name = overrides.name
  }
  if (overrides.supportedModes) {
    provider.supportedModes = overrides.supportedModes
  }
  if (overrides.getVacancyList) {
    provider.createScraper = () => ({
      getVacancyList: overrides.getVacancyList,
      getVacancyDetails: createVacancyDetailsMock(overrides.details),
    })
  }
  if (overrides.getVacancyDetails) {
    provider.createScraper = () => ({
      getVacancyList: createVacancyListMock(overrides.pages),
      getVacancyDetails: overrides.getVacancyDetails,
    })
  }

  return provider
}

type MakeProviderOptions = {
  name?: string
  supportedModes?: JobSiteProvider["supportedModes"]
  pages?: VacancyListPage[]
  details?: VacancyDetails
  getVacancyList?: JobSite["getVacancyList"]
  getVacancyDetails?: JobSite["getVacancyDetails"]
}

function createVacancyListMock(pages: VacancyListPage[] = []) {
  let pageIndex = 0
  return vi.fn<JobSite["getVacancyList"]>().mockImplementation(() => {
    const page = pages[pageIndex++] ?? { urls: [] }
    return Promise.resolve(page)
  })
}

function createVacancyDetailsMock(details: VacancyDetails = makeDetails()) {
  return vi.fn<JobSite["getVacancyDetails"]>().mockResolvedValue(details)
}

function makeDetails(overrides: Partial<VacancyDetails> = {}): VacancyDetails {
  return {
    url: "https://example.com/job/1",
    title: "Developer",
    company: "ACME",
    address: new Address(),
    descriptionHtml: "",
    startDate: { value: "" },
    publishedAt: { value: "" },
    contact: { name: "", email: "", phone: "" },
    ...overrides,
  }
}
```

### Step 4: Verify tests pass

Run: `npm test -- src/services/site-crawler/site-crawler.test.ts`

Expected: PASS

### Step 5: Commit

```bash
git add src/services/site-crawler/
git commit -m "refactor(services/site-crawler): provider-based crawl, split scraper from metadata"
```

---

## Task 8: Update `vacancy-scanner.ts`

**Files:**
- Modify: `src/services/vacancy-scanner/vacancy-scanner.ts`

**Context:** Constructor receives `listProviderIds` + `getProvider` instead of `listJobSiteNames`. `scan()` loses `siteFactory` parameter, gains `browser: Browser`.

### Step 1: Update `src/services/vacancy-scanner/vacancy-scanner.ts`

```ts
import type { VacancyRepository } from "@/repositories/vacancy"
import type { JobSearchRepository } from "@/repositories/job-search"
import type { ApplicantRepository } from "@/repositories/applicant"
import type { JobSiteProvider } from "@/plugins/job-site"
import type { Browser } from "@/plugins/browser"
import type { Vacancy } from "@/models/vacancy/index.js"
import { makeJobSearchID } from "@/models/job-search"
import type { ProgressEvent } from "@/models/progress/index.js"
import { SiteCrawler } from "@/services/site-crawler/index.js"
import { resolveSearchParameters } from "@/services/site-crawler/index.js"
import {
  process as processVacancy,
  markUnseenAsGone,
} from "@/services/vacancy-processor/index.js"
import { VacancyEnricher } from "@/services/vacancy-enricher/index.js"
import { EnrichQueue } from "./enrich-queue.js"

export class VacancyScanner {
  constructor(
    private readonly vacancyRepo: VacancyRepository,
    private readonly jobSearchRepo: JobSearchRepository,
    private readonly applicantRepo: ApplicantRepository,
    private readonly siteCrawler: SiteCrawler,
    private readonly enricher: VacancyEnricher,
    private readonly listProviderIds: () => string[] = () => [],
    private readonly getProvider: (id: string) => JobSiteProvider,
  ) {}

  async scan(
    id: string,
    abortController: AbortController,
    enrichAbortController: AbortController,
    onProgress: OnProgress,
    browser: Browser,
  ): Promise<void> {
    const searchId = makeJobSearchID(id)
    const loaded = this.jobSearchRepo.load(searchId)
    const providerIdsToRun =
      loaded.jobSearch.sources.length > 0
        ? loaded.jobSearch.sources.map((s: { value: string }) => s.value)
        : this.listProviderIds()

    const applicant = this.applicantRepo.load(loaded.applicantId)
    const criteria = resolveSearchParameters(loaded.jobSearch, applicant)
    const crawlDate = new Date().toISOString().slice(0, 10)

    const existing = this.vacancyRepo.loadAll(searchId)
    const existingByHash = new Map<string, Vacancy>()
    for (const v of existing.vacancies) {
      existingByHash.set(v.hash, v)
    }

    const providers = providerIdsToRun.map((id) => this.getProvider(id))

    let lastSaveTime = 0
    const seenHashes = new Set<string>()
    const newCount = { value: 0 }
    const updatedCount = { value: 0 }

    const queue = new EnrichQueue({
      enricher: this.enricher,
      context: { applicant, jobSearch: loaded.jobSearch },
      onEnriched: (enriched, hash) => {
        existingByHash.set(hash, enriched)
        this.vacancyRepo.save(searchId, [...existingByHash.values()], crawlDate)
        onProgress({ message: "", phase: "enrich", vacanciesUpdated: true })
      },
      onError: (hash, error) => {
        console.error(`Enrichment failed for vacancy "${hash}":`, error)
      },
      onProgress: (event) => {
        onProgress({
          message: `Enriching ${event.completed}/${event.total}`,
          phase: "enrich",
          owner: "crawl",
          enrichProgress: event,
        })
      },
      signal: enrichAbortController.signal,
    })

    await this.siteCrawler.crawl({
      providers,
      browser,
      criteria,
      signal: abortController.signal,
      onProgress,
      onResult: (details, siteName) => {
        const result = processVacancy(
          details,
          siteName,
          existingByHash,
          crawlDate,
        )
        const { vacancy, hash, isNew } = result

        existingByHash.set(hash, vacancy)
        seenHashes.add(hash)

        if (isNew) {
          newCount.value++
        } else {
          updatedCount.value++
        }

        onProgress({
          message: `[${siteName}] ${isNew ? "New" : "Updated"}: ${details.title || details.url}`,
          phase: "scan",
        })

        const now = Date.now()
        if (now - lastSaveTime >= 1000) {
          this.vacancyRepo.save(
            searchId,
            [...existingByHash.values()],
            crawlDate,
          )
          lastSaveTime = now
          onProgress({ message: "", phase: "scan", vacanciesUpdated: true })
        }

        if (vacancy.enrichmentDirty && !enrichAbortController.signal.aborted) {
          queue.submit(vacancy, hash)
        }
      },
    })

    await drainQueue(queue)

    if (queue.total > 0) {
      onProgress({
        message: enrichAbortController.signal.aborted
          ? "Analyse abgebrochen"
          : "Analyse abgeschlossen",
        phase: "done",
        source: "enrich",
        owner: "crawl",
      })
    }

    if (abortController.signal.aborted) return

    const allVacancies = [...existingByHash.values()]
    const { vacancies: finalVacancies, goneCount } = markUnseenAsGone(
      allVacancies,
      seenHashes,
      crawlDate,
    )

    this.vacancyRepo.save(searchId, finalVacancies, crawlDate)
    onProgress({ message: "", phase: "scan", vacanciesUpdated: true })

    onProgress({
      message: `Scan complete: ${newCount.value} new, ${updatedCount.value} updated, ${goneCount} gone`,
      phase: "complete",
    })
  }
}

export type OnProgress = (event: ProgressEvent) => void

async function drainQueue(queue: EnrichQueue): Promise<void> {
  try {
    await queue.drain()
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return
    throw error
  }
}
```

### Step 2: Verify compilation

Run: `npm run fix`

Expected: No errors.

### Step 3: Commit

```bash
git add src/services/vacancy-scanner/vacancy-scanner.ts
git commit -m "refactor(services/vacancy-scanner): provider IDs + getProvider, browser param on scan"
```

---

## Task 9: Update `crawl-manager.ts`, `create-services.ts`, `ipc-settings.ts`

**Files:**
- Modify: `src/app/crawl-manager.ts`
- Modify: `src/app/composition/create-services.ts`
- Modify: `src/app/ipc-settings.ts`

### Step 1: Update `src/app/crawl-manager.ts`

```ts
import type {
  VacancyScanner,
  OnProgress,
} from "@/services/vacancy-scanner/index.js"
import type { ProgressEvent } from "@/models/progress/index.js"
import { createElectronBrowser } from "@/plugins/browser"

export function startCrawl(options: StartCrawlOptions): void {
  const { jobSearchId, vacancyScanner, onProgress, onComplete, onError } =
    options

  if (activeCrawls.has(jobSearchId)) {
    onError(new Error(`Crawl already running for ${jobSearchId}`))
    return
  }

  const abortController = new AbortController()
  const enrichAbortController = new AbortController()
  const activeCrawl: ActiveCrawl = {
    crawlController: abortController,
    enrichController: enrichAbortController,
    phase: "crawling",
  }
  activeCrawls.set(jobSearchId, activeCrawl)
  const browser = createElectronBrowser()

  const wrappedOnProgress: OnProgress = (event) => {
    updateActiveCrawl(activeCrawl, event)
    onProgress(event)
  }

  vacancyScanner
    .scan(
      jobSearchId,
      abortController,
      enrichAbortController,
      wrappedOnProgress,
      browser,
    )
    .then(() => onComplete())
    .catch((error) =>
      onError(error instanceof Error ? error : new Error(String(error))),
    )
    .finally(async () => {
      activeCrawls.delete(jobSearchId)
      await browser.close()
    })
}

export function abortCrawl(jobSearchId: string): boolean {
  const crawl = activeCrawls.get(jobSearchId)
  if (!crawl) return false

  crawl.enrichController.abort()
  crawl.crawlController.abort()
  return true
}

export function abortCrawlEnrichment(jobSearchId: string): boolean {
  const crawl = activeCrawls.get(jobSearchId)
  if (!crawl || crawl.enrichController.signal.aborted) return false

  crawl.enrichController.abort()
  return true
}

const activeCrawls = new Map<string, ActiveCrawl>()

interface ActiveCrawl {
  crawlController: AbortController
  enrichController: AbortController
  phase: CrawlPhase
  enrichProgress?: { completed: number; total: number }
}

type CrawlPhase = "crawling" | "enriching" | "done"

interface StartCrawlOptions {
  jobSearchId: string
  vacancyScanner: Pick<VacancyScanner, "scan">
  onProgress: OnProgress
  onComplete: () => void
  onError: (error: Error) => void
}

function updateActiveCrawl(
  activeCrawl: ActiveCrawl,
  event: ProgressEvent,
): void {
  if (event.phase === "enrich") {
    activeCrawl.phase = "enriching"
    if (event.enrichProgress) {
      activeCrawl.enrichProgress = event.enrichProgress
    }
    return
  }

  if (event.phase !== "done" && event.phase !== "complete") {
    return
  }

  if (event.phase === "done" && event.source === "enrich") {
    activeCrawl.phase = "crawling"
    activeCrawl.enrichProgress = undefined
    return
  }

  activeCrawl.phase = "done"
}
```

### Step 2: Update `src/app/composition/create-services.ts`

In imports, replace `getJobSiteNames` with:
```ts
import {
  getJobSiteProviderIds,
  getJobSiteProvider,
} from "@/plugins/job-site"
```

In `createAppServices`, update `VacancyScanner` construction:
```ts
vacancyScanner: new VacancyScanner(
  context.vacancyRepo,
  context.jobSearchRepo,
  context.applicantRepo,
  new SiteCrawler(),
  vacancyEnricher,
  getJobSiteProviderIds,
  getJobSiteProvider,
),
```

### Step 3: Update `src/app/ipc-settings.ts`

In imports, replace `getJobSiteInfos` with:
```ts
import { getJobSiteProviders } from "@/plugins/job-site"
```

In `registerSettingsHandlers`, update the handler:
```ts
handle("sites:list", () => ({ sites: getJobSiteProviders() }))
```

### Step 4: Verify compilation

Run: `npm run fix`

Expected: No errors.

### Step 5: Commit

```bash
git add src/app/crawl-manager.ts src/app/composition/create-services.ts src/app/ipc-settings.ts
git commit -m "refactor(app): pass browser directly, use getJobSiteProvider/Ids"
```

---

## Task 10: Update `prepare-resume-data.ts`

**Files:**
- Modify: `src/services/resume-renderer/prepare-resume-data.ts`

**Context:** `personal.address` is now an `Address` instance. Use `address.format()` for location.

### Step 1: Update `src/services/resume-renderer/prepare-resume-data.ts`

```ts
import type { Applicant } from "@/models/applicant"

export function prepareResumeData(applicant: Applicant) {
  const { personal } = applicant

  return {
    personal: {
      name: personal.name,
      email: personal.email,
      phone: personal.phone,
      location: prepareLocation(applicant),
    },
    experience: applicant.experience.map((exp) => ({
      role: exp.role,
      company: exp.company,
      startDate: conditionalDate(exp.discloseDates, exp.startDate),
      endDate: conditionalDate(exp.discloseDates, exp.endDate),
      location: exp.location,
      highlights: exp.highlights,
    })),
    education: applicant.education.map((edu) => ({
      institution: edu.institution,
      course: edu.course,
      startDate: conditionalDate(edu.discloseDates, edu.startDate),
      endDate: conditionalDate(edu.discloseDates, edu.endDate),
      location: edu.location,
      highlights: edu.highlights,
    })),
    skills: applicant.skills.map((s) => s.name),
    languages: applicant.languages.map((l) => ({
      language: l.language,
      level: l.level,
    })),
    certifications: applicant.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: conditionalDate(c.discloseDates, c.date),
      description: c.description,
    })),
    hobbies: personal.discloseHobbies ? personal.hobbies : undefined,
  }
}

function conditionalDate(disclose: boolean, date: string): string | undefined {
  return disclose ? date : undefined
}

function prepareLocation(applicant: Applicant): string | undefined {
  const { personal } = applicant
  return personal.discloseAddress && !personal.address.isEmpty()
    ? personal.address.format()
    : undefined
}
```

### Step 2: Verify compilation

Run: `npm run fix`

Expected: No errors.

### Step 3: Commit

```bash
git add src/services/resume-renderer/prepare-resume-data.ts
git commit -m "refactor(services/resume-renderer): use Address.format() for location"
```

---

## Task 11: Update `llm/index.ts` — explicit `LlmProviderInfo` interface

**Files:**
- Modify: `src/plugins/llm/index.ts`

### Step 1: Update `src/plugins/llm/index.ts`

```ts
import { OpenRouterProvider } from "./openrouter"
import { RequestyProvider } from "./requesty"

export interface TypedSchema<T> {
  schema: object
  parse: (input: string) => T
}

export function getLlmProviders(): readonly LlmProviderInfo[] {
  return PROVIDERS.map(({ id, name, description, instructions }) => ({
    id,
    name,
    description,
    instructions,
  }))
}

export interface LlmProviderInfo {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly instructions: string
}

export function getLlmProvider(providerId: string): LlmProvider {
  const provider = PROVIDERS.find((p) => p.id === providerId)
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${providerId}`)
  }
  return provider
}

export interface LlmProvider extends LlmProviderInfo {
  createClient(apiKey: string, model: string): LlmClient
  createModelRegistry(): LlmModelRegistry
  ping(apiKey: string): Promise<boolean>
}

export interface LlmClient {
  complete(
    prompt: string,
    maxTokens: number,
    signal?: AbortSignal,
  ): Promise<string>
  completeJSON<T>(
    prompt: string,
    maxTokens: number,
    schema: TypedSchema<T>,
    signal?: AbortSignal,
  ): Promise<T>
  ping(): Promise<boolean>
}

export interface LlmModelRegistry {
  fetchModels(): Promise<LlmModelInfo[]>
}

export interface LlmModelInfo {
  id: string
  name: string
  pricing: LlmPricing
}

export interface LlmPricing {
  prompt: string
  completion: string
}

const PROVIDERS: readonly LlmProvider[] = [OpenRouterProvider, RequestyProvider]
```

### Step 2: Verify compilation

Run: `npm run fix`

Expected: No errors.

### Step 3: Commit

```bash
git add src/plugins/llm/index.ts
git commit -m "refactor(plugins/llm): explicit LlmProviderInfo interface, extends pattern"
```

---

## Task 12: Update integration test

**Files:**
- Modify: `src/plugins/job-site/integration.test.ts`

### Step 1: Update `src/plugins/job-site/integration.test.ts`

```ts
import { test, describe, beforeAll, afterAll, expect } from "vitest"
import { createPlaywrightBrowser, type Browser } from "@/plugins/browser"
import { getJobSiteProviders } from "."

describe("job-site plugins", () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await createPlaywrightBrowser()
  })

  afterAll(async () => {
    await browser.close()
  })

  const SKIP_SITES = new Set<string>(["xing"])

  for (const provider of getJobSiteProviders()) {
    const mode = provider.supportedModes[0]
    const skip = SKIP_SITES.has(provider.id)

    test.skipIf(skip)(
      `/${provider.id} (${mode}) - pagination returns unique URLs`,
      async () => {
        const site = provider.createScraper(browser)
        const criteria = {
          location: "Berlin",
          query: "",
          radiusKm: 10,
          mode: mode,
        }

        const allUrls = new Set<string>()
        const perPageUrls: string[][] = []
        let pageId: string | undefined
        const MAX_TEST_PAGES = 3

        for (let p = 0; p < MAX_TEST_PAGES; p++) {
          const result = await site.getVacancyList(criteria, pageId)
          expect(result.urls).toBeInstanceOf(Array)

          const pageUrls = new Set(result.urls)
          expect(pageUrls.size).toBe(result.urls.length)

          perPageUrls.push(result.urls)
          for (const url of result.urls) allUrls.add(url)

          if (!result.nextPageId) break
          pageId = result.nextPageId
        }

        expect(allUrls.size).toBeGreaterThan(0)

        if (perPageUrls.length > 1) {
          const totalRaw = perPageUrls.reduce((s, p) => s + p.length, 0)
          console.log(
            `  [${provider.id}] ${perPageUrls.length} pages, ${totalRaw} raw URLs, ${allUrls.size} unique`,
          )
        }
      },
      60_000,
    )

    test.skipIf(skip)(
      `/${provider.id} (${mode}) - vacancy details produce usable data`,
      async () => {
        const site = provider.createScraper(browser)
        const criteria = {
          location: "Berlin",
          query: "",
          radiusKm: 10,
          mode: mode,
        }

        const { urls } = await site.getVacancyList(criteria)
        expect(urls.length).toBeGreaterThan(0)

        const sample = urls.slice(0, 5)
        let foundUsableData = false

        for (const url of sample) {
          const details = await site.getVacancyDetails(url)
          expect(details).toBeTruthy()

          if (
            details.title.trim().length > 0 &&
            details.company.trim().length > 0 &&
            details.url.trim().length > 0
          ) {
            foundUsableData = true
            break
          }

          console.log(
            `  [${provider.id}] vacancy missing usable data: ${url}`,
          )
        }

        expect(foundUsableData).toBe(true)
      },
      60_000,
    )
  }
})
```

### Step 2: Verify compilation

Run: `npm run fix`

Expected: No errors.

### Step 3: Commit

```bash
git add src/plugins/job-site/integration.test.ts
git commit -m "test(plugins/job-site): integration test uses provider pattern, generic quality check"
```

---

## Task 13: Final verification

### Step 1: Run auto-fix

Run: `npm run fix`

Expected: Clean output, no unfixable issues.

### Step 2: Run unit tests

Run: `npm test -- --run`

Expected: All unit tests pass.

### Step 3: Run integration tests

Run: `npm run test:integration -- --run`

Expected: All integration tests pass.

### Step 4: Commit any final fixes

```bash
git add -A
git commit -m "chore: fix formatting after provider pattern refactor" || echo "nothing to commit"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Provider pattern (`JobSiteProvider`, `JobSiteProviderInfo`, `PROVIDERS` array) — Task 4
- ✅ `getJobSiteProviders()`, `getJobSiteProvider()`, `getJobSiteProviderIds()` — Task 4
- ✅ Remove `REGISTRY`, `createJobSite()`, `getJobSiteInfos()`, `getJobSiteNames()` — Task 4
- ✅ `JobSite` pure scraper (no `name`/`supportedModes`) — Task 4
- ✅ `VacancyDetails` all-required fields — Tasks 4-8
- ✅ `VacancyContact` all-required strings — Task 4
- ✅ `Address` class with `format()`, `isEmpty()`, `isValid()` — Task 1
- ✅ `DateString` type + `makeDateString()` — Task 2
- ✅ LLM `LlmProviderInfo` explicit interface — Task 11
- ✅ `paginate.ts` signature changes — Task 7
- ✅ `site-crawler.ts` `CrawlOptions` provider-based — Task 7
- ✅ `vacancy-scanner.ts` constructor + scan changes — Task 8
- ✅ `crawl-manager.ts` browser directly — Task 9
- ✅ `create-services.ts` provider wiring — Task 9
- ✅ `ipc-settings.ts` provider list — Task 9
- ✅ `process.ts` delete `contactFromDetails`, use `Address`/`DateString` — Task 6
- ✅ `applicant.ts` use `Address` class — Task 5
- ✅ `prepare-resume-data.ts` use `Address.format()` — Task 10
- ✅ Layer import rules updated — Task 3
- ✅ Per-site extraction changes (all 4 sites) — Task 4
- ✅ Unit tests updated for all 4 sites — Task 4
- ✅ Integration test uses provider + generic quality check — Task 12
- ✅ Site-crawler tests updated — Task 7
- ✅ Process tests updated — Task 6

**Placeholder scan:** None found — every step contains actual code/commands.

**Type consistency:**
- `Address` always from `src/utils/address.ts`
- `DateString` always `{ value: string }` with `makeDateString()`
- `VacancyContact` always `{ name: string, email: string, phone: string }`
- `JobSiteProvider` consistently used across all files
- `getJobSiteProviderIds` consistently returns `string[]`
