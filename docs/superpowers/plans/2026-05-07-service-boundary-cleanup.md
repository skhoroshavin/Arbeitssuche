# Service Boundary Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate reverse inter-service dependencies, tighten ESLint rules to deny inter-service imports by default, merge `vacancy-processor` into `site-crawler`, extract `commute-computer` from `vacancy-enricher`, rename `vacancy-scanner` → `scan-pipeline`, delete `llm` service, move shared utilities to `utils`.

**Architecture:** After cleanup, only `scan-pipeline` (the orchestrator) imports other services. All leaf services depend only on `utils` and outer layers (repositories, plugins, models). ESLint denies inter-service imports by default with explicit overrides for `scan-pipeline`.

**Tech Stack:** TypeScript, Vitest, ESLint with unslop plugin

---

### Task 1: Move `formatError` + `toError` to `utils`

**Files:**
- Create: `src/utils/format-error.ts`
- Modify: `src/utils/index.ts`
- Modify: `src/services/site-crawler/site-crawler.ts:8`
- Modify: `src/services/site-crawler/paginate.ts:8`
- Modify: `src/services/vacancy-enricher/vacancy-enricher.ts:11`
- Modify: `src/services/vacancy-enricher/commute.ts:3`
- Modify: `src/app/crawl-manager.ts:8`
- Modify: `src/app/ipc-setup.ts:6`

- [ ] **Step 1: Create `src/utils/format-error.ts`**

```typescript
export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
```

- [ ] **Step 2: Add re-export to `src/utils/index.ts`**

Edit the file, add this line to the existing exports:
```typescript
export { formatError, toError } from "./format-error.js"
```

- [ ] **Step 3: Run tests to verify nothing is broken yet (old imports still work)**

Run: `npm test`
Expected: 290 tests pass (unchanged)

- [ ] **Step 4: Update `src/services/site-crawler/site-crawler.ts` import**

Change line 8 from:
```typescript
import { formatError } from "@/services/vacancy-scanner/index.js"
```
to:
```typescript
import { formatError } from "@/utils"
```

- [ ] **Step 5: Update `src/services/site-crawler/paginate.ts` import**

Change line 8 from:
```typescript
import { formatError } from "@/services/vacancy-scanner/index.js"
```
to:
```typescript
import { formatError } from "@/utils"
```

- [ ] **Step 6: Update `src/services/vacancy-enricher/vacancy-enricher.ts` import**

Change line 11 from:
```typescript
import { formatError } from "@/services/vacancy-scanner/index.js"
```
to:
```typescript
import { formatError } from "@/utils"
```

- [ ] **Step 7: Update `src/services/vacancy-enricher/commute.ts` import**

Change line 3 from:
```typescript
import { formatError } from "@/services/vacancy-scanner/index.js"
```
to:
```typescript
import { formatError } from "@/utils"
```

- [ ] **Step 8: Update `src/app/crawl-manager.ts` import**

Change line 8 from:
```typescript
import { toError } from "@/services/vacancy-scanner/index.js"
```
to:
```typescript
import { toError } from "@/utils"
```

- [ ] **Step 9: Update `src/app/ipc-setup.ts` import**

Change line 6 from:
```typescript
import { toError } from "@/services/vacancy-scanner/index.js"
```
to:
```typescript
import { toError } from "@/utils"
```

- [ ] **Step 10: Run tests to verify**

Run: `npm test`
Expected: 290 tests pass

- [ ] **Step 11: Commit**

```bash
git add src/utils/format-error.ts src/utils/index.ts \
  src/services/site-crawler/site-crawler.ts src/services/site-crawler/paginate.ts \
  src/services/vacancy-enricher/vacancy-enricher.ts src/services/vacancy-enricher/commute.ts \
  src/app/crawl-manager.ts src/app/ipc-setup.ts
git commit -m "refactor: move formatError and toError from vacancy-scanner to utils"
```

---

### Task 2: Move `ensureLlmAvailable` to `utils`

**Files:**
- Create: `src/utils/ensure-llm-available.ts`
- Modify: `src/utils/index.ts`
- Modify: `src/services/cover-letter-writer/cover-letter-writer.ts:5`
- Modify: `src/services/job-consultant/job-consultant.ts:4`

- [ ] **Step 1: Create `src/utils/ensure-llm-available.ts`**

```typescript
import type { LlmClient } from "@/plugins/llm"

export function ensureLlmAvailable(llm?: LlmClient): asserts llm is LlmClient {
  if (!llm) {
    throw new Error("No LLM API key configured")
  }
}
```

- [ ] **Step 2: Add re-export to `src/utils/index.ts`**

Add to existing exports:
```typescript
export { ensureLlmAvailable } from "./ensure-llm-available.js"
```

- [ ] **Step 3: Update `src/services/cover-letter-writer/cover-letter-writer.ts` import**

Change line 5 from:
```typescript
import { ensureLlmAvailable } from "@/services/llm/index.js"
```
to:
```typescript
import { ensureLlmAvailable } from "@/utils"
```

- [ ] **Step 4: Update `src/services/job-consultant/job-consultant.ts` import**

Change line 4 from:
```typescript
import { ensureLlmAvailable } from "@/services/llm/index.js"
```
to:
```typescript
import { ensureLlmAvailable } from "@/utils"
```

- [ ] **Step 5: Run tests to verify**

Run: `npm test`
Expected: 290 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/utils/ensure-llm-available.ts src/utils/index.ts \
  src/services/cover-letter-writer/cover-letter-writer.ts \
  src/services/job-consultant/job-consultant.ts
