# Plan: HttpStub URL Router

**Spec:** `docs/superpowers/specs/2026-05-17-http-stub-design.md`
**Date:** 2026-05-17

---

### Task 1: Create `HttpStub<T>` class

**Files:**
- Create: `src/utils/http-stub.ts`
- Create: `src/utils/http-stub.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/http-stub.test.ts
import { test, describe, expect } from "vitest"
import { HttpStub } from "./http-stub.js"

describe("HttpStub", () => {
  describe("get()", () => {
    test("returns undefined when no patterns are set", () => {
      const stub = new HttpStub<string>()
      expect(stub.get("https://example.com/any")).toBeUndefined()
    })

    test("returns exact match by URL key", () => {
      const stub = new HttpStub<string>()
        .set("https://example.com/exact", "exact-hit")
        .set("other", "other-hit")

      expect(stub.get("https://example.com/exact")).toBe("exact-hit")
    })

    test("returns substring match when no exact key exists", () => {
      const stub = new HttpStub<string>()
        .set("api/search", "search-hit")
        .set("api/detail", "detail-hit")

      expect(stub.get("https://example.com/api/search?q=foo")).toBe("search-hit")
    })

    test("prefers exact match over substring match", () => {
      const stub = new HttpStub<string>()
        .set("search", "substring-hit")
        .set("https://example.com/api/search", "exact-hit")

      expect(stub.get("https://example.com/api/search")).toBe("exact-hit")
    })

    test("returns first substring match in insertion order", () => {
      const stub = new HttpStub<string>()
        .set("search", "first")
        .set("api/search", "second")

      // "search" is substring of the URL (inserted first), so it wins
      expect(stub.get("https://example.com/api/search")).toBe("first")
    })
  })

  describe("requestedUrls", () => {
    test("tracks URLs in call order", () => {
      const stub = new HttpStub<string>()
        .set("search", "hit")

      stub.get("https://a.com/search")
      stub.get("https://b.com/search")
      stub.get("https://c.com/other")

      expect(stub.requestedUrls).toEqual([
        "https://a.com/search",
        "https://b.com/search",
        "https://c.com/other",
      ])
    })
  })

  describe("set()", () => {
    test("returns this for chaining", () => {
      const stub = new HttpStub<string>()
      expect(stub.set("pattern", "value")).toBe(stub)
    })

    test("overwrites existing pattern with same key", () => {
      const stub = new HttpStub<string>()
        .set("search", "old")
        .set("search", "new")

      expect(stub.get("https://example.com/search")).toBe("new")
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/http-stub.test.ts
```
Expected: FAIL — `HttpStub` not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/utils/http-stub.ts
export class HttpStub<T> {
  private readonly entries = new Map<string, T>()
  readonly requestedUrls: string[] = []

  set(urlPattern: string, response: T): this {
    this.entries.set(urlPattern, response)
    return this
  }

