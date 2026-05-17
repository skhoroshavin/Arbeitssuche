# Plan: HttpStub URL Router

**Spec:** `docs/superpowers/specs/2026-05-17-http-stub-design.md`
**Date:** 2026-05-17
**Revision:** 2 — subclass approach

---

### Task 1: Create `HttpStub<T>` class

**Files:**
- Create: `src/utils/http-stub.ts`
- Create: `src/utils/http-stub.test.ts`
- Modify: `src/utils/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/http-stub.test.ts
import { test, describe, expect } from "vitest"
import { HttpStub } from "."

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

      expect(stub.get("https://example.com/api/search")).toBe("first")
    })
  })

  describe("requestedUrls", () => {
    test("tracks URLs in call order", () => {
      const stub = new HttpStub<string>().set("search", "hit")

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

- [ ] **Step 3: Write minimal implementation and barrel-export it**

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

```ts
// src/utils/index.ts — add at end:
export { HttpStub } from "./http-stub.js"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/utils/http-stub.test.ts
```
Expected: PASS — all 7 tests pass.

- [ ] **Step 5: Verify type check and no regressions**

```bash
npx tsc --noEmit
npm test:all
```
Expected: both PASS (HttpStub added but not consumed yet).

- [ ] **Step 6: Commit**

```bash
git add src/utils/http-stub.ts src/utils/http-stub.test.ts src/utils/index.ts
git commit -m "feat: add HttpStub<T> URL router class with tests"
```

---

### Task 2: Remove findStubMatch

**Files:**
- Modify: `src/utils/test-utilities.ts`
- Modify: `src/utils/index.ts`

- [ ] **Step 1: Remove findStubMatch from test-utilities.ts**

```ts
// src/utils/test-utilities.ts — full file after edit
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

- [ ] **Step 2: Remove findStubMatch from index.ts exports**

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

- [ ] **Step 3: Verify findStubMatch is fully removed**