git commit -m "refactor: move ensureLlmAvailable from services/llm to utils"
```

---

### Task 3: Move `mergeAddresses` to `utils`

**Files:**
- Create: `src/utils/addresses.ts`
- Modify: `src/utils/index.ts`
- Modify: `src/services/vacancy-enricher/extract-contact.ts:5`

- [ ] **Step 1: Create `src/utils/addresses.ts`**

Copy the `mergeAddresses` function from `src/services/vacancy-processor/process.ts`:

```typescript
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
```

- [ ] **Step 2: Add re-export to `src/utils/index.ts`**

Add to existing exports:
```typescript
export { mergeAddresses } from "./addresses.js"
```

- [ ] **Step 3: Update `src/services/vacancy-enricher/extract-contact.ts` import**

Change line 5 from:
```typescript
import { mergeAddresses } from "@/services/vacancy-processor/index.js"
```
to:
```typescript
import { mergeAddresses } from "@/utils"
```

- [ ] **Step 4: Run tests to verify**

Run: `npm test`
Expected: 290 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/addresses.ts src/utils/index.ts \
  src/services/vacancy-enricher/extract-contact.ts
git commit -m "refactor: move mergeAddresses from vacancy-processor to utils"
```

---

### Task 4: Create `commute-computer` service

**Files:**
- Create: `src/services/commute-computer/commute-computer.ts`
- Create: `src/services/commute-computer/index.ts`

- [ ] **Step 1: Create `src/services/commute-computer/commute-computer.ts`**

Extract the class from `src/services/vacancy-enricher/commute.ts`. The class wraps the existing `computeCommutes` function with constructor DI:

```typescript
import type { CommuteClient } from "@/plugins/commute"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { Applicant } from "@/models/applicant"
import { formatError } from "@/utils"

export class CommuteComputer {
  constructor(private readonly commuteClient?: CommuteClient) {}

  async compute(
    vacancies: Vacancy[],
    applicant: Applicant,
    signal?: AbortSignal,
  ): Promise<Vacancy[]> {
    if (!this.commuteClient) return vacancies

    const origin = resolveCommuteOrigin(applicant)
    if (!origin) return vacancies

    const output = await computeCommutes({
      vacancies,
      origin,
      commuteClient: this.commuteClient,
      signal,
    })

    return output.vacancies
  }
}

interface ComputeCommutesInput {
  vacancies: Vacancy[]
  origin: string
  commuteClient: CommuteClient
  signal?: AbortSignal
}

interface ComputeCommutesOutput {
  vacancies: Vacancy[]
  computedCount: number
  skippedCount: number
  errorCount: number
}

async function computeCommutes(
  input: ComputeCommutesInput,
): Promise<ComputeCommutesOutput> {
  const { vacancies, origin, commuteClient, signal } = input

  const needsCommute = vacancies.filter(
    (v) => v.active && v.addresses.some((addr) => !(addr in v.commute)),
  )

  let computedCount = 0
  let errorCount = 0
  const updatedMap = new Map<string, Vacancy>()

  for (const vacancy of needsCommute) {
    if (signal?.aborted) break

    const result = await computeSingleVacancyCommute(
      vacancy,
      origin,
      commuteClient,
      signal,
    )
    errorCount += result.errors

    if (result.computed) {
      updatedMap.set(vacancy.hash, vacancy.with({ commute: result.commute }))
      computedCount++
    }
  }

  const mapped = vacancies.map((v) => updatedMap.get(v.hash) ?? v)
  const skippedCount = vacancies.length - needsCommute.length

  return { vacancies: mapped, computedCount, skippedCount, errorCount }
}

async function computeSingleVacancyCommute(
  vacancy: Vacancy,
  origin: string,
  commuteClient: CommuteClient,
  signal?: AbortSignal,
) {
  const commute = { ...vacancy.commute }
  let computed = false
  let errors = 0

  for (const address of vacancy.addresses) {
    if (address in commute) continue
    if (signal?.aborted) break

    try {
      commute[address] = await commuteClient.getCommute(origin, address, signal)
      computed = true
    } catch (error) {
      rethrowIfAborted(error)
      console.error(
        `Commute error for "${vacancy.title}" → "${address}":`,
        formatError(error),
      )
      errors++
    }
  }

  return { commute, computed, errors }
}

function rethrowIfAborted(error: unknown): void {
  if (error instanceof DOMException && error.name === "AbortError") throw error
}

function resolveCommuteOrigin(applicant: Applicant): string | undefined {
  const address = applicant.personal.address
  if (!address) return undefined
  return `${address.street}, ${address.zip} ${address.city}`
}
```

- [ ] **Step 2: Create `src/services/commute-computer/index.ts`**

```typescript
export { CommuteComputer } from "./commute-computer.js"
```

- [ ] **Step 3: Run tests to verify nothing breaks (old commute.ts still exists)**