  get(url: string): T | undefined {
    this.requestedUrls.push(url)
    if (this.entries.has(url)) {
      return this.entries.get(url)
    }
    for (const [urlPattern, response] of this.entries) {
      if (url.includes(urlPattern)) {
        return response
      }
    }
    return undefined
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/utils/http-stub.test.ts
```
Expected: PASS — all 7 tests pass.

- [ ] **Step 5: Run full test suite to check nothing is broken yet**

```bash
npm test:all
```
Expected: PASS (HttpStub is added but not yet consumed — no breakage).

- [ ] **Step 6: Commit**

```bash
git add src/utils/http-stub.ts src/utils/http-stub.test.ts
git commit -m "feat: add HttpStub<T> URL router class with tests"
```

---

### Task 2: Export HttpStub from utils/index.ts

**Files:**
- Modify: `src/utils/index.ts`

- [ ] **Step 1: Add HttpStub export**

```ts
// src/utils/index.ts — full file after edit
export { extractJsonLd } from "./json-ld.js"
export { joinNormalizedText, normalizeOptionalText } from "./normalize.js"
export { isRecord, stringField } from "./reflection.js"
export {
  findStubMatch,
  setupTemporaryDatabaseDirectory,
} from "./test-utilities.js"
export { createUniqueDerivedId } from "./id.js"
export { Database, Statement } from "./database.js"
export { HttpStub } from "./http-stub.js"
```

Old text (replace line):
```
export { createUniqueDerivedId } from "./id.js"
```
New text:
```
export { createUniqueDerivedId } from "./id.js"
export { HttpStub } from "./http-stub.js"
```

- [ ] **Step 2: Verify import resolves**

```bash
npx tsc --noEmit
```
Expected: PASS — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/index.ts
git commit -m "feat: export HttpStub from utils index"
```

---

### Task 3: Remove findStubMatch from test-utilities and index

**Files:**
- Modify: `src/utils/test-utilities.ts`
- Modify: `src/utils/index.ts`

- [ ] **Step 1: Remove findStubMatch function from test-utilities.ts**

Replace the entire file content:

```ts
// src/utils/test-utilities.ts
import { beforeAll, afterAll } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

export function setupTemporaryDatabaseDirectory(prefix: string) {
  let temporaryDirectory: string
  let counter = 0

  beforeAll(() => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`))
  })

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  })

  return {
    nextId: () => String(counter++),
    pathForId: (id: string) => path.join(temporaryDirectory, `${id}.db`),
  }
}
```

- [ ] **Step 2: Remove findStubMatch from utils/index.ts exports**

Replace:
```ts
export {
  findStubMatch,
  setupTemporaryDatabaseDirectory,
} from "./test-utilities.js"
```
With:
```ts
export { setupTemporaryDatabaseDirectory } from "./test-utilities.js"
```

- [ ] **Step 3: Verify no remaining references to findStubMatch**

```bash
npx tsc --noEmit
```
Expected: FAIL — `findStubMatch` still imported in `StubBrowser` and `StubFetch` (those will be fixed in Tasks 4–5).

- [ ] **Step 4: Commit**

```bash
git add src/utils/test-utilities.ts src/utils/index.ts
git commit -m "refactor: remove findStubMatch from utils"
```

---

### Task 4: Update StubFetch to use HttpStub

**Files:**
- Modify: `src/plugins/fetch/stub/index.ts`
- Existing tests use `createStubFetch` and should continue to pass after edits.

- [ ] **Step 1: Rewrite createStubFetch to accept HttpStub<StubRoute>**

```ts
// src/plugins/fetch/stub/index.ts — full file after edit
import type { Fetch } from "@/plugins/fetch"
import { HttpStub } from "@/utils/index.js"

export function createStubFetch(routes: HttpStub<StubRoute>): StubFetch {
  const stubFetch: StubFetch = Object.assign(
    (url: string, _init?: RequestInit): Promise<Response> => {
      const route = routes.get(url)
      if (route) {
        return Promise.resolve(
          Response.json(route.body, {
            status: route.status ?? 200,
          }),
        )
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }))
    },
    { requestedUrls: routes.requestedUrls },
  )

  return stubFetch
}

export interface StubRoute {
  body: unknown
  status?: number
}

