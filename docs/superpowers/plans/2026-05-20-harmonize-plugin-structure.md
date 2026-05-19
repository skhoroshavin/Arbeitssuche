# Implementation Plan: Harmonize Plugin Structure

## Task 1: Update AGENTS.md — public surfaces rule and test suffixes

**Files:**
- Modify: `AGENTS.md`
- Modify: `vitest.integration.config.ts`

- [ ] **Step 1: Update the public surfaces rule in AGENTS.md**

Replace:
```
- **Public surfaces:** Cross-module imports must go through `index.ts`. `types.ts` is an internal contract file for repositories and plugins — do not import it cross-module.
```
With:
```
- **Public surfaces:** Cross-module imports must go through `index.ts`. Prefer defining interfaces directly in `index.ts`; extract to a separate file only when the type surface is large enough to hurt readability.
```

- [ ] **Step 2: Update the test suffix convention in AGENTS.md**

Replace:
```
- **File naming:** `*.ts`, `*.tsx` → `kebab-case`. Test suffixes: `.test.ts`, `.test.tsx`, `.test-suite.ts`, `.integration-test.ts`.
```
With:
```
- **File naming:** `*.ts`, `*.tsx` → `kebab-case`. Test suffixes: `.test.ts`, `.test.tsx`, `.test-suite.ts`, `.integration.test.ts`.
```

- [ ] **Step 3: Update vitest integration config include pattern**

In `vitest.integration.config.ts`, change the include pattern to match the new convention and broaden to cover all plugin integration tests:

```ts
include: ["src/plugins/**/*.integration.test.ts"],
```

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md vitest.integration.config.ts
git commit -m "docs: update public surfaces rule and test suffix convention"
```

---

## Task 2: Inline browser types and delete types.ts

**Files:**
- Modify: `src/plugins/browser/index.ts`
- Modify: `src/plugins/browser/electron/index.ts`
- Modify: `src/plugins/browser/stub/index.ts`
- Modify: `src/plugins/browser/playwright/index.ts`
- Modify: `src/plugins/job-site/utils/index.ts`
- Delete: `src/plugins/browser/types.ts`

- [ ] **Step 1: Move interface definitions into browser/index.ts**

Write `src/plugins/browser/index.ts`:

```ts
export interface OpenPageOptions {
  waitFor?: string
  blockPatterns?: RegExp[]
}

export interface Browser {
  openPage(url: string, options?: OpenPageOptions): Promise<Page>
  close(): Promise<void>
}

export interface Page {
  html: string
  navigate(url: string, options?: { waitFor?: string }): Promise<void>
  close(): Promise<void>
}

export { createElectronBrowser } from "./electron"
export { BrowserStub } from "./stub"

export async function createPlaywrightBrowser(options?: {
  headless?: boolean
  recordDirectory?: string
}): Promise<Browser> {
  const module = await import("./playwright")
  return module.createPlaywrightBrowser(options)
}
```

- [ ] **Step 2: Verify all browser submodule imports go through the index**

All browser submodules (electron, stub, playwright) already import types from `@/plugins/browser` rather than `./types.js`. No import changes needed in any submodule.

- [ ] **Step 3: Delete browser/types.ts**

```bash
rm src/plugins/browser/types.ts
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/plugins/browser
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add -A src/plugins/browser/
git commit -m "refactor: inline browser types into index.ts, delete types.ts"
```

---

## Task 3: Inline commute types, convert to CommuteProvider, delete types.ts

**Files:**
- Modify: `src/plugins/commute/index.ts`
- Modify: `src/plugins/commute/google-maps/index.ts`
- Modify: `src/plugins/commute/stub/index.ts`
- Delete: `src/plugins/commute/types.ts`

This task has two parts: (a) inline types, (b) convert `CommuteProviderInfo` → `CommuteProvider`.

- [ ] **Step 1: Write the new commute/index.ts**

The current `types.ts` exports: `CommuteClient`, `CommuteResult`, `CommuteProviderInfo`, and an internal `CommuteDurations`.

Replace `CommuteProviderInfo` with `CommuteProvider` (which adds `createClient` and `ping`).

Write `src/plugins/commute/index.ts`:

```ts
export interface CommuteClient {
  getCommute(
    origin: string,
    destination: string,
    signal?: AbortSignal,
  ): Promise<CommuteResult>
  ping(): Promise<boolean>
}

export interface CommuteResult {
  distance: string
  durations: CommuteDurations
  fetchedAt: string
}

export interface CommuteProvider {
  readonly id: string
  readonly name: string
  readonly instructions: string
  createClient(apiKey: string): CommuteClient
  ping(apiKey: string): Promise<boolean>
}

interface CommuteDurations {
  morning: number
  day: number
  evening: number
}

export { GoogleMapsCommuteProvider } from "./google-maps"
export { createStubCommuteClient } from "./stub"

const PROVIDERS: CommuteProvider[] = []

export function getCommuteProviders(): CommuteProvider[] {
  return PROVIDERS
}

export function getCommuteProvider(providerId: string): CommuteProvider {
  const provider = PROVIDERS.find((p) => p.id === providerId)
  if (!provider) {
    throw new Error(`Unknown commute provider: ${providerId}`)
  }
  return provider
}
```

Wait — we need to register `GoogleMapsCommuteProvider` in the PROVIDERS array. That requires importing it at module level. We'll do that.

Write `src/plugins/commute/index.ts`:

```ts
export interface CommuteClient {
  getCommute(
    origin: string,
    destination: string,
    signal?: AbortSignal,
  ): Promise<CommuteResult>
  ping(): Promise<boolean>
}

export interface CommuteResult {
  distance: string
  durations: CommuteDurations
  fetchedAt: string
}