Run: `npm test`
Expected: 290 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/services/commute-computer/
git commit -m "feat: add CommuteComputer service extracted from vacancy-enricher"
```

---

### Task 5: Absorb `vacancy-processor` logic into `site-crawler`

**Files:**
- Modify: `src/services/site-crawler/site-crawler.ts` — change `onResult` callback to emit `{ vacancy, hash }` instead of `VacancyDetails`
- Modify: `src/services/site-crawler/index.ts` — export `mergeAddresses` (now from utils) and any other needed symbols
- Move: `src/services/vacancy-processor/process.ts` → inline into site-crawler
- Move: `src/services/vacancy-processor/markdown.ts` → `src/services/site-crawler/markdown.ts`
- Move: `src/services/vacancy-processor/vacancy-hash.ts` → `src/services/site-crawler/vacancy-hash.ts`

- [ ] **Step 1: Move `markdown.ts` and `vacancy-hash.ts` into `site-crawler/`**

First copy the helper files:

```bash
cp src/services/vacancy-processor/markdown.ts src/services/site-crawler/markdown.ts
cp src/services/vacancy-processor/vacancy-hash.ts src/services/site-crawler/vacancy-hash.ts
```

Update imports in `markdown.ts` (change any relative imports to use `@/` paths if needed — check the file first). Read the file and update any imports from `./` to maintain correct references within the new location.

- [ ] **Step 2: Read `src/services/vacancy-processor/markdown.ts` and `src/services/vacancy-processor/vacancy-hash.ts` to verify imports**

Run:
```bash
cat src/services/vacancy-processor/markdown.ts
cat src/services/vacancy-processor/vacancy-hash.ts
```

These files likely have no internal imports of other vacancy-processor files. Verify and update the copied files accordingly.

- [ ] **Step 3: Run tests to verify copies don't break anything**

Run: `npm test`
Expected: 290 tests pass (old files still exist, new copies exist but not yet imported)

- [ ] **Step 4: Update `src/services/site-crawler/site-crawler.ts`** 

Read the full current file first: `src/services/site-crawler/site-crawler.ts`

This is a significant change. The `SiteCrawler` class needs to:
1. Accept optional `existingByHash` and `crawlDate` in the crawl options
2. In the `onResult` callback, call `process()` to convert `VacancyDetails` to `Vacancy`
3. Emit the `Vacancy` domain object instead of raw `VacancyDetails`

The implementation changes the `SiteCrawler` interface. We'll update the class to process vacancies internally.

Read the full current file and apply these edits:

a) Add imports for process helpers (top of file):
```typescript
import type { VacancyDetails } from "@/plugins/job-site"
import type { Vacancy } from "@/models/vacancy/index.js"
import { process as processVacancyDetails } from "./process.js"
```

b) Add `existingByHash` and `crawlDate` to `CrawlOptions`:
```typescript
interface CrawlOptions {
  sites: JobSite[]
  criteria: JobSearchCriteria
  signal?: AbortSignal
  onProgress?: (event: ProgressEvent) => void
  onResult: (result: { vacancy: Vacancy; hash: string }) => void
  existingByHash: Map<string, Vacancy>
  crawlDate: string
}
```

c) In `fetchAndEmit`, wrap the result:
```typescript
private async fetchAndEmit(
  site: JobSite,
  url: string,
  options: CrawlOptions,
): Promise<void> {
  let details: VacancyDetails
  try {
    details = await site.getVacancyDetails(url)
  } catch (error) {
    console.error(
      `[${site.name}] Failed to extract ${url}:`,
      formatError(error),
    )
    options.onProgress?.({
      message: `[${site.name}] Failed to extract ${url}`,
      phase: "scan",
    })
    return
  }
  const result = processVacancyDetails(
    details,
    site.name,
    options.existingByHash,
    options.crawlDate,
  )
  options.onResult(result)
}
```

- [ ] **Step 5: Create `src/services/site-crawler/process.ts`**

Move the `process` function from `src/services/vacancy-processor/process.ts`, but change the imports to be local:

```typescript
import type { VacancyDetails } from "@/plugins/job-site"
import { Vacancy } from "@/models/vacancy/index.js"
import type { FoundActivity, VacancyContact } from "@/models/vacancy"
import { vacancyHash } from "./vacancy-hash.js"
import { htmlToMarkdown } from "./markdown.js"
import { mergeAddresses } from "@/utils"

export function process(
  details: VacancyDetails,
  siteName: string,
  existingByHash: Map<string, Vacancy>,
  crawlDate: string,
): ProcessResult {
  const hash = vacancyHash(
    details.title,
    details.company,
    details.address,
    details.contact?.name,
  )

  const contact = contactFromDetails(details)
  const description = details.descriptionHtml
    ? htmlToMarkdown(details.descriptionHtml)
    : undefined

  const foundActivity: FoundActivity = {
    type: "found",
    date: crawlDate,
    site: siteName,
    url: details.url,
    description,
    contact,
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
    addresses: details.address ? [details.address] : [],
    contact,
    startDate: details.startDate,
    description,
    enriched: false,
    enrichmentDirty: true,
    activityHistory: [foundActivity],
    active: true,
  })

  return { vacancy, hash, isNew: true }
}

function contactFromDetails(
  details: VacancyDetails,
): VacancyContact | undefined {
  if (!details.contact) return undefined
  const { name, email, phone } = details.contact
  if (!name && !email && !phone) return undefined
  return { name, email, phone }
}