export interface StubFetch extends Fetch {
  requestedUrls: string[]
}
```

Note: `StubRoute` and `StubFetch` change from `interface` (file-local) to `export interface` — consumers (tests) may reference them via `@/plugins/fetch`.

- [ ] **Step 2: Verify StubRoute/StubFetch are exported from fetch plugin index**

Check `src/plugins/fetch/index.ts`:
```
export type { Fetch } from "./types.js"
export { createStubFetch } from "./stub"
```

Add type exports:
```
export type { Fetch } from "./types.js"
export { createStubFetch } from "./stub"
export type { StubRoute, StubFetch } from "./stub"
```

- [ ] **Step 3: Run existing tests that use createStubFetch to see compilation errors**

```bash
npx vitest run src/plugins/job-site/arbeitsagentur/index.test.ts
```
Expected: FAIL — type errors because `createStubFetch` now expects `HttpStub<StubRoute>` instead of `Record<string, StubRoute>`.

- [ ] **Step 4: Commit the stub implementation**

```bash
git add src/plugins/fetch/stub/index.ts src/plugins/fetch/index.ts
git commit -m "refactor: update StubFetch to use HttpStub<StubRoute>"
```

---

### Task 5: Update StubBrowser to use HttpStub

**Files:**
- Modify: `src/plugins/browser/stub/index.ts`

- [ ] **Step 1: Rewrite StubBrowser to accept HttpStub<string>**

```ts
// src/plugins/browser/stub/index.ts — full file after edit
import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"
import typia from "typia"
import { HttpStub } from "@/utils/index.js"
import type { Browser, Page, OpenPageOptions } from "@/plugins/browser"

export function createStubBrowser(pages: HttpStub<string>): StubBrowser {
  return new StubBrowserImpl(pages)
}

export function createStubBrowserFromDirectory(
  directory: string,
): StubBrowser {
  return new StubBrowserImpl(loadData(directory))
}

class StubBrowserImpl implements StubBrowser {
  constructor(private readonly pages: HttpStub<string>) {}

  openPage(url: string, _options?: OpenPageOptions): Promise<Page> {
    const pages = this.pages
    let html = pages.get(url) ?? ""
    return Promise.resolve({
      get html() {
        return html
      },
      navigate(nextUrl: string): Promise<void> {
        html = pages.get(nextUrl) ?? ""
        return Promise.resolve()
      },
      async close() {},
    })
  }

  async close() {}

  get visitedUrls(): string[] {
    return this.pages.requestedUrls
  }
}

interface StubBrowser extends Browser {
  visitedUrls: string[]
}