```bash
git grep "findStubMatch"
```
Expected: no results (StubBrowser and StubFetch imports will break — that's expected, fixed in Tasks 3–4).

- [ ] **Step 4: Commit**

```bash
git add src/utils/test-utilities.ts src/utils/index.ts
git commit -m "refactor: remove findStubMatch from utils"
```

---

### Task 3: Create FetchStub subclass

**Files:**
- Rewrite: `src/plugins/fetch/stub/index.ts`
- Modify: `src/plugins/fetch/index.ts`

- [ ] **Step 1: Rewrite fetch stub as FetchStub subclass**

```ts
// src/plugins/fetch/stub/index.ts — full file after edit
import type { Fetch } from "@/plugins/fetch"
import { HttpStub } from "@/utils/index.js"

export class FetchStub extends HttpStub<StubRoute> {
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
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

export interface StubRoute {
  body: unknown
  status?: number
}

function resolveUrl(
  input: string | URL | Request,
): string {
  if (typeof input === "string") {
    return input
  }
  if (input instanceof URL) {
    return input.toString()
  }
  return input.url
}
```

- [ ] **Step 2: Update fetch plugin index.ts exports**

```ts
// src/plugins/fetch/index.ts — full file after edit
export type { Fetch } from "./types.js"
export { FetchStub } from "./stub"
export type { StubRoute } from "./stub"
```

- [ ] **Step 3: Verify type check (will fail on consumer tests)**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: errors in tests that call `createStubFetch(...)` (which no longer exists). Consumer test fixes in Task 6.

- [ ] **Step 4: Commit**

```bash
git add src/plugins/fetch/stub/index.ts src/plugins/fetch/index.ts
git commit -m "refactor: replace createStubFetch with FetchStub subclass"
```

---

### Task 4: Create BrowserStub subclass

**Files:**
- Rewrite: `src/plugins/browser/stub/index.ts`

- [ ] **Step 1: Rewrite browser stub as BrowserStub subclass**

```ts
// src/plugins/browser/stub/index.ts — full file after edit
import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"
import typia from "typia"
import { HttpStub } from "@/utils/index.js"
import type { Browser, Page, OpenPageOptions } from "@/plugins/browser"

export class BrowserStub extends HttpStub<string> implements Browser {
  static fromDirectory(directory: string): BrowserStub {
    const data = typia.json.assertParse<Record<string, string>>(
      gunzipSync(readFileSync(path.join(directory, "data.json.gz"))).toString(
        "utf8",
      ),
    )
    const stub = new BrowserStub()
    for (const [urlPattern, html] of Object.entries(data)) {
      stub.set(urlPattern, html)
    }
    return stub
  }

  async openPage(url: string, _options?: OpenPageOptions): Promise<Page> {
    let html = this.get(url) ?? ""
    return {
      get html() {
        return html
      },
      navigate: async (nextUrl: string): Promise<void> => {
        html = this.get(nextUrl) ?? ""
      },
      close: async () => {},
    }
  }

  async close(): Promise<void> {}
}
```

- [ ] **Step 2: Update browser plugin index.ts exports**

```ts
// src/plugins/browser/index.ts — replace relevant line
export { createStubBrowser } from "./stub"
// becomes:
export { BrowserStub } from "./stub"
```

- [ ] **Step 3: Verify type check (will fail on consumer tests)**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: errors in tests that call `createStubBrowser(...)` (which no longer exists). Consumer test fixes in Task 6.

- [ ] **Step 4: Commit**

```bash
git add src/plugins/browser/stub/index.ts src/plugins/browser/index.ts
git commit -m "refactor: replace createStubBrowser with BrowserStub subclass"
```

---

### Task 5: Update google-maps test

**Files:**
- Modify: `src/plugins/commute/google-maps/index.test.ts`

- [ ] **Step 1: Rewrite the test file**

Replace the inline `createStubFetch`, `resolveRequestUrl`, and `matrixResponse` with `FetchStub`.

```ts
// src/plugins/commute/google-maps/index.test.ts — full file after edit
import { test, describe, expect } from "vitest"
import { createGoogleMapsCommuteClient } from "."
import { FetchStub } from "@/plugins/fetch"

const API_PATTERN = "maps.googleapis.com/maps/api/distancematrix"

describe("GoogleMapsCommuteClient", () => {
  test("returns durations as rounded minutes", async () => {
    const response = matrixResponse("15.3 km", 1890)
    const stub = new FetchStub().set(API_PATTERN, { body: response })
    const originalFetch = globalThis.fetch
    globalThis.fetch = stub.fetch.bind(stub)

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
    const stub = new FetchStub().set(API_PATTERN, { body: response })
    const originalFetch = globalThis.fetch
    globalThis.fetch = stub.fetch.bind(stub)

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
    const stub = new FetchStub().set(API_PATTERN, { body: response })
    const originalFetch = globalThis.fetch
    globalThis.fetch = stub.fetch.bind(stub)

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
    const stub = new FetchStub().set(API_PATTERN, { body: response })
    const originalFetch = globalThis.fetch
    globalThis.fetch = stub.fetch.bind(stub)

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
```

- [ ] **Step 2: Run google-maps tests**

```bash
npm test -- src/plugins/commute/google-maps/index.test.ts
```
Expected: PASS — all 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/plugins/commute/google-maps/index.test.ts
git commit -m "refactor: replace inline createStubFetch with FetchStub in google-maps test"
```

---

### Task 6: Update consumer tests

**Files:**
- Modify: `src/plugins/job-site/arbeitsagentur/index.test.ts`
- Modify: `src/plugins/job-site/xing/index.test.ts`
- Modify: `src/plugins/job-site/dm/index.test.ts`
- Modify: `src/plugins/job-site/zalando/index.test.ts`

- [ ] **Step 1: Update arbeitsagentur test**

Replace `createStubFetch(...)` with `FetchStub` builder, and `createStubBrowser({})` with `new BrowserStub()`.

Full test file changes:

```ts
// src/plugins/job-site/arbeitsagentur/index.test.ts
// Replace imports:
//   import { createStubBrowser } from "@/plugins/browser"
//   import { createStubFetch } from "@/plugins/fetch"
// With:
import { BrowserStub } from "@/plugins/browser"
import { FetchStub } from "@/plugins/fetch"

// Replace createSite and buildStub functions:

function createSite(
  routes: Record<string, { body: unknown; status?: number }>,
) {
  const stubFetch = buildStub(routes)
  const site = createArbeitsagenturSite(
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

// All references to stubFetch.requestedUrls keep working (inherited from HttpStub)
```

- [ ] **Step 2: Update xing test**

Replace `createStubBrowser(SAMPLES_DIR)` → `BrowserStub.fromDirectory(SAMPLES_DIR)`.
Replace `createStubBrowser({ [vacancyUrl]: html })` → `new BrowserStub().set(vacancyUrl, html)`.

```ts
// src/plugins/job-site/xing/index.test.ts
// Replace import:
//   import { createStubBrowser } from "@/plugins/browser"
// With:
import { BrowserStub } from "@/plugins/browser"

// Replace:
//   createStubBrowser(SAMPLES_DIR)
// With:
//   BrowserStub.fromDirectory(SAMPLES_DIR)
// (occurs 2 times)

// Replace:
//   createStubBrowser({ [vacancyUrl]: html })
// With:
//   new BrowserStub().set(vacancyUrl, html)
// (occurs 1 time)
```

- [ ] **Step 3: Update dm test**

Same patterns as xing.

```ts
// src/plugins/job-site/dm/index.test.ts
// Replace import: createStubBrowser → BrowserStub

// createStubBrowser(SAMPLES_DIR) → BrowserStub.fromDirectory(SAMPLES_DIR)  (2 times)
// createStubBrowser({ [vacancyUrl]: html }) → new BrowserStub().set(vacancyUrl, html)  (2 times)
// createStubBrowser({ "dm-jobs.de/job-listing": html }) → new BrowserStub().set("dm-jobs.de/job-listing", html)  (1 time)
```

- [ ] **Step 4: Update zalando test**

Same pattern.

```ts
// src/plugins/job-site/zalando/index.test.ts
// Replace import: createStubBrowser → BrowserStub

// createStubBrowser(SAMPLES_DIR) → BrowserStub.fromDirectory(SAMPLES_DIR)  (2 times)
// createStubBrowser({ [vacancyUrl]: html }) → new BrowserStub().set(vacancyUrl, html)  (1 time)
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
git commit -m "refactor: update consumer tests to use BrowserStub and FetchStub"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full type check**

```bash
npx tsc --noEmit
```
Expected: PASS — zero errors.

- [ ] **Step 2: Run full test suite**

```bash
npm test:all
```
Expected: PASS — all tests pass.

- [ ] **Step 3: Run lint fix**

```bash
npm run fix
```
Expected: PASS — auto-fixable issues resolved, no unfixable issues.

- [ ] **Step 4: Verify findStubMatch and createStub* factories are gone**

```bash
git grep "findStubMatch\|createStubBrowser\|createStubFetch"
```
Expected: no results.

- [ ] **Step 5: Commit**

```bash
git commit -am "chore: final verification — all tests pass, old factories removed"
```