export interface CommuteProvider {
  readonly id: string
  readonly name: string
  readonly instructions: string
  createClient(apiKey: string): CommuteClient
  ping(apiKey: string): Promise<boolean>
}

interface CommuteDurations {
  morning: number
  day: number
  evening: number
}

import { GoogleMapsCommuteProvider } from "./google-maps"

export { GoogleMapsCommuteProvider } from "./google-maps"
export { createStubCommuteClient } from "./stub"

const PROVIDERS: readonly CommuteProvider[] = [GoogleMapsCommuteProvider]

export function getCommuteProviders(): readonly CommuteProvider[] {
  return PROVIDERS
}

export function getCommuteProvider(providerId: string): CommuteProvider {
  const provider = PROVIDERS.find((p) => p.id === providerId)
  if (!provider) {
    throw new Error(`Unknown commute provider: ${providerId}`)
  }
  return provider
}
```

- [ ] **Step 2: Refactor google-maps/index.ts to export a CommuteProvider**

The current file exports `createGoogleMapsCommuteClient` (factory) and `googleMapsProviderInfo` (data). Replace with a `GoogleMapsCommuteProvider` object implementing `CommuteProvider`.

Write `src/plugins/commute/google-maps/index.ts`:

```ts
import { z } from "zod"

import type { CommuteClient, CommuteProvider, CommuteResult } from "@/plugins/commute"

export const GoogleMapsCommuteProvider: CommuteProvider = {
  id: "google-maps",
  name: "Google Maps",
  instructions: [
    "1. Öffne die [Google Cloud Console](https://console.cloud.google.com)",
    "2. Erstelle ein [neues Projekt](https://console.cloud.google.com/projectcreate) oder wähle ein bestehendes aus",
    "3. Aktiviere die [Abrechnung](https://console.cloud.google.com/billing) für das Projekt (erforderlich für API-Zugriff)",
    '4. Öffne die [API-Bibliothek](https://console.cloud.google.com/apis/library) und suche nach "Distance Matrix API"',
    '5. Klicke auf [Distance Matrix API](https://console.cloud.google.com/apis/library/distance-matrix-backend.googleapis.com) → "Aktivieren"',
    '6. Gehe zu [Anmeldedaten](https://console.cloud.google.com/apis/credentials) → "Anmeldedaten erstellen" → "API-Schlüssel"',
    '7. Klicke auf "Schlüssel einschränken" und wähle unter "API-Einschränkungen" nur die Distance Matrix API',
    "8. Kopiere den Schlüssel - er beginnt mit `AIza...`",
    "9. Füge ihn oben ein",
  ].join("\n"),
  createClient(apiKey: string): CommuteClient {
    return new GoogleMapsCommuteClient(apiKey)
  },
  async ping(apiKey: string): Promise<boolean> {
    return new GoogleMapsCommuteClient(apiKey).ping()
  },
}

class GoogleMapsCommuteClient implements CommuteClient {
  constructor(private readonly apiKey: string) {}

  async getCommute(
    origin: string,
    destination: string,
    signal?: AbortSignal,
  ): Promise<CommuteResult> {
    const nextWeekday = getNextWeekday()
    const atHour = (hour: number) =>
      fetchDuration(
        origin,
        destination,
        this.apiKey,
        departureTimestamp(nextWeekday, hour),
        signal,
      )

    const [morning, day, evening] = await Promise.all([
      atHour(8),
      atHour(12),
      atHour(18),
    ])

    return {
      distance: morning.distance,
      durations: {
        morning: morning.durationMinutes,
        day: day.durationMinutes,
        evening: evening.durationMinutes,
      },
      fetchedAt: new Date().toISOString(),
    }
  }