function loadData(directory: string): HttpStub<string> {
  const data = typia.json.assertParse<Record<string, string>>(
    gunzipSync(readFileSync(path.join(directory, "data.json.gz"))).toString(
      "utf8",
    ),
  )
  const stub = new HttpStub<string>()
  for (const [urlPattern, html] of Object.entries(data)) {
    stub.set(urlPattern, html)
  }
  return stub
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Expected: remaining errors only in test files that still pass `Record<string, string>` or `string` to `createStubBrowser`.

- [ ] **Step 3: Commit**

```bash
git add src/plugins/browser/stub/index.ts
git commit -m "refactor: update StubBrowser to use HttpStub<string>"
```

---

### Task 6: Update google-maps test to use shared createStubFetch

**Files:**
- Modify: `src/plugins/commute/google-maps/index.test.ts`

- [ ] **Step 1: Rewrite the test file**

Replace the inline `createStubFetch`, `resolveRequestUrl`, and `matrixResponse` with imports from shared `createStubFetch` and `HttpStub`. Add a wrapper for `globalThis.fetch` type compatibility.

```ts
// src/plugins/commute/google-maps/index.test.ts — full file after edit
import { test, describe, expect } from "vitest"
import { createGoogleMapsCommuteClient } from "."
import { createStubFetch, type StubFetch, type StubRoute } from "@/plugins/fetch"
import { HttpStub } from "@/utils"

const API_PATTERN = "maps.googleapis.com/maps/api/distancematrix"

describe("GoogleMapsCommuteClient", () => {
  test("returns durations as rounded minutes", async () => {
    const response = matrixResponse("15.3 km", 1890)
    const stubFetch = createStubFetch(
      new HttpStub<StubRoute>().set(API_PATTERN, { body: response }),
    )
    const originalFetch = globalThis.fetch
    globalThis.fetch = asGlobalFetch(stubFetch)

    try {
      const client = createGoogleMapsCommuteClient("test-api-key")
      const result = await client.getCommute("Berlin", "Potsdam")

      expect(result.distance).toBe("15.3 km")
      expect(result.durations.morning).toBe(32)
      expect(result.durations.day).toBe(32)
      expect(result.durations.evening).toBe(32)
      expect(result.fetchedAt).toBeTruthy()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("makes three API calls with different departure times", async () => {
    const response = matrixResponse("10 km", 600)
    const stub = new HttpStub<StubRoute>().set(API_PATTERN, { body: response })
    const stubFetch = createStubFetch(stub)
    const originalFetch = globalThis.fetch
    globalThis.fetch = asGlobalFetch(stubFetch)

    try {
      const client = createGoogleMapsCommuteClient("test-key")
      await client.getCommute("A", "B")

      expect(stub.requestedUrls.length).toBe(3)
      for (const url of stub.requestedUrls) {
        expect(url).toMatch(
          new RegExp(String.raw`maps\.googleapis\.com/maps/api/distancematrix`),
        )
        expect(url).toMatch(/key=test-key/)
        expect(url).toMatch(/mode=transit/)
      }
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("throws on API error status", async () => {
    const response = { status: "REQUEST_DENIED", rows: [] }
    const stubFetch = createStubFetch(
      new HttpStub<StubRoute>().set(API_PATTERN, { body: response }),
    )
    const originalFetch = globalThis.fetch
    globalThis.fetch = asGlobalFetch(stubFetch)

    try {
      const client = createGoogleMapsCommuteClient("bad-key")
      await expect(() => client.getCommute("A", "B")).rejects.toThrow(
        /Distance Matrix API status: REQUEST_DENIED/,
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("throws when no route found", async () => {
    const response = {
      status: "OK",
      rows: [{ elements: [{ status: "ZERO_RESULTS" }] }],
    }
    const stubFetch = createStubFetch(
      new HttpStub<StubRoute>().set(API_PATTERN, { body: response }),
    )
    const originalFetch = globalThis.fetch
    globalThis.fetch = asGlobalFetch(stubFetch)

    try {
      const client = createGoogleMapsCommuteClient("test-key")
      await expect(() => client.getCommute("A", "Nowhere")).rejects.toThrow(
        /No route found for "Nowhere"/,
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

function matrixResponse(distanceText: string, durationSeconds: number): object {
  return {
    status: "OK",
    rows: [
      {
        elements: [
          {
            status: "OK",
            distance: { text: distanceText },
            duration: { value: durationSeconds },
          },
        ],
      },
    ],
  }
}

function asGlobalFetch(
  stubFetch: StubFetch,
): typeof globalThis.fetch {
  return (input, init?) => {
    if (typeof input === "string") {
      return stubFetch(input, init)
    }
    if (input instanceof URL) {
      return stubFetch(input.toString(), init)
    }
    return stubFetch(input.url, init)
  }
}
```

- [ ] **Step 2: Run the google-maps test suite**

```bash
npm test -- src/plugins/commute/google-maps/index.test.ts
```
Expected: PASS — all 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/plugins/commute/google-maps/index.test.ts
git commit -m "refactor: replace inline createStubFetch in google-maps test with shared stub"
```

---

### Task 7: Update consumer tests to use new builder API

**Files:**
- Modify: `src/plugins/job-site/arbeitsagentur/index.test.ts`
- Modify: `src/plugins/job-site/xing/index.test.ts`
- Modify: `src/plugins/job-site/dm/index.test.ts`
- Modify: `src/plugins/job-site/zalando/index.test.ts`

- [ ] **Step 1: Update arbeitsagentur test**

The `createSite` helper passes `Record<string, StubRoute>` to `createStubFetch` and `Record<string, string>` to `createStubBrowser`. Both need to become `HttpStub`.

```ts
// In src/plugins/job-site/arbeitsagentur/index.test.ts
// Add imports:
import { HttpStub } from "@/utils"
import { createStubFetch, type StubRoute } from "@/plugins/fetch"

// Replace the existing import of createStubFetch (remove old import line).

// Replace the createSite function:

function createSite(routes: Record<string, StubRoute>) {
  const stubFetch = createStubFetch(buildStub(routes))
  const site = createArbeitsagenturSite(
    createStubBrowser(new HttpStub()),
    stubFetch,
  )
  return { site, stubFetch }
}

function buildStub(routes: Record<string, StubRoute>): HttpStub<StubRoute> {
  const stub = new HttpStub<StubRoute>()
  for (const [urlPattern, route] of Object.entries(routes)) {
    stub.set(urlPattern, route)
  }
  return stub
}
```

- [ ] **Step 2: Update xing test**

The xing test uses `createStubBrowser(SAMPLES_DIR)`. Replace with `createStubBrowserFromDirectory(SAMPLES_DIR)`.

```ts
// In src/plugins/job-site/xing/index.test.ts
// Change all occurrences of:
//   const browser = createStubBrowser(SAMPLES_DIR)
// To:
//   const browser = createStubBrowserFromDirectory(SAMPLES_DIR)
```

Also update the inline Record usage:
```ts
// Change:
//   const browser = createStubBrowser({ [vacancyUrl]: html })
// To:
//   const browser = createStubBrowser(new HttpStub<string>().set(vacancyUrl, html))
```
And add `import { HttpStub } from "@/utils"`.

- [ ] **Step 3: Update dm test**

Same two patterns as xing: directory loading and inline Record.

```ts
// In src/plugins/job-site/dm/index.test.ts
// 1. Replace createStubBrowser(SAMPLES_DIR) → createStubBrowserFromDirectory(SAMPLES_DIR)
// 2. Replace createStubBrowser({ [vacancyUrl]: html }) → createStubBrowser(new HttpStub<string>().set(vacancyUrl, html))
// 3. Replace createStubBrowser({ "dm-jobs.de/job-listing": html }) → createStubBrowser(new HttpStub<string>().set("dm-jobs.de/job-listing", html))
// 4. Add import { HttpStub } from "@/utils"
```

- [ ] **Step 4: Update zalando test**

Same pattern as dm/xing: directory + inline Record.

```ts
// In src/plugins/job-site/zalando/index.test.ts
// 1. Replace createStubBrowser(SAMPLES_DIR) → createStubBrowserFromDirectory(SAMPLES_DIR)
// 2. Replace createStubBrowser({ [vacancyUrl]: html }) → createStubBrowser(new HttpStub<string>().set(vacancyUrl, html))
// 3. Add import { HttpStub } from "@/utils"
```

- [ ] **Step 5: Run all affected tests**

```bash
npm test -- src/plugins/job-site/arbeitsagentur/index.test.ts
npm test -- src/plugins/job-site/xing/index.test.ts
npm test -- src/plugins/job-site/dm/index.test.ts
npm test -- src/plugins/job-site/zalando/index.test.ts
```
Expected: PASS — all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/plugins/job-site/arbeitsagentur/index.test.ts \
        src/plugins/job-site/xing/index.test.ts \
        src/plugins/job-site/dm/index.test.ts \
        src/plugins/job-site/zalando/index.test.ts
git commit -m "refactor: update consumer tests to use HttpStub builder API"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full type check**

```bash
npx tsc --noEmit
```
Expected: PASS — zero errors.

- [ ] **Step 2: Run full test suite**

```bash
npm test:all
```
Expected: PASS — all tests pass, no regressions.

- [ ] **Step 3: Run lint fix**

```bash
npm run fix
```
Expected: PASS — auto-fixable issues resolved, no unfixable issues remain.

- [ ] **Step 4: Verify findStubMatch is gone**

```bash
git grep "findStubMatch"
```
Expected: no results.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, findStubMatch removed"
```