function mergeWithExisting(
  existing: Vacancy,
  details: VacancyDetails,
  hash: string,
  foundActivity: FoundActivity,
  contact?: VacancyContact,
  description?: string,
): ProcessResult {
  const descriptionChanged = hasDescriptionChanged(
    description,
    existing.description,
  )

  const vacancy = existing.with({
    urls: mergeUrls(existing.urls, details.url),
    addresses: mergeAddresses(
      existing.addresses,
      details.address ? [details.address] : [],
    ),
    description: description ?? existing.description,
    enrichmentDirty: existing.enrichmentDirty || descriptionChanged,
    contact: contact ?? existing.contact,
    startDate: details.startDate ?? existing.startDate,
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

function hasDescriptionChanged(
  newDesc?: string,
  existingDesc?: string,
): boolean {
  return !!newDesc && !!existingDesc && newDesc !== existingDesc
}
```

- [ ] **Step 6: Run tests to verify**

Run: `npm test`
Expected: The `vacancy-processor/process.test.ts` still passes (it imports from old location). The `site-crawler/site-crawler.test.ts` may fail if it depends on the old `onResult` signature — check and fix. The site-crawler test likely uses a mock `onResult` that expects `VacancyDetails`. Update it to expect `{ vacancy, hash }`.

- [ ] **Step 7: Update `src/services/site-crawler/index.ts`**

Read the current file. It likely only exports `SiteCrawler`. No changes needed if all internals are internal.

- [ ] **Step 8: Commit**

```bash
git add src/services/site-crawler/
git commit -m "refactor: absorb vacancy-processor logic into site-crawler"
```

---

### Task 6: Update `scan-pipeline` (was `vacancy-scanner`) — rename + add commute step

**Files:**
- Rename: `src/services/vacancy-scanner/` → `src/services/scan-pipeline/`
- Rename: `src/services/vacancy-scanner/vacancy-scanner.ts` → `src/services/scan-pipeline/scan-pipeline.ts`
- Move: `src/services/vacancy-scanner/enrich-queue.ts` → `src/services/scan-pipeline/enrich-queue.ts`
- Move: `src/services/vacancy-scanner/format-error.ts` → keep old (still exported from old index for backward compat)
- Move: `src/services/vacancy-processor/mark-unseen.ts` → `src/services/scan-pipeline/mark-unseen.ts`
- Create: `src/services/scan-pipeline/index.ts`
- Modify: All files that import from `@/services/vacancy-scanner`

- [ ] **Step 1: Create the new `scan-pipeline` directory and move files**

```bash
mkdir -p src/services/scan-pipeline
cp src/services/vacancy-scanner/enrich-queue.ts src/services/scan-pipeline/enrich-queue.ts
cp src/services/vacancy-scanner/vacancy-scanner.ts src/services/scan-pipeline/scan-pipeline.ts
cp src/services/vacancy-processor/mark-unseen.ts src/services/scan-pipeline/mark-unseen.ts
```

- [ ] **Step 2: Create `src/services/scan-pipeline/index.ts`**

```typescript
export { ScanPipeline, type OnProgress } from "./scan-pipeline.js"
export { EnrichQueue } from "./enrich-queue.js"
```

Note: `formatError` and `toError` are no longer exported from here — they're in utils.

- [ ] **Step 3: Update `src/services/scan-pipeline/enrich-queue.ts` imports**

Change line 5 from:
```typescript
} from "@/services/vacancy-enricher/index.js"
```
to (no change needed — same path):
```typescript
} from "@/services/vacancy-enricher/index.js"
```

- [ ] **Step 4: Update `src/services/scan-pipeline/scan-pipeline.ts`**

This file is `vacancy-scanner.ts` copied to `scan-pipeline.ts`. Apply these edits:

a) Rename class from `VacancyScanner` to `ScanPipeline`

b) Update imports — change `vacancy-scanner` to `scan-pipeline` where needed, change `vacancy-processor` imports to local or utils:

Old imports:
```typescript
import type { VacancyRepository } from "@/repositories/vacancy"
import type { JobSearchRepository } from "@/repositories/job-search"
import type { ApplicantRepository } from "@/repositories/applicant"
import type { JobSite } from "@/plugins/job-site"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { ProgressEvent } from "@/models/progress/index.js"
import { isAbortError } from "@/utils"
import { SiteCrawler } from "@/services/site-crawler/index.js"
import { resolveSearchParameters } from "@/services/site-crawler/index.js"
import {
  process as processVacancy,
  markUnseenAsGone,
} from "@/services/vacancy-processor/index.js"
import { VacancyEnricher } from "@/services/vacancy-enricher/index.js"
import { EnrichQueue } from "./enrich-queue.js"
```

New imports:
```typescript
import type { VacancyRepository } from "@/repositories/vacancy"
import type { JobSearchRepository } from "@/repositories/job-search"
import type { ApplicantRepository } from "@/repositories/applicant"
import type { JobSite } from "@/plugins/job-site"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { ProgressEvent } from "@/models/progress/index.js"
import { isAbortError } from "@/utils"
import { SiteCrawler } from "@/services/site-crawler/index.js"
import { resolveSearchParameters } from "@/services/site-crawler/index.js"
import { VacancyEnricher } from "@/services/vacancy-enricher/index.js"
import { CommuteComputer } from "@/services/commute-computer/index.js"
import { EnrichQueue } from "./enrich-queue.js"
import { markUnseenAsGone } from "./mark-unseen.js"
```

c) Update constructor — add `CommuteComputer` dependency:

```typescript
export class ScanPipeline {
  constructor(
    private readonly vacancyRepo: VacancyRepository,
    private readonly jobSearchRepo: JobSearchRepository,
    private readonly applicantRepo: ApplicantRepository,
    private readonly siteCrawler: SiteCrawler,
    private readonly commuteComputer: CommuteComputer,
    private readonly enricher: VacancyEnricher,
    private readonly listJobSiteNames: () => string[] = () => [],
  ) {}
```

d) In the `scan` method, the `onResult` callback now receives `{ vacancy, hash }` from `site-crawler` instead of raw `details`. Update the callback:

Old:
```typescript
onResult: (details, siteName) => {
  const result = processVacancy(details, siteName, existingByHash, crawlDate)
  const { vacancy, hash, isNew } = result
  // ...
}
```

New:
```typescript
onResult: (result) => {
  const { vacancy, hash, isNew } = result
  // ... rest is same (result contains { vacancy, hash, isNew } directly)
}
```

e) Add `existingByHash` and `crawlDate` to the crawl options:

```typescript
await this.siteCrawler.crawl({
  sites,
  criteria,
  signal: abortController.signal,
  onProgress,
  onResult: (result) => {
    const { vacancy, hash, isNew } = result
    // existingByHash.set, seenHashes.add, etc.
    // ...
  },
  existingByHash,
  crawlDate,
})
```

f) After the crawl completes and before enrich, add the commute batch step:

```typescript
// After the crawl loop, before drainQueue:
const allVacancies = [...existingByHash.values()]
const dirtyVacancies = allVacancies.filter((v) => v.enrichmentDirty)

const commutedVacancies = await this.commuteComputer.compute(
  dirtyVacancies,
  applicant,
  enrichAbortController.signal,
)

for (const v of commutedVacancies) {
  existingByHash.set(v.hash, v)
}
```

g) After commute, submit dirty vacancies to enrich queue:

```typescript
for (const v of commutedVacancies) {
  if (v.enrichmentDirty && !enrichAbortController.signal.aborted) {
    queue.submit(v, v.hash)
  }
}
```

h) Remove the old `processVacancy` call and `markUnseenAsGone` import from vacancy-processor (it's now local).

Full `scan` method after changes:

```typescript
async scan(
  id: string,
  abortController: AbortController,
  enrichAbortController: AbortController,
  onProgress: OnProgress,
  siteFactory: JobSiteFactory,
): Promise<void> {
  const jobSearch = this.jobSearchRepo.load(id)
  const sitesToRun =
    jobSearch.params.sources.length > 0
      ? jobSearch.params.sources
      : this.listJobSiteNames()

  const applicant = this.applicantRepo.load(jobSearch.applicantId)
  const criteria = resolveSearchParameters(jobSearch, applicant)
  const crawlDate = new Date().toISOString().slice(0, 10)

  const existing = this.vacancyRepo.loadAll(id)
  const existingByHash = new Map<string, Vacancy>()
  for (const v of existing.vacancies) {
    existingByHash.set(v.hash, v)
  }

  const sites = sitesToRun.map((name) => siteFactory(name))

  let lastSaveTime = 0
  const seenHashes = new Set<string>()
  const newCount = { value: 0 }
  const updatedCount = { value: 0 }

  const queue = new EnrichQueue({
    enricher: this.enricher,
    context: { applicant, preferences: jobSearch.preferences },
    onEnriched: (enriched, hash) => {
      existingByHash.set(hash, enriched)
      this.vacancyRepo.save(id, [...existingByHash.values()], crawlDate)
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
    sites,
    criteria,
    signal: abortController.signal,
    onProgress,
    existingByHash,
    crawlDate,
    onResult: (result) => {
      const { vacancy, hash, isNew } = result

      existingByHash.set(hash, vacancy)
      seenHashes.add(hash)

      if (isNew) {
        newCount.value++
      } else {
        updatedCount.value++
      }

      onProgress({
        message: `[${vacancy.sources?.[0] ?? "?"}] ${isNew ? "New" : "Updated"}: ${vacancy.title}`,
        phase: "scan",
      })

      const now = Date.now()
      if (now - lastSaveTime >= 1000) {
        this.vacancyRepo.save(id, [...existingByHash.values()], crawlDate)
        lastSaveTime = now
        onProgress({ message: "", phase: "scan", vacanciesUpdated: true })
      }
    },
  })

  // Commute batch step
  const allVacancies = [...existingByHash.values()]
  const dirtyForCommute = allVacancies.filter(
    (v) => v.enrichmentDirty && v.addresses.length > 0,
  )

  if (dirtyForCommute.length > 0 && !enrichAbortController.signal.aborted) {
    const commuted = await this.commuteComputer.compute(
      dirtyForCommute,
      applicant,
      enrichAbortController.signal,
    )
    for (const v of commuted) {
      existingByHash.set(v.hash, v)
    }
  }

  // Enrich step
  for (const [, v] of existingByHash) {
    if (v.enrichmentDirty && !enrichAbortController.signal.aborted) {
      queue.submit(v, v.hash)
    }
  }

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

  const finalAll = [...existingByHash.values()]
  const { vacancies: finalVacancies, goneCount } = markUnseenAsGone(
    finalAll,
    seenHashes,
    crawlDate,
  )

  this.vacancyRepo.save(id, finalVacancies, crawlDate)
  onProgress({ message: "", phase: "scan", vacanciesUpdated: true })

  onProgress({
    message: `Scan complete: ${newCount.value} new, ${updatedCount.value} updated, ${goneCount} gone`,
    phase: "complete",
  })
}
```

- [ ] **Step 5: Copy `mark-unseen.ts` and fix its imports**

Check `src/services/scan-pipeline/mark-unseen.ts` — it was copied from `vacancy-processor/mark-unseen.ts`. Read it and update any relative imports. It likely imports from models/vacancy directly (not relative).

- [ ] **Step 6: Update `src/services/scan-pipeline/enrich-queue.ts`**

The enrich-queue imports `VacancyEnricher` from `@/services/vacancy-enricher`. No change needed.

- [ ] **Step 7: Run tests to verify**

Run: `npm test`
Expected: Old vacancy-scanner tests still pass (old module not yet deleted). The new scan-pipeline module exists but is not imported by any test yet. Some tests may fail due to the `mergeAddresses` types being importable from both locations. Fix any failures.

- [ ] **Step 8: Update `src/services/scan-pipeline/scan-pipeline.ts` references to `sources`**

In the `onProgress` message, `vacancy.sources` might not exist — check the Vacancy model. Change to `vacancy.company` or another field.

Actually, looking at the original code, the message was:
```typescript
`[${siteName}] ${isNew ? "New" : "Updated"}: ${details.title || details.url}`
```

But `siteName` was a separate parameter. Now it's embedded in the result. We need to pass `siteName` through. Update the `SiteCrawler` to include `siteName` in the result:

In `site-crawler.ts`'s `fetchAndEmit`, the `processVacancyDetails` now produces `{ vacancy, hash, isNew }`. The `siteName` is known from the crawl loop. We can either:
- Include `siteName` in the `SiteCrawler` result: `{ vacancy, hash, isNew, siteName }`
- Or extract it from vacancy properties

Simplest: include `siteName` in the result. Update both `site-crawler.ts` and `scan-pipeline.ts` accordingly.

In `site-crawler.ts` onResult callback type:
```typescript
onResult: (result: { vacancy: Vacancy; hash: string; isNew: boolean; siteName: string }) => void
```

In `fetchAndEmit`:
```typescript
const result = processVacancyDetails(details, site.name, options.existingByHash, options.crawlDate)
options.onResult({ ...result, siteName: site.name })
```

In `scan-pipeline.ts`:
```typescript
const { vacancy, hash, isNew, siteName } = result
onProgress({
  message: `[${siteName}] ${isNew ? "New" : "Updated"}: ${vacancy.title}`,
  phase: "scan",
})
```

- [ ] **Step 9: Commit**

```bash
git add src/services/scan-pipeline/
git commit -m "refactor: rename vacancy-scanner to scan-pipeline, add commute step to pipeline"
```

---

### Task 7: Update `vacancy-enricher` — remove commute, fix imports

**Files:**
- Modify: `src/services/vacancy-enricher/vacancy-enricher.ts` — remove commute logic
- Delete: `src/services/vacancy-enricher/commute.ts`

- [ ] **Step 1: Delete `src/services/vacancy-enricher/commute.ts`**

```bash
rm src/services/vacancy-enricher/commute.ts
```

- [ ] **Step 2: Update `src/services/vacancy-enricher/vacancy-enricher.ts`**

Remove the commute-related code. The enricher now only does LLM assessment + contact extraction.

Remove the `CommuteClient` dependency from `EnricherDeps`, remove `tryComputeCommute`, remove the commute import.

Updated file:

```typescript
import type { LlmClient } from "@/plugins/llm"
import type { Applicant } from "@/models/applicant"
import type { SearchPreferences } from "@/models/job-search"
import type { Vacancy } from "@/models/vacancy/index.js"
import { formatError } from "@/utils"
import {
  needsAssessment,
  assessVacancy,
} from "./assess.js"
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

    const { result, successful } = await this.tryLlmEnrich(
      vacancy,
      context,
      signal,
    )
    if (successful) {
      return result.with({ enriched: true, enrichmentDirty: false })
    }
    return result
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
      context.preferences,
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
  preferences: SearchPreferences
}

interface EnricherDeps {
  llmClient?: LlmClient
}

function runLlmEnrichment(
  vacancy: Vacancy,
  applicant: Applicant,
  preferences: SearchPreferences,
  llmClient: LlmClient,
  signal?: AbortSignal,
) {
  return Promise.all([
    needsAssessment(vacancy)
      ? assessVacancy(vacancy, applicant, preferences, llmClient, signal).catch(
          (error) => {
            rethrowIfAborted(error)
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
          rethrowIfAborted(error)
          console.error(
            `Failed to extract contact for "${vacancy.title}":`,
            formatError(error),
          )
          return
        })
      : undefined,
  ])
}

function rethrowIfAborted(error: unknown): void {
  if (error instanceof DOMException && error.name === "AbortError") throw error
}
```

Note: `rethrowIfAborted` was in `commute.ts` and used by `vacancy-enricher.ts`. Since `commute.ts` is now deleted, copy the `rethrowIfAborted` helper into `vacancy-enricher.ts` (it is also used by `assess.ts`). Actually, check if `assess.ts` imports `rethrowIfAborted` from `commute.ts`.

- [ ] **Step 3: Check if `assess.ts` imports from `commute.ts`**

Read `src/services/vacancy-enricher/assess.ts`:
```bash
cat src/services/vacancy-enricher/assess.ts | head -10
```

If `assess.ts` imports `rethrowIfAborted` from `./commute.js`, update it to either import from `./vacancy-enricher.js` or have its own copy. Check the file.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: The `vacancy-enricher.test.ts` will need updates since it tests commute behavior. This test may fail. Read the test and update it to:
- Remove commute-related tests (the test that checks commute + LLM together)
- Keep LLM-only tests
- Update `makeCommuteClient` references

- [ ] **Step 5: Update `src/services/vacancy-enricher/vacancy-enricher.test.ts`**

Read the full test file and:
- Remove the `"computes commute and sets summary when both clients configured"` test (or modify it to not test commute)
- Remove `makeCommuteClient` helper and `CommuteClient` type import
- Remove `commuteClient` from any enricher constructor calls
- Keep tests that verify LLM assessment and contact extraction work

- [ ] **Step 6: Run tests to verify all pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/services/vacancy-enricher/
git rm src/services/vacancy-enricher/commute.ts 2>/dev/null
git commit -m "refactor: remove commute from vacancy-enricher, use formatError from utils"
```

---

### Task 8: Delete old modules

**Files:**
- Delete: `src/services/vacancy-processor/` (entire directory)
- Delete: `src/services/llm/` (entire directory)
- Delete: `src/services/vacancy-scanner/` (entire directory — replaced by `scan-pipeline`)
- Modify: `src/services/vacancy-scanner/index.ts` — keep as re-export shim OR delete entirely

- [ ] **Step 1: Read the current `src/services/vacancy-scanner/index.ts`**

It exports `VacancyScanner`, `OnProgress`, `EnrichQueue`, `formatError`, `toError`. After Task 6, the new `scan-pipeline/index.ts` exports `ScanPipeline`, `OnProgress`, `EnrichQueue`. The old `vacancy-scanner/index.ts` needs to be deleted, and all imports updated.

- [ ] **Step 2: Find all remaining imports from `@/services/vacancy-scanner`**

Run: `npm run fix`

ESLint will report errors for imports from deleted modules. Fix them:

- `src/app/composition/create-services.ts:19` — change `VacancyScanner` to `ScanPipeline`, path to `@/services/scan-pipeline`
- `src/app/crawl-manager.ts:2` — change `VacancyScanner` to `ScanPipeline`, path to `@/services/scan-pipeline`
- `src/app/crawl-manager.test.ts:2` — same change
- `src/app/ipc-vacancies.ts:6` — change `EnrichQueue` import to `@/services/scan-pipeline`
- `src/app/ipc-setup.ts:6` — already changed in Task 1 to `@/utils`

- [ ] **Step 3: Delete old directories**

```bash
rm -rf src/services/vacancy-processor
rm -rf src/services/llm
rm -rf src/services/vacancy-scanner
```

- [ ] **Step 4: Run tests to verify**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add -A src/
git commit -m "refactor: delete vacancy-processor, llm, and vacancy-scanner modules"
```

---

### Task 9: Update `create-services.ts` — wire up new `CommuteComputer` and `ScanPipeline`

**Files:**
- Modify: `src/app/composition/create-services.ts`

- [ ] **Step 1: Update imports in `src/app/composition/create-services.ts`**

Change:
```typescript
import { VacancyScanner } from "@/services/vacancy-scanner/index.js"
```
to:
```typescript
import { ScanPipeline } from "@/services/scan-pipeline/index.js"
```

Add:
```typescript
import { CommuteComputer } from "@/services/commute-computer/index.js"
```

- [ ] **Step 2: Update service instantiation in `buildServices`**

In `buildServices()`, create a `CommuteComputer` instance:
```typescript
const commuteComputer = new CommuteComputer(commuteClient)
```

Then update `ScanPipeline` constructor call:

Old:
```typescript
vacancyScanner: new VacancyScanner(
  context.vacancyRepo,
  context.jobSearchRepo,
  context.applicantRepo,
  new SiteCrawler(),
  vacancyEnricher,
  getJobSiteNames,
),
```

New:
```typescript
vacancyScanner: new ScanPipeline(
  context.vacancyRepo,
  context.jobSearchRepo,
  context.applicantRepo,
  new SiteCrawler(),
  commuteComputer,
  vacancyEnricher,
  getJobSiteNames,
),
```

- [ ] **Step 3: Update `AppServices` interface**

Change `vacancyScanner: VacancyScanner` to `vacancyScanner: ScanPipeline`.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: Tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/composition/create-services.ts
git commit -m "refactor: wire CommuteComputer into ScanPipeline in create-services"
```

---

### Task 10: Update `crawl-manager.ts` and `crawl-manager.test.ts` imports

**Files:**
- Modify: `src/app/crawl-manager.ts`
- Modify: `src/app/crawl-manager.test.ts`

- [ ] **Step 1: Update `src/app/crawl-manager.ts` imports**

The `toError` import was already changed in Task 1. Now change the `VacancyScanner` type import:

Change lines 1-4 from:
```typescript
import type {
  VacancyScanner,
  OnProgress,
} from "@/services/vacancy-scanner/index.js"
```
to:
```typescript
import type {
  ScanPipeline,
  OnProgress,
} from "@/services/scan-pipeline/index.js"
```

Change line 82 from `vacancyScanner: Pick<VacancyScanner, "scan">` to `vacancyScanner: Pick<ScanPipeline, "scan">`.

- [ ] **Step 2: Update `src/app/crawl-manager.test.ts`**

Change the import from:
```typescript
import type { VacancyScanner, OnProgress } from "@/services/vacancy-scanner"
```
to:
```typescript
import type { ScanPipeline, OnProgress } from "@/services/scan-pipeline"
```

Update any usage of `VacancyScanner` type to `ScanPipeline` in the test file.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/crawl-manager.ts src/app/crawl-manager.test.ts
git commit -m "refactor: update crawl-manager imports for ScanPipeline rename"
```

---

### Task 11: Update `ipc-vacancies.ts` import

**Files:**
- Modify: `src/app/ipc-vacancies.ts`

- [ ] **Step 1: Update `src/app/ipc-vacancies.ts` import**

Change line 6 from:
```typescript
import { EnrichQueue } from "@/services/vacancy-scanner/index.js"
```
to:
```typescript
import { EnrichQueue } from "@/services/scan-pipeline/index.js"
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/app/ipc-vacancies.ts
git commit -m "refactor: update EnrichQueue import path to scan-pipeline"
```

---

### Task 12: Update ESLint architecture config

**Files:**
- Modify: `eslint.config.ts`

- [ ] **Step 1: Update `eslint.config.ts` architecture config**

In the `services/*` entry, remove `"services/*"` from the imports list (default deny inter-service imports):

Old:
```typescript
"services/*": {
  imports: [
    "services/*",
    "repositories/*",
    "plugins/*",
    "models/+",
    "utils/+",
  ],
},
```

New (leaf services default):
```typescript
"services/*": {
  imports: [
    "repositories/+",
    "plugins/+",
    "models/+",
    "utils/+",
  ],
},
```

- [ ] **Step 2: Add explicit entries for `scan-pipeline` and `commute-computer`**

Add `scan-pipeline` entry (non-leaf, allowed to import specific services):

```typescript
"services/scan-pipeline": {
  imports: [
    "services/site-crawler",
    "services/commute-computer",
    "services/vacancy-enricher",
    "repositories/+",
    "plugins/+",
    "models/+",
    "utils/+",
  ],
},
```

Add `commute-computer` entry (leaf, follows default):

```typescript
"services/commute-computer": {
  imports: [
    "plugins/+",
    "models/+",
    "utils/+",
  ],
},
```

Note: The `services/*` entry already covers `commute-computer` via wildcard.

- [ ] **Step 3: Remove old entries**

Remove `"services/vacancy-scanner"` and `"services/vacancy-processor"` entries if they exist as explicit overrides (they likely don't since they were covered by `services/*`).

- [ ] **Step 4: Run eslint to verify architecture**

Run: `npm run fix`
Expected: No `unslop/import-control` errors. If any services have inter-service imports beyond what's explicitly allowed, ESLint will report them.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.ts
git commit -m "refactor: tighten eslint inter-service imports to default-deny"
```

---

### Task 13: Move tests for moved logic

**Files:**
- Move: `src/services/vacancy-processor/process.test.ts` → `src/services/site-crawler/process.test.ts`
- Create: `src/services/commute-computer/commute-computer.test.ts` (new)
- Modify: `src/services/vacancy-enricher/vacancy-enricher.test.ts` (already updated in Task 7)
- Modify: `src/services/vacancy-scanner/enrich-queue.test.ts` → `src/services/scan-pipeline/enrich-queue.test.ts`
- Modify: `src/services/site-crawler/site-crawler.test.ts` (already updated in Task 5)

- [ ] **Step 1: Move and update `process.test.ts`**

```bash
cp src/services/vacancy-processor/process.test.ts src/services/site-crawler/process.test.ts
```

Read and update the test imports:
- Change `import { process, markUnseenAsGone, vacancyHash } from "."` to `import { process } from "./process.js"` (process is now internal to site-crawler)
- Remove `markUnseenAsGone` and `vacancyHash` tests from this file — they test other modules
- Update `mergeAddresses` import to `@/utils`
- Verify the test still works: `npm test -- src/services/site-crawler/process.test.ts`

- [ ] **Step 2: Copy `markUnseenAsGone` tests to scan-pipeline**

Check if `process.test.ts` has `markUnseenAsGone` tests. If so, extract them into `src/services/scan-pipeline/mark-unseen.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { markUnseenAsGone } from "./mark-unseen.js"
import { Vacancy } from "@/models/vacancy/index.js"

describe("markUnseenAsGone", () => {
  // Copy the relevant test cases from process.test.ts
})
```

- [ ] **Step 3: Create `commute-computer/commute-computer.test.ts`**

Write tests for the `CommuteComputer` class:

```typescript
import { describe, it, expect, vi } from "vitest"
import { CommuteComputer } from "."
import { Vacancy } from "@/models/vacancy/index.js"
import type { CommuteClient } from "@/plugins/commute"
import { makeVacancy, APPLICANT } from "./test-helpers.js"

describe("CommuteComputer", () => {
  it("returns vacancies unchanged when no commute client configured", async () => {
    const computer = new CommuteComputer(undefined)
    const vacancies = [makeVacancy("h1")]

    const result = await computer.compute(vacancies, APPLICANT)
    expect(result).toBe(vacancies)
  })

  it("returns vacancies unchanged when applicant has no address", async () => {
    const client = { getCommute: vi.fn() }
    const computer = new CommuteComputer(client)
    const applicantWithoutAddress = { ...APPLICANT, personal: { ...APPLICANT.personal, address: undefined } }
    const vacancies = [makeVacancy("h1")]

    const result = await computer.compute(vacancies, applicantWithoutAddress)
    expect(result).toBe(vacancies)
    expect(client.getCommute).not.toHaveBeenCalled()
  })

  it("computes commute for vacancies with addresses", async () => {
    const client: CommuteClient = {
      getCommute: vi.fn().mockResolvedValue("15 min"),
    }
    const computer = new CommuteComputer(client)
    const vacancy = makeVacancy("h1", { addresses: ["Berlin"] })
    const vacancies = [vacancy]

    const result = await computer.compute(vacancies, APPLICANT)
    expect(result[0].commute["Berlin"]).toBe("15 min")
    expect(client.getCommute).toHaveBeenCalled()
  })

  it("handles API errors gracefully and continues", async () => {
    const client: CommuteClient = {
      getCommute: vi.fn().mockRejectedValue(new Error("API error")),
    }
    const computer = new CommuteComputer(client)
    const vacancy = makeVacancy("h1", { addresses: ["Berlin"] })
    const vacancies = [vacancy]

    const result = await computer.compute(vacancies, APPLICANT)
    expect(result[0]).toBe(vacancy) // unchanged
  })

  it("respects abort signal", async () => {
    const client: CommuteClient = {
      getCommute: vi.fn().mockResolvedValue("15 min"),
    }
    const computer = new CommuteComputer(client)
    const controller = new AbortController()
    controller.abort()
    const vacancy = makeVacancy("h1", { addresses: ["Berlin"] })

    const result = await computer.compute([vacancy], APPLICANT, controller.signal)
    expect(result).toEqual([vacancy])
  })
})
```

Create a test helper file `src/services/commute-computer/test-helpers.ts` with `makeVacancy` and `APPLICANT` helpers, or inline them.

- [ ] **Step 4: Move `enrich-queue.test.ts`**

```bash
cp src/services/vacancy-scanner/enrich-queue.test.ts src/services/scan-pipeline/enrich-queue.test.ts
```

Update the import: The test imports from `"."` (local), which will resolve correctly since `EnrichQueue` is exported from `scan-pipeline/index.ts`. No changes needed.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/services/site-crawler/process.test.ts src/services/scan-pipeline/ src/services/commute-computer/
git commit -m "test: move and update tests for restructured services"
```

---

### Task 14: Delete old test files

**Files:**
- Delete: `src/services/vacancy-processor/` (includes test files)
- Delete: `src/services/vacancy-scanner/` (includes test files)

- [ ] **Step 1: Verify old test locations are empty or only contain moved files**

Run:
```bash
find src/services/vacancy-processor -name '*.test.*' 2>/dev/null
find src/services/vacancy-scanner -name '*.test.*' 2>/dev/null
```

These directories were deleted in Task 8. If tests still exist there, they're now dead files.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit any remaining cleanup**

```bash
git add -A src/
git commit -m "chore: remove old test files for deleted modules"
```

---

### Task 15: Full verification

**Files:** *all*

- [ ] **Step 1: Run `npm run fix`**

Run: `npm run fix`
Expected: No errors from knip, eslint, jscpd, or prettier. All formatting, linting, and dead code checks pass.

- [ ] **Step 2: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Run `npm run verify`**

Run: `npm run verify`
Expected: Full build + all checks pass

- [ ] **Step 4: Run crawler integration tests (if affected)**

Run: `npm run test:crawler`
Expected: All integration tests pass. If crawler tests reference old service names, update them.

- [ ] **Step 5: Commit final verification**

```bash
git add -A
git commit -m "chore: final cleanup and verification after service restructuring"
```