  async ping(): Promise<boolean> {
    const GOOGLE_MAPS_OK_STATUSES = new Set(["OK", "ZERO_RESULTS"])
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=Berlin&destination=Berlin&mode=transit&key=${this.apiKey}`
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) {
      await response.text()
      return false
    }
    const data = DirectionsResponseSchema.parse(
      JSON.parse(await response.text()),
    )
    return GOOGLE_MAPS_OK_STATUSES.has(data.status)
  }
}

async function fetchDuration(
  origin: string,
  destination: string,
  apiKey: string,
  departureTime: number,
  signal?: AbortSignal,
): Promise<{ distance: string; durationMinutes: number }> {
  const parameters = new URLSearchParams({
    origins: origin,
    destinations: destination,
    mode: "transit",
    departure_time: String(departureTime),
    key: apiKey,
  })

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${parameters}`
  const combinedSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
    : AbortSignal.timeout(10_000)
  const response = await fetch(url, { signal: combinedSignal })

  if (!response.ok) {
    throw new Error(
      `Distance Matrix API error: ${response.status} ${response.statusText}`,
    )
  }

  const data = DistanceMatrixResponseSchema.parse(
    JSON.parse(await response.text()),
  )

  if (data.status !== "OK") {
    throw new Error(`Distance Matrix API status: ${data.status}`)
  }

  return parseRouteElement(data, destination)
}

function parseRouteElement(
  data: z.infer<typeof DistanceMatrixResponseSchema>,
  destination: string,
): { distance: string; durationMinutes: number } {
  const element = data.rows[0].elements[0]
  if (element.status !== "OK" || !element.distance || !element.duration) {
    throw new Error(`No route found for "${destination}": ${element.status}`)
  }
  return {
    distance: element.distance.text,
    durationMinutes: Math.round(element.duration.value / 60),
  }
}

function getNextWeekday(): Date {
  const now = new Date()
  const DAYS_UNTIL_MON = [1, 1, 1, 1, 1, 3, 2] as const
  const daysUntil = DAYS_UNTIL_MON[now.getDay()]

  const next = new Date(now)
  next.setDate(now.getDate() + daysUntil)
  next.setHours(0, 0, 0, 0)
  return next
}

function departureTimestamp(baseDate: Date, hour: number): number {
  const d = new Date(baseDate)
  d.setHours(hour, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

const DirectionsResponseSchema = z.object({ status: z.string() })

const DistanceMatrixResponseSchema = z.object({
  rows: z.array(
    z.object({
      elements: z.array(
        z.object({
          status: z.string(),
          distance: z.object({ text: z.string() }).optional(),
          duration: z.object({ value: z.number() }).optional(),
        }),
      ),
    }),
  ),
  status: z.string(),
})
```

Wait — the `ping` in the provider needs to call `createGoogleMapsCommuteClient(apiKey).ping()` which creates a `GoogleMapsCommuteClient`. We can just create the client inline. Let me simplify the provider:

```ts
export const GoogleMapsCommuteProvider: CommuteProvider = {
  id: "google-maps",
  name: "Google Maps",
  instructions: "...\n...",
  createClient(apiKey: string): CommuteClient {
    return new GoogleMapsCommuteClient(apiKey)
  },
  ping(apiKey: string): Promise<boolean> {
    return new GoogleMapsCommuteClient(apiKey).ping()
  },
}
```

The `@deprecated` export of `createGoogleMapsCommuteClient` is unnecessary overhead — just keep the provider. The only external consumer using `createGoogleMapsCommuteClient` directly is `create-services.ts`, which we'll update to use the provider.

- [ ] **Step 3: Delete commute/types.ts**

```bash
rm src/plugins/commute/types.ts
```

- [ ] **Step 4: Update commute/stub/index.ts**

The stub imports from types.ts. Change:

```ts
import type { CommuteClient, CommuteResult } from "@/plugins/commute"
```

(No change needed — it already imports from the index.)

- [ ] **Step 5: Update external consumers of CommuteProviderInfo**

In `src/app/ipc-settings.ts`, change:
- `getCommuteProviders` stays — it now returns `CommuteProvider[]` instead of `CommuteProviderInfo[]`
- `createCommuteClient` is removed — use `getCommuteProvider(id).createClient(apiKey)` instead
- In the `testProviderSecret` function, change from `createCommuteClient(providerId, value).ping()` to `getCommuteProvider(providerId).ping(value)`

In `src/app/composition/create-services.ts`, change:
- `import { createGoogleMapsCommuteClient } from "@/plugins/commute"` → `import { GoogleMapsCommuteProvider } from "@/plugins/commute"`
- Use `GoogleMapsCommuteProvider.createClient(googleMapsApiKey)` instead of `createGoogleMapsCommuteClient(googleMapsApiKey)`

In `src/ui/data/settings.ts`, change:
- `CommuteProviderInfoSchema` → `CommuteProviderSchema` (the schema shape is identical: id, name, instructions)

In `src/services/vacancy-enricher/vacancy-enricher.test.ts` — only imports `CommuteClient` type, no change needed.

- [ ] **Step 6: Run tests**

```bash
npm test -- src/plugins/commute
```

- [ ] **Step 7: Commit**

```bash
git add -A src/plugins/commute/
git commit -m "refactor: inline commute types, add CommuteProvider interface, delete types.ts"
```

---

## Task 4: Inline pdf-renderer types, delete types.ts and stub test

**Files:**
- Modify: `src/plugins/pdf-renderer/index.ts`
- Modify: `src/plugins/pdf-renderer/electron/index.ts`
- Modify: `src/plugins/pdf-renderer/stub/index.ts`
- Delete: `src/plugins/pdf-renderer/types.ts`
- Delete: `src/plugins/pdf-renderer/pdf-renderer.test.ts`

- [ ] **Step 1: Write the new pdf-renderer/index.ts**

```ts
export interface PdfRenderer {
  htmlToPdf(html: string): Promise<Buffer | Uint8Array>
}

export { createElectronPdfRenderer } from "./electron"
export { createStubPdfRenderer } from "./stub"
```

- [ ] **Step 2: Verify electron and stub imports are from index**

Check `src/plugins/pdf-renderer/electron/index.ts` — it imports `import type { PdfRenderer } from "@/plugins/pdf-renderer"`. No change needed.

Check `src/plugins/pdf-renderer/stub/index.ts` — same. No change needed.

- [ ] **Step 3: Delete types.ts and test**

```bash
rm src/plugins/pdf-renderer/types.ts
rm src/plugins/pdf-renderer/pdf-renderer.test.ts
```

- [ ] **Step 4: Verify no other imports reference types.ts**

```bash
rg "pdf-renderer/types" src/
```

Expected: no results.

- [ ] **Step 5: Run tests**

```bash
npm test -- src/plugins/pdf-renderer
```

Expected: tests pass (just the stub is tested in integration contexts, the unit test is deleted).

- [ ] **Step 6: Commit**

```bash
git add -A src/plugins/pdf-renderer/
git commit -m "refactor: inline pdf-renderer types, delete types.ts and stub test"
```

---

## Task 5: Inline fetch type into arbeitsagentur, dissolve plugins/fetch/

**Files:**
- Modify: `src/plugins/job-site/arbeitsagentur/index.ts`
- Modify: `src/plugins/job-site/arbeitsagentur/index.test.ts`
- Modify: `src/plugins/commute/google-maps/index.test.ts`
- Modify: `src/utils/http-stub.ts`
- Modify: `src/utils/index.ts`
- Delete: `src/plugins/fetch/index.ts`
- Delete: `src/plugins/fetch/types.ts`
- Delete: `src/plugins/fetch/stub/index.ts`
- Delete: `src/plugins/fetch/` directory

- [ ] **Step 1: Add Fetch type to arbeitsagentur**

In `src/plugins/job-site/arbeitsagentur/index.ts`, replace:
```ts
import type { Fetch } from "@/plugins/fetch"
```
With a local type definition at the top of the file:
```ts
type Fetch = (url: string, init?: RequestInit) => Promise<Response>
```

- [ ] **Step 2: Move FetchStub into utils/http-stub.ts**

Append to `src/utils/http-stub.ts`:

```ts
export class FetchStub extends HttpStub<StubRoute> {
  fetch(input: string | URL | Request, _init?: RequestInit): Promise<Response> {
    const url = resolveUrl(input)
    const route = this.get(url)
    if (route) {
      return Promise.resolve(
        Response.json(route.body, { status: route.status ?? 200 }),
      )
    }
    return Promise.resolve(new Response("Not Found", { status: 404 }))
  }
}

interface StubRoute {
  body: unknown
  status?: number
}

function resolveUrl(input: string | URL | Request): string {
  if (input instanceof Request) {
    return input.url
  }
  return input.toString()
}
```

- [ ] **Step 3: Export FetchStub from utils/index.ts**

Add `FetchStub` to the exports in `src/utils/index.ts`:
```ts
export { FetchStub } from "./http-stub.js"
```

(Alongside the existing `HttpStub` export.)

- [ ] **Step 4: Update arbeitsagentur test import**

In `src/plugins/job-site/arbeitsagentur/index.test.ts`, replace:
```ts
import { FetchStub } from "@/plugins/fetch"
```
With:
```ts
import { FetchStub } from "@/utils"
```

- [ ] **Step 5: Update commute test import**

In `src/plugins/commute/google-maps/index.test.ts`, replace:
```ts
import { FetchStub } from "@/plugins/fetch"
```
With:
```ts
import { FetchStub } from "@/utils"
```

- [ ] **Step 6: Delete plugins/fetch/ directory**

```bash
rm -rf src/plugins/fetch/
```

- [ ] **Step 7: Run tests**

```bash
npm test -- src/plugins/job-site/arbeitsagentur/index.test.ts
npm test -- src/plugins/commute/google-maps/index.test.ts
npm test -- src/utils/http-stub.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: inline Fetch type into arbeitsagentur, move FetchStub to utils, dissolve plugins/fetch"
```

---

## Task 6: Inline llm types and convert to LlmProvider

**Files:**
- Modify: `src/plugins/llm/index.ts`
- Modify: `src/plugins/llm/openrouter/index.ts`
- Modify: `src/plugins/llm/requesty/index.ts`
- Modify: `src/plugins/llm/openai-compatible/index.ts`
- Modify: `src/models/config/config.ts`
- Modify: `src/models/config/index.ts`
- Modify: `src/app/ipc-settings.ts`
- Modify: `src/app/composition/create-services.ts`
- Modify: `src/ui/data/settings.ts`
- Modify: `src/ui/pages/settings/views/ai.tsx`
- Delete: `src/plugins/llm/types.ts`

The `LlmProvider` name is already taken by `models/config` as a string union type (`"openrouter" | "requesty"`). We rename that to `LlmProviderId` to free up `LlmProvider` for the new interface.

- [ ] **Step 1: Rename LlmProvider → LlmProviderId in models/config**

In `src/models/config/config.ts`, change:
```ts
export type LlmProvider = "openrouter" | "requesty"
```
To:
```ts
export type LlmProviderId = "openrouter" | "requesty"
```

And change the default value line:
```ts
provider: LlmProvider = DEFAULT_PROVIDER
```
To:
```ts
provider: LlmProviderId = DEFAULT_PROVIDER
```

And change:
```ts
export const DEFAULT_PROVIDER: LlmProvider = "openrouter"
```
To:
```ts
export const DEFAULT_PROVIDER: LlmProviderId = "openrouter"
```

In `src/models/config/index.ts`, change the export:
```ts
export type { Address, LlmModel, LlmProviderId, ConfigKey } from "./config.js"
```

- [ ] **Step 2: Update all imports of LlmProvider from models/config**

In `src/ui/data/settings.ts`, change:
```ts
import type { ConfigKey, LlmModel, LlmProvider } from "@/models/config"
```
To:
```ts
import type { ConfigKey, LlmModel, LlmProviderId } from "@/models/config"
```

And update the usage `const provider: LlmProvider =` to `const provider: LlmProviderId =`.

In `src/ui/pages/settings/views/ai.tsx`, make the same change.

- [ ] **Step 3: Write the new llm/index.ts with inlined types and LlmProvider**

```ts
export interface TypedSchema<T> {
  schema: object
  parse: (input: string) => T
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

export interface LlmProvider {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly instructions: string
  createClient(apiKey: string, model: string): LlmClient
  createModelRegistry(): LlmModelRegistry
  ping(apiKey: string): Promise<boolean>
}

import { OpenRouterProvider } from "./openrouter"
import { RequestyProvider } from "./requesty"

const PROVIDERS: readonly LlmProvider[] = [
  OpenRouterProvider,
  RequestyProvider,
]

export function getLlmProviders(): readonly LlmProvider[] {
  return PROVIDERS
}

export function getLlmProvider(providerId: string): LlmProvider {
  const provider = PROVIDERS.find((p) => p.id === providerId)
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${providerId}`)
  }
  return provider
}
```

- [ ] **Step 4: Delete llm/types.ts**

```bash
rm src/plugins/llm/types.ts
```

- [ ] **Step 5: Update-openai-compatible to use LlmProvider types from index**

In `src/plugins/llm/openai-compatible/index.ts`, change:
```ts
import type {
  LlmClient,
  LlmModelInfo,
  LlmModelRegistry,
  LlmPricing,
  TypedSchema,
} from "@/plugins/llm"
```
(No change needed — it already imports from `@/plugins/llm`.)

- [ ] **Step 6: Convert openrouter to a provider**

In `src/plugins/llm/openrouter/index.ts`, replace the current exports (`createOpenRouterClient`, `createOpenRouterModelRegistry`, `openrouterProviderInfo`) with a single `OpenRouterProvider` object.

Write `src/plugins/llm/openrouter/index.ts`:

```ts
import {
  createModelRegistry,
  createOpenAICompatibleClient,
  normalizeNestedPricing,
} from "@/plugins/openai-compatible/index.js"
import type { LlmProvider } from "@/plugins/llm"

export const OpenRouterProvider: LlmProvider = {
  id: "openrouter",
  name: "OpenRouter",
  description: "Global",
  instructions: [
    "1. Erstelle ein Konto auf [openrouter.ai](https://openrouter.ai) oder melde dich an",
    "2. Gehe zu [Credits](https://openrouter.ai/credits)",
    '3. Klicke auf "Buy Credits" und füge Guthaben hinzu',
    '4. Gehe zu [Keys](https://openrouter.ai/keys) → klicke auf "Create Key"',
    '5. Gib dem Schlüssel einen Namen (z.B. "Arbeitssuche") und klicke auf "Create"',
    "6. Kopiere den Schlüssel - er beginnt mit `sk-or-...`",
    "7. Füge ihn oben ein",
  ].join("\n"),
  createClient(apiKey: string, model: string): LlmClient {
    return createOpenAICompatibleClient(
      "https://openrouter.ai/api/v1",
      apiKey,
      model,
      "OpenRouter",
    )
  },
  createModelRegistry(): LlmModelRegistry {
    return createModelRegistry(
      "https://openrouter.ai/api/v1/models",
      (m) => ({
        id: String(m.id),
        name: String(m.name),
        pricing: normalizeNestedPricing(m.pricing),
      }),
    )
  },
  async ping(apiKey: string): Promise<boolean> {
    return createOpenAICompatibleClient(
      "https://openrouter.ai/api/v1",
      apiKey,
      "",
      "OpenRouter",
    ).ping()
  },
}

import type { LlmClient, LlmModelRegistry } from "@/plugins/llm"
```

Wait — we need `LlmClient` and `LlmModelRegistry` types. These are already in the import from `@/plugins/llm`. Let me restructure:

```ts
import type { LlmClient, LlmModelRegistry, LlmProvider } from "@/plugins/llm"
import {
  createModelRegistry,
  createOpenAICompatibleClient,
  normalizeNestedPricing,
} from "@/plugins/openai-compatible/index.js"

export const OpenRouterProvider: LlmProvider = {
  id: "openrouter",
  name: "OpenRouter",
  description: "Global",
  instructions: [
    "1. Erstelle ein Konto auf [openrouter.ai](https://openrouter.ai) oder melde dich an",
    "2. Gehe zu [Credits](https://openrouter.ai/credits)",
    '3. Klicke auf "Buy Credits" und füge Guthaben hinzu',
    '4. Gehe zu [Keys](https://openrouter.ai/keys) → klicke auf "Create Key"',
    '5. Gib dem Schlüssel einen Namen (z.B. "Arbeitssuche") und klicke auf "Create"',
    "6. Kopiere den Schlüssel - er beginnt mit `sk-or-...`",
    "7. Füge ihn oben ein",
  ].join("\n"),
  createClient(apiKey: string, model: string): LlmClient {
    return createOpenAICompatibleClient(
      "https://openrouter.ai/api/v1",
      apiKey,
      model,
      "OpenRouter",
    )
  },
  createModelRegistry(): LlmModelRegistry {
    return createModelRegistry(
      "https://openrouter.ai/api/v1/models",
      (m) => ({
        id: String(m.id),
        name: String(m.name),
        pricing: normalizeNestedPricing(m.pricing),
      }),
    )
  },
  async ping(apiKey: string): Promise<boolean> {
    return createOpenAICompatibleClient(
      "https://openrouter.ai/api/v1",
      apiKey,
      "",
      "OpenRouter",
    ).ping()
  },
}
```

- [ ] **Step 7: Convert requesty to a provider**

Write `src/plugins/llm/requesty/index.ts`:

```ts
import type { LlmClient, LlmModelInfo, LlmModelRegistry, LlmProvider } from "@/plugins/llm"
import {
  createModelRegistry,
  createOpenAICompatibleClient,
  normalizeFlatPricing,
} from "@/plugins/openai-compatible/index.js"

export const RequestyProvider: LlmProvider = {
  id: "requesty",
  name: "Requesty",
  description: "EU-Datenverarbeitung",
  instructions: [
    "1. Erstelle ein Konto auf [requesty.ai](https://requesty.ai) oder melde dich an",
    '2. Gehe zu [Settings](https://app.requesty.ai/settings) → klicke auf "Add Credits" und füge Guthaben hinzu',
    '3. Klicke in der Seitenleiste auf "[API Keys](https://app.requesty.ai/api-keys)"',
    '4. Klicke auf "Create API Key" und gib einen Namen ein (z.B. "Arbeitssuche")',
    "5. Kopiere den Schlüssel",
    "6. Füge ihn oben ein",
  ].join("\n"),
  createClient(apiKey: string, model: string): LlmClient {
    return createOpenAICompatibleClient(
      "https://router.eu.requesty.ai/v1",
      apiKey,
      model,
      "Requesty",
    )
  },
  createModelRegistry(): LlmModelRegistry {
    const inner = createModelRegistry(
      "https://router.eu.requesty.ai/v1/models",
      (m) => ({
        id: String(m.id),
        name: typeof m.name === "string" ? m.name : deriveModelName(String(m.id)),
        pricing: normalizeFlatPricing(m),
      }),
    )
    return new EuFilteredModelRegistry(inner)
  },
  async ping(apiKey: string): Promise<boolean> {
    return createOpenAICompatibleClient(
      "https://router.eu.requesty.ai/v1",
      apiKey,
      "",
      "Requesty",
    ).ping()
  },
}

class EuFilteredModelRegistry implements LlmModelRegistry {
  constructor(private readonly inner: LlmModelRegistry) {}

  async fetchModels(): Promise<LlmModelInfo[]> {
    const all = await this.inner.fetchModels()
    return filterEuAndDeduplicate(all)
  }
}

function filterEuAndDeduplicate(models: LlmModelInfo[]): LlmModelInfo[] {
  const seen = new Map<string, LlmModelInfo>()
  for (const model of models) {
    const { baseId, region } = splitRegion(model.id)
    if (region !== undefined && !isEuRegion(region)) continue
    if (!seen.has(baseId)) {
      seen.set(baseId, { ...model, id: baseId })
    }
  }
  return [...seen.values()]
}

function deriveModelName(id: string): string {
  const slash = id.indexOf("/")
  const base = slash === -1 ? id : id.slice(slash + 1)
  const { baseId: withoutRegion } = splitRegion(base)
  const parts = withoutRegion.split("-")
  const result: string[] = []
  for (const part of parts) {
    const isNumeric = /^\d/.test(part)
    const previous = result.at(-1)
    if (isNumeric && previous && /^\d/.test(previous)) {
      result[result.length - 1] += `.${part}`
    } else {
      result.push(part.charAt(0).toUpperCase() + part.slice(1))
    }
  }
  return result.join(" ")
}

function isEuRegion(region: string): boolean {
  return EU_REGIONS.has(region) || region.startsWith("eu-")
}

function splitRegion(id: string): { baseId: string; region?: string } {
  const at = id.lastIndexOf("@")
  return at === -1
    ? { baseId: id, region: undefined }
    : { baseId: id.slice(0, at), region: id.slice(at + 1) }
}

const EU_REGIONS = new Set([
  "francecentral",
  "swedencentral",
  "germanywestcentral",
  "westeurope",
  "northeurope",
  "uksouth",
  "ukwest",
  "italynorth",
  "polandcentral",
  "spaincentral",
])
```

- [ ] **Step 8: Update openai-compatible/test imports**

Check if the test files import from `@/plugins/llm/types` — they don't, they import from `@/plugins/llm`. No change needed.

- [ ] **Step 9: Update ipc-settings.ts**

In `src/app/ipc-settings.ts`, change:
```ts
import { getLlmProviders, createLlmClientForPing } from "@/plugins/llm"
import { getCommuteProviders, createCommuteClient } from "@/plugins/commute"
```
To:
```ts
import { getLlmProviders, getLlmProvider } from "@/plugins/llm"
import { getCommuteProviders, getCommuteProvider } from "@/plugins/commute"
```

And update the `testProviderSecret` function. The current code:
```ts
const ok =
  mapping === LLM_SECRET_KEYS
    ? await createLlmClientForPing(providerId, value).ping()
    : await createCommuteClient(providerId, value).ping()
```
Becomes:
```ts
const ok =
  mapping === LLM_SECRET_KEYS
    ? await getLlmProvider(providerId).ping(value)
    : await getCommuteProvider(providerId).ping(value)
```

- [ ] **Step 10: Update create-services.ts**

In `src/app/composition/create-services.ts`, change:
```ts
import { createGoogleMapsCommuteClient } from "@/plugins/commute"
import type { LlmClient, LlmModelRegistry } from "@/plugins/llm"
import { createLlmClient, createModelRegistry } from "@/plugins/llm"
```
To:
```ts
import { GoogleMapsCommuteProvider } from "@/plugins/commute"
import type { LlmClient, LlmModelRegistry } from "@/plugins/llm"
import { getLlmProvider } from "@/plugins/llm"
```

And update `buildLlmClient`:
```ts
function buildLlmClient(
  factory: LlmClientFactory | undefined,
  provider: string,
  apiKey: string | undefined,
  model: string,
): LlmClient | undefined {
  if (factory) {
    try {
      return factory(model)
    } catch {
      return undefined
    }
  }
  if (!apiKey) return undefined
  return getLlmProvider(provider).createClient(apiKey, model)
}
```

And update the commute line:
```ts
const commuteClient = googleMapsApiKey
  ? GoogleMapsCommuteProvider.createClient(googleMapsApiKey)
  : context.commuteClient
```

And update modelRegistry:
```ts
const modelRegistry = context.modelRegistry ?? getLlmProvider(provider).createModelRegistry()
```

- [ ] **Step 11: Update LlmProviderInfoSchema in settings.ts**

In `src/ui/data/settings.ts`, the schema name `LlmProviderInfoSchema` should become `LlmProviderSchema` (the shape is identical: id, name, description, instructions). Just rename the variable.

Similarly `CommuteProviderInfoSchema` → `CommuteProviderSchema`.

- [ ] **Step 12: Run tests**

```bash
npm test -- src/plugins/llm/
npm test -- src/app/
npm test -- src/ui/
```

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "refactor: inline LLM types, add LlmProvider interface, rename LlmProvider→LlmProviderId"
```

---

## Task 7: Inline job-site types and move JobPostingJsonLd to per-site files

**Files:**
- Modify: `src/plugins/job-site/index.ts`
- Modify: `src/plugins/job-site/xing/index.ts`
- Modify: `src/plugins/job-site/dm/index.ts`
- Delete: `src/plugins/job-site/types.ts`

- [ ] **Step 1: Write the new job-site/index.ts with inlined public types**

Move the public types from `types.ts` into `index.ts`, but remove `JobPostingJsonLd` and `JobPostingAddress` exports.

Write `src/plugins/job-site/index.ts`:

```ts
export type {
  JobSite,
  SearchCriteria,
  SearchMode,
  JobSiteInfo,
  VacancyListPage,
  VacancyDetails,
  VacancyContact,
}

import type { Browser } from "@/plugins/browser"
import type { JobSite, JobSiteInfo, SearchMode } from "."
import {
  createArbeitsagenturSite,
  SUPPORTED_MODES as ARBEITSAGENTUR_MODES,
} from "./arbeitsagentur"
import { createDmSite, SUPPORTED_MODES as DM_MODES } from "./dm"
import { createXingSite, SUPPORTED_MODES as XING_MODES } from "./xing"
import { createZalandoSite, SUPPORTED_MODES as ZALANDO_MODES } from "./zalando"

export function getJobSiteInfos(): JobSiteInfo[] {
  return Object.entries(REGISTRY).map(([name, entry]) => ({
    name,
    supportedModes: entry.supportedModes,
  }))
}

export function createJobSite(name: string, browser: Browser): JobSite {
  if (!isRegistryKey(name)) {
    throw new Error(
      `Unknown site: "${name}". Available: ${getJobSiteNames().join(", ")}`,
    )
  }
  return REGISTRY[name].factory(browser)
}

export function getJobSiteNames(): string[] {
  return Object.keys(REGISTRY)
}

function isRegistryKey(name: string): name is keyof typeof REGISTRY {
  return name in REGISTRY
}

const REGISTRY = {
  arbeitsagentur: {
    factory: createArbeitsagenturSite,
    supportedModes: ARBEITSAGENTUR_MODES,
  },
  xing: { factory: createXingSite, supportedModes: XING_MODES },
  zalando: { factory: createZalandoSite, supportedModes: ZALANDO_MODES },
  dm: { factory: createDmSite, supportedModes: DM_MODES },
} satisfies Record<string, SiteEntry>

interface SiteEntry {
  factory: (browser: Browser) => JobSite
  supportedModes: readonly SearchMode[]
}

export interface SearchCriteria {
  location: string
  query: string
  radiusKm: number
  mode: SearchMode
}

export interface JobSite {
  name: string
  supportedModes: SearchMode[]
  getVacancyList(
    criteria: SearchCriteria,
    pageId?: string,
  ): Promise<VacancyListPage>
  getVacancyDetails(url: string): Promise<VacancyDetails>
}

export type SearchMode = "employment" | "entry-level" | "apprenticeship"

export interface JobSiteInfo {
  name: string
  supportedModes: readonly SearchMode[]
}

export interface VacancyListPage {
  urls: string[]
  nextPageId?: string
}

export interface VacancyDetails {
  url: string
  title: string
  company: string
  address?: string
  descriptionHtml?: string
  startDate?: string
  publishedAt?: string
  contact?: VacancyContact
}

export interface VacancyContact {
  name?: string
  email?: string
  phone?: string
}
```

Wait — the `export type` at the top re-exports, but the interfaces are now defined inline. We don't need `export type` at the top AND `export interface` below. Remove the `export type` block and keep only the `export interface` definitions.

Let me reconsider. The current `index.ts` has:
```ts
export type {
  JobPostingJsonLd,
  JobSite,
  SearchCriteria,
  SearchMode,
  VacancyContact,
  VacancyDetails,
  VacancyListPage,
} from "./types.js"
```

And `types.ts` defines all these plus `JobSiteInfo` and `JobPostingAddress`. After inlining, we define them directly in `index.ts` and export them. We remove the `JobPostingJsonLd` and `JobPostingAddress` exports entirely.

The final `index.ts`:

```ts
import type { Browser } from "@/plugins/browser"

import {
  createArbeitsagenturSite,
  SUPPORTED_MODES as ARBEITSAGENTUR_MODES,
} from "./arbeitsagentur"
import { createDmSite, SUPPORTED_MODES as DM_MODES } from "./dm"
import { createXingSite, SUPPORTED_MODES as XING_MODES } from "./xing"
import { createZalandoSite, SUPPORTED_MODES as ZALANDO_MODES } from "./zalando"

export interface SearchCriteria {
  location: string
  query: string
  radiusKm: number
  mode: SearchMode
}

export interface JobSite {
  name: string
  supportedModes: SearchMode[]
  getVacancyList(
    criteria: SearchCriteria,
    pageId?: string,
  ): Promise<VacancyListPage>
  getVacancyDetails(url: string): Promise<VacancyDetails>
}

export type SearchMode = "employment" | "entry-level" | "apprenticeship"

export interface JobSiteInfo {
  name: string
  supportedModes: readonly SearchMode[]
}

export interface VacancyListPage {
  urls: string[]
  nextPageId?: string
}

export interface VacancyDetails {
  url: string
  title: string
  company: string
  address?: string
  descriptionHtml?: string
  startDate?: string
  publishedAt?: string
  contact?: VacancyContact
}

export interface VacancyContact {
  name?: string
  email?: string
  phone?: string
}

export function getJobSiteInfos(): JobSiteInfo[] {
  return Object.entries(REGISTRY).map(([name, entry]) => ({
    name,
    supportedModes: entry.supportedModes,
  }))
}

export function createJobSite(name: string, browser: Browser): JobSite {
  if (!isRegistryKey(name)) {
    throw new Error(
      `Unknown site: "${name}". Available: ${getJobSiteNames().join(", ")}`,
    )
  }
  return REGISTRY[name].factory(browser)
}

export function getJobSiteNames(): string[] {
  return Object.keys(REGISTRY)
}

function isRegistryKey(name: string): name is keyof typeof REGISTRY {
  return name in REGISTRY
}

const REGISTRY = {
  arbeitsagentur: {
    factory: createArbeitsagenturSite,
    supportedModes: ARBEITSAGENTUR_MODES,
  },
  xing: { factory: createXingSite, supportedModes: XING_MODES },
  zalando: { factory: createZalandoSite, supportedModes: ZALANDO_MODES },
  dm: { factory: createDmSite, supportedModes: DM_MODES },
} satisfies Record<string, SiteEntry>

interface SiteEntry {
  factory: (browser: Browser) => JobSite
  supportedModes: readonly SearchMode[]
}
```

- [ ] **Step 2: Move JobPostingJsonLd and JobPostingAddress into xing**

Add both interfaces locally to `src/plugins/job-site/xing/index.ts`. Remove the import of `JobPostingJsonLd` from `@/plugins/job-site`.

The `JobPostingJsonLd` interface for xing:

```ts
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
```

Update the import in xing — remove `JobPostingJsonLd` from the `import type` from `@/plugins/job-site`.

- [ ] **Step 3: Move JobPostingJsonLd and JobPostingAddress into dm**

Same thing — add the same two interfaces locally in `src/plugins/job-site/dm/index.ts`. Remove `JobPostingJsonLd` from the import from `@/plugins/job-site`.

- [ ] **Step 4: Delete types.ts**

```bash
rm src/plugins/job-site/types.ts
```

- [ ] **Step 5: Verify no references to types.ts**

```bash
rg "job-site/types" src/
```

Expected: no results.

- [ ] **Step 6: Run tests**

```bash
npm test -- src/plugins/job-site/
```

- [ ] **Step 7: Commit**

```bash
git add -A src/plugins/job-site/
git commit -m "refactor: inline job-site types, move JobPostingJsonLd to site-local, delete types.ts"
```

---

## Task 8: Verify openai-compatible still works

No structural changes needed — Task 6 already converted the top-level LLM factories to `LlmProvider` objects. The `openai-compatible` module remains a shared internal utility providing `OpenAICompatibleClient`, `createModelRegistry`, and `toStrictSchema` used by openrouter and requesty.

- [ ] **Step 1: Verify openai-compatible tests still pass**

```bash
npm test -- src/plugins/llm/openai-compatible/
```

---

## Task 9: Rename and convert commute integration test

**Files:**
- Delete: `src/plugins/commute/commute.test.ts`
- Create: `src/plugins/commute/google-maps/integration.test.ts`

- [ ] **Step 1: Delete the old stub-only test**

```bash
rm src/plugins/commute/commute.test.ts
```

- [ ] **Step 2: Create a real integration test for Google Maps**

Create `src/plugins/commute/integration.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import { GoogleMapsCommuteProvider } from "@/plugins/commute"

describe("Google Maps CommuteProvider", () => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  test.skipIf(!apiKey)("ping returns true with a valid API key", async () => {
    const provider = GoogleMapsCommuteProvider
    const result = await provider.ping(apiKey ?? "")
    expect(result).toBe(true)
  })

  test.skipIf(!apiKey)("createClient returns commute data for Berlin to Munich", async () => {
    const client = GoogleMapsCommuteProvider.createClient(apiKey ?? "")
    const result = await client.getCommute("Berlin", "Munich")
    expect(result.distance).toBeTruthy()
    expect(result.durations.morning).toBeGreaterThan(0)
    expect(result.fetchedAt).toBeTruthy()
  })

  test("ping returns false with an invalid API key", async () => {
    const provider = GoogleMapsCommuteProvider
    const result = await provider.ping("invalid-key")
    expect(result).toBe(false)
  })
})
```

- [ ] **Step 3: Verify the integration test config includes this file**

The `vitest.integration.config.ts` include pattern was updated in Task 1 Step 3 to `src/plugins/**/*.integration.test.ts`, which covers commute. No further config changes needed.

- [ ] **Step 4: Run the integration test (will skip if no API key)**

```bash
npx vitest run --config vitest.integration.config.ts src/plugins/commute/integration.test.ts
```

Expected: tests skip (no API key) or pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: replace commute stub test with real Google Maps integration test"
```

---

## Task 10: Rename job-site integration test and delete pdf-renderer stub test

**Files:**
- Rename: `src/plugins/job-site/index.integration-test.ts` → `src/plugins/job-site/integration.test.ts`

- [ ] **Step 1: Rename the file**

```bash
git mv src/plugins/job-site/index.integration-test.ts src/plugins/job-site/integration.test.ts
```

- [ ] **Step 2: Verify no references to old filename**

```bash
rg "index.integration-test" src/
```

Expected: no results.

- [ ] **Step 3: Delete pdf-renderer stub test (if not already done in Task 4)**

```bash
rm -f src/plugins/pdf-renderer/pdf-renderer.test.ts
```

- [ ] **Step 4: Run the integration test config**

```bash
npx vitest run --config vitest.integration.config.ts
```

Expected: job-site integration tests run (may need network).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rename integration test files to .integration.test.ts convention"
```

---

## Task 11: Run full fix and test suite

- [ ] **Step 1: Run npm run fix**

```bash
npm run fix
```

Fix any lint issues reported.

- [ ] **Step 2: Run full test suite**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 3: Run integration tests**

```bash
npx vitest run --config vitest.integration.config.ts
```

Expected: Tests run (skipped without API keys, or pass with them).

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: fix lint and formatting after plugin structure harmonization"
```