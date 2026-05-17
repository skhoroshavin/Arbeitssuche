# Implementation Plan: Utils Cleanup & Flattening

**Spec:** `docs/superpowers/specs/2026-05-16-utils-cleanup-design.md`

## Summary

7 sequential tasks. Each task leaves the project in a working, committable state (`npm run build` + `npm test` pass).

---

### Task 1: Create `normalize.ts` and `normalize.test.ts`

**Files:**
- Create: `src/utils/normalize.ts`
- Create: `src/utils/normalize.test.ts`

Net-new files. Nothing else changes.

- [ ] **Step 1: Create `src/utils/normalize.ts`**

```typescript
export function joinNormalizedText(
  parts: Array<null | string | undefined>,
  separator = ", ",
): string | undefined {
  const normalizedParts = parts
    .map((part) => normalizeOptionalText(part))
    .filter((part): part is string => part !== undefined)
  if (normalizedParts.length === 0) return undefined
  return normalizedParts.join(separator)
}

export function normalizeOptionalText(
  value: null | string | undefined,
): string | undefined {
  const normalized = value?.trim()
  if (!normalized || normalized === "null") return undefined
  return normalized
}
```

- [ ] **Step 2: Create `src/utils/normalize.test.ts`**

```typescript
import { describe, test, expect } from "vitest"
import { joinNormalizedText, normalizeOptionalText } from "./normalize.js"

describe("normalizeOptionalText", () => {
  test("trims non-empty values", () => {
    expect(normalizeOptionalText("  hello  ")).toBe("hello")
  })

  test("drops empty and null-like values", () => {
    expect(normalizeOptionalText(" ")).toBe(undefined)
    expect(normalizeOptionalText("null")).toBe(undefined)
    const missing: string | undefined = undefined
    expect(normalizeOptionalText(missing)).toBe(undefined)
  })
})

describe("joinNormalizedText", () => {
  test("joins normalized non-empty parts", () => {
    expect(joinNormalizedText([" 10115", "Berlin "], " ")).toBe("10115 Berlin")
  })

  test("returns undefined when all parts are empty", () => {
    expect(joinNormalizedText([" ", undefined, "null"])).toBe(undefined)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/utils/normalize.test.ts
```
Expected: 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/utils/normalize.ts src/utils/normalize.test.ts
git commit -m "feat: add normalize.ts with normalizeOptionalText and joinNormalizedText"
```

---

### Task 2: Create `test-utils.ts` and `test-utils.test.ts`

**Files:**
- Create: `src/utils/test-utils.ts`
- Create: `src/utils/test-utils.test.ts`

`test-utils.ts` is a re-export bridge from existing files (still alive). It will become self-contained in Task 8.

- [ ] **Step 1: Create `src/utils/test-utils.ts`**

```typescript
export { findStubMatch } from "./stub-utilities.js"
export { setupTemporaryDatabaseDirectory } from "./node/test-database-utilities.js"
```

- [ ] **Step 2: Create `src/utils/test-utils.test.ts`**

```typescript
import { test, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { setupTemporaryDatabaseDirectory } from "./test-utils.js"

const { nextId, pathForId } = setupTemporaryDatabaseDirectory(
  "test-utils-test",
)

test("nextId returns incrementing string ids", () => {
  expect(nextId()).toBe("0")
  expect(nextId()).toBe("1")
  expect(nextId()).toBe("2")
})

test("pathForId returns a path ending with <id>.db inside an existing directory", () => {
  const p = pathForId("myid")
  expect(p).toMatch(/myid\.db$/)
  expect(fs.existsSync(path.dirname(p))).toBe(true)
})
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/utils/test-utils.test.ts
```
Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/utils/test-utils.ts src/utils/test-utils.test.ts
git commit -m "feat: add test-utils.ts bridging stub-utilities and test-database-utilities"
```

---

### Task 3: Move `id.ts` and `id.test.ts` to `src/utils/`

**Files:**
- Create: `src/utils/id.ts`
- Create: `src/utils/id.test.ts`

- [ ] **Step 1: Create `src/utils/id.ts`** — exact copy of `src/utils/node/id.ts`

```typescript
import { randomBytes } from "node:crypto"

/** Generate a unique ID derived from the same base text on each retry. */
export function createUniqueDerivedId(
  text: string,
  exists: (id: string) => boolean,
): string {
  return createWithUniqueId(() => deriveId(text), exists)
}

/**
 * Retry loop for creating an entity with a unique derived ID.
 * Calls `derive()` up to 5 times, returning the first ID where `exists()` is false.
 * Throws if all 5 attempts collide.
 * @internal Exported for testing only.
 */
export function createWithUniqueId(
  derive: () => string,
  exists: (id: string) => boolean,
): string {
  for (let index = 0; index < 5; index++) {
    const id = derive()
    if (!exists(id)) return id
  }
  throw new Error("Failed to generate unique id after 5 attempts")
}

/**
 * Derive a URL-safe ID from text: slugified prefix (max 30 chars) + 4-char random hex suffix.
 * @internal Exported for testing only.
 */
export function deriveId(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "")
    .slice(0, 30)
  const suffix = randomBytes(2).toString("hex")
  return `${slug}_${suffix}`
}
```

- [ ] **Step 2: Create `src/utils/id.test.ts`** — copy of `src/utils/node/id.test.ts` with updated imports

Read `src/utils/node/id.test.ts` first to ensure the copy is exact, then update:
- `import { createUniqueDerivedId } from "./node"` → `import { createUniqueDerivedId } from "./id.js"`
- `import { deriveId, createWithUniqueId } from "./node/id.js"` → `import { deriveId, createWithUniqueId } from "./id.js"`

```typescript
import { describe, it, test, expect } from "vitest"
import { createUniqueDerivedId } from "./id.js"
import { deriveId, createWithUniqueId } from "./id.js"

describe("deriveId", () => {
  test("produces a slug with hex suffix", () => {
    const id = deriveId("Hello World")
    expect(id).toMatch(/^hello_world_[0-9a-f]{4}$/)
  })

  test("strips diacritics", () => {
    const id = deriveId("Ünïcödé")
    expect(id).toMatch(/^unicode_[0-9a-f]{4}$/)
  })

  test("replaces non-alphanumeric chars with underscores", () => {
    const id = deriveId("foo@bar.baz!")
    expect(id).toMatch(/^foo_bar_baz_[0-9a-f]{4}$/)
  })

  test("truncates long slugs to 30 characters", () => {
    const long = "a".repeat(50)
    const id = deriveId(long)
    const slug = id.slice(0, id.lastIndexOf("_"))
    expect(slug.length <= 30).toBeTruthy()
  })

  test("produces unique IDs for the same input", () => {
    const ids = new Set(Array.from({ length: 20 }, () => deriveId("same")))
    expect(ids.size > 1).toBeTruthy()
  })

  test("handles empty string", () => {
    const id = deriveId("")
    expect(id).toMatch(/^_[0-9a-f]{4}$/)
  })
})

describe("createWithUniqueId", () => {
  it("returns the first non-existing id", () => {
    const id = createWithUniqueId(
      () => "abc",
      () => false,
    )
    expect(id).toBe("abc")
  })

  it("retries when id already exists", () => {
    const ids = ["taken", "taken", "free"]
    let index = 0
    const existing = new Set(["taken"])

    const id = createWithUniqueId(
      () => ids[index++],
      (id) => existing.has(id),
    )
    expect(id).toBe("free")
  })

  it("throws after 5 failed attempts", () => {
    expect(() =>
      createWithUniqueId(
        () => "collision",
        () => true,
      ),
    ).toThrow("Failed to generate unique id after 5 attempts")
  })
})

describe("createUniqueDerivedId", () => {
  it("returns the first derived id when available", () => {
    const id = createUniqueDerivedId("Hello World", () => false)
    expect(id).toMatch(/^hello_world_[0-9a-f]{4}$/)
  })

  it("retries derived ids until one is free", () => {
    const seen = new Set<string>()
    let attempts = 0

    const id = createUniqueDerivedId("Hello World", (candidate) => {
      attempts += 1
      if (attempts < 3) {
        seen.add(candidate)
        return true
      }

      return seen.has(candidate)
    })

    expect(seen.has(id)).toBeFalsy()
    expect(attempts).toBe(3)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/utils/id.test.ts
```
Expected: 11 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/utils/id.ts src/utils/id.test.ts
git commit -m "feat: move id.ts and id.test.ts to src/utils/"
```

---

### Task 4: Update crawlers — inline functions

**Files:**
- Modify: `src/plugins/job-site/dm/index.ts`
- Modify: `src/plugins/job-site/xing/index.ts`
- Modify: `src/plugins/job-site/zalando/index.ts`

- [ ] **Step 1: Update DM — inline `extractAddressFromJsonLd`**

Read `src/plugins/job-site/dm/index.ts` fully (118 lines), then apply these edits:

**Edit 1** — update import (lines 11-14):
Old:
```typescript
import {
  extractAddressFromJsonLd,
  extractJsonLd,
  normalizeOptionalText,
} from "@/utils/index.js"
```
New:
```typescript
import {
  extractJsonLd,
  joinNormalizedText,
  normalizeOptionalText,
} from "@/utils/index.js"
```

**Edit 2** — in `extractFromPosting()`, change `extractAddressFromJsonLd` call (around line 97):
Old:
```typescript
    address: extractAddressFromJsonLd(posting),
```
New:
```typescript
    address: formatJobPostingAddress(posting),
```

**Edit 3** — add helpers after `extractFromPosting`:
```typescript
function formatJobPostingAddress(
  posting: { jobLocation?: unknown } | undefined,
): string | undefined {
  if (!posting) return undefined
  const location = posting.jobLocation
  const loc = Array.isArray(location) ? location[0] : location
  if (!isRecord(loc) || !isRecord(loc.address)) return undefined
  const addr = loc.address as Record<string, unknown>
  return joinNormalizedText(
    [
      typeof addr.streetAddress === "string" ? addr.streetAddress : undefined,
      typeof addr.postalCode === "string" ? addr.postalCode : undefined,
      typeof addr.addressLocality === "string"
        ? addr.addressLocality
        : undefined,
    ],
    ", ",
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
```

- [ ] **Step 2: Update Xing — inline `extractAddressFromJsonLd` and `normalizeMailtoHref`**

Read `src/plugins/job-site/xing/index.ts` fully (126 lines), then apply:

**Edit 1** — update import (lines 14-18):
Old:
```typescript
import {
  extractAddressFromJsonLd,
  extractJsonLd,
  normalizeMailtoHref,
  normalizeOptionalText,
} from "@/utils/index.js"
```
New:
```typescript
import {
  extractJsonLd,
  joinNormalizedText,
  normalizeOptionalText,
} from "@/utils/index.js"
```

**Edit 2** — in `extractFromPosting()` (around line 97):
Old:
```typescript
    address: extractAddressFromJsonLd(posting),
```
New:
```typescript
    address: formatJobPostingAddress(posting),
```

**Edit 3** — in `extractContact()` (around line 103):
Old:
```typescript
  const contactEmail = normalizeMailtoHref(emailHref)
```
New:
```typescript
  const contactEmail = normalizeOptionalText(
    emailHref?.replace(/^mailto:/, ""),
  )
```

**Edit 4** — add helpers at file scope:
```typescript
function formatJobPostingAddress(
  posting: { jobLocation?: unknown } | undefined,
): string | undefined {
  if (!posting) return undefined
  const location = posting.jobLocation
  const loc = Array.isArray(location) ? location[0] : location
  if (!isRecord(loc) || !isRecord(loc.address)) return undefined
  const addr = loc.address as Record<string, unknown>
  return joinNormalizedText(
    [
      typeof addr.streetAddress === "string" ? addr.streetAddress : undefined,
      typeof addr.postalCode === "string" ? addr.postalCode : undefined,
      typeof addr.addressLocality === "string"
        ? addr.addressLocality
        : undefined,
    ],
    ", ",
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
```

- [ ] **Step 3: Update Zalando — inline `normalizeContact`**

Read `src/plugins/job-site/zalando/index.ts` fully (120 lines), then apply:

**Edit 1** — update import (line 10):
Old:
```typescript
import { normalizeContact, normalizeOptionalText } from "@/utils/index.js"
```
New:
```typescript
import { normalizeOptionalText } from "@/utils/index.js"
```

**Edit 2** — replace `createContact` function (around line 108):
Old:
```typescript
function createContact(contact: VacancyContact): VacancyContact | undefined {
  return normalizeContact(contact)
}
```
New:
```typescript
function createContact(contact: VacancyContact): VacancyContact | undefined {
  const normalizedContact = {
    name: normalizeOptionalText(contact.name),
    email: normalizeOptionalText(contact.email),
    phone: normalizeOptionalText(contact.phone),
  }
  if (
    Object.values(normalizedContact).every((value) => value === undefined)
  ) {
    return undefined
  }
  return normalizedContact
}
```

- [ ] **Step 4: Run crawler tests**

```bash
npm run test:crawler
```
Expected: all crawler tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/plugins/job-site/dm/index.ts src/plugins/job-site/xing/index.ts src/plugins/job-site/zalando/index.ts
git commit -m "refactor: inline extractAddressFromJsonLd, normalizeMailtoHref, normalizeContact into crawlers"
```

---

### Task 5: Update utils internals — index, json-ld, delete text.ts

**Files:**
- Modify: `src/utils/json-ld.ts`
- Modify: `src/utils/json-ld.test.ts`
- Modify: `src/utils/index.ts`
- Delete: `src/utils/text.ts`

- [ ] **Step 1: Read then modify `src/utils/json-ld.ts`**

Read the file first (71 lines). Remove `extractAddressFromJsonLd`, its helpers (`resolveJobLocation`, `formatAddress`), the `JsonLdJobPosting`/`JsonLdJobLocation` interfaces, and update the import from `"./text.js"` to `"./normalize.js"`.

After edits, the file is:

```typescript
import typia from "typia"
import type { CheerioAPI } from "cheerio/slim"

/** Extract the first JSON-LD object matching the given `@type` from a parsed HTML document. */
export function extractJsonLd(
  $: CheerioAPI,
  type: string,
): Record<string, unknown> | undefined {
  let result: Record<string, unknown> | undefined

  $('script[type="application/ld+json"]').each((_index, element) => {
    if (result) return
    try {
      const data = typia.json.isParse<Record<string, unknown>>(
        $(element).html() || "",
      )
      if (data && data["@type"] === type) {
        result = data
      }
    } catch {
      // invalid JSON — skip
    }
  })

  return result
}
```

- [ ] **Step 2: Read then modify `src/utils/json-ld.test.ts`**

Read file (104 lines). Remove the normalize-related imports and describe blocks. Keep only `extractJsonLd` tests and the `html` helper.

After edits:

```typescript
import { describe, test, expect } from "vitest"
import * as cheerio from "cheerio/slim"
import { extractJsonLd } from "."

describe("extractJsonLd", () => {
  test("extracts object matching the requested @type", () => {
    const $ = html({ "@type": "Person", name: "Alice" })
    const result = extractJsonLd($, "Person")
    expect(result?.["name"]).toBe("Alice")
  })

  test("returns undefined when @type does not match", () => {
    const $ = html({ "@type": "Organization", name: "Acme" })
    expect(extractJsonLd($, "Person")).toBe(undefined)
  })

  test("returns undefined when no JSON-LD is present", () => {
    const $ = cheerio.load("<html><body>No JSON-LD</body></html>")
    expect(extractJsonLd($, "Person")).toBe(undefined)
  })

  test("returns the first match when multiple JSON-LD blocks exist", () => {
    const $ = cheerio.load(`<html><head>
      <script type="application/ld+json">{"@type":"Item","id":1}</script>
      <script type="application/ld+json">{"@type":"Item","id":2}</script>
    </head></html>`)
    const result = extractJsonLd($, "Item")
    expect(result?.["id"]).toBe(1)
  })

  test("skips invalid JSON gracefully", () => {
    const $ = cheerio.load(`<html><head>
      <script type="application/ld+json">not valid json</script>
      <script type="application/ld+json">{"@type":"Valid","ok":true}</script>
    </head></html>`)
    const result = extractJsonLd($, "Valid")
    expect(result?.["ok"]).toBe(true)
  })
})

function html(jsonLd: object): ReturnType<typeof cheerio.load> {
  return cheerio.load(
    `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head></html>`,
  )
}
```

- [ ] **Step 3: Update `src/utils/index.ts`**

Old:
```typescript
// Browser-safe utilities
export { extractAddressFromJsonLd, extractJsonLd } from "./json-ld.js"
export {
  joinNormalizedText,
  normalizeContact,
  normalizeMailtoHref,
  normalizeOptionalText,
} from "./text.js"
export { findStubMatch } from "./stub-utilities.js"
```

New:
```typescript
export { extractJsonLd } from "./json-ld.js"
export { joinNormalizedText, normalizeOptionalText } from "./normalize.js"
export { findStubMatch, setupTemporaryDatabaseDirectory } from "./test-utils.js"
export { createUniqueDerivedId, createWithUniqueId, deriveId } from "./id.js"
export { Database } from "./node/database.js"
```

- [ ] **Step 4: Delete `src/utils/text.ts`**

```bash
rm src/utils/text.ts
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```
Expected: all tests pass (including json-ld, normalize, test-utils, id, database).

- [ ] **Step 6: Commit**

```bash
git add -A src/utils/
git commit -m "refactor: update utils index, clean up json-ld.ts, delete text.ts"
```

---

### Task 6: Add `Statement` wrapper, real database tests, update all consumers

**Files:**
- Modify: `src/utils/node/database.ts`
- Modify: `src/utils/node/index.ts`
- Modify: `src/utils/index.ts`
- Modify: `src/utils/database.test.ts`
- Modify: `src/repositories/applicant/sqlite/index.ts`
- Modify: `src/repositories/applicant/stub/index.ts`
- Modify: `src/repositories/applicant/types.ts`
- Modify: `src/repositories/job-search/sqlite/index.ts`
- Modify: `src/repositories/job-search/stub/index.ts`
- Modify: `src/repositories/vacancy/sqlite/index.ts`
- Modify: `src/app/main.ts`
- Modify: `src/app/composition/create-service-context.ts`
- Modify: `src/repositories/applicant/applicant.test.ts`
- Modify: `src/repositories/job-search/job-search.test.ts`
- Modify: `src/repositories/vacancy/vacancy.test.ts`

- [ ] **Step 1: Read then replace `src/utils/node/database.ts`**

Read file (55 lines), then replace with:

```typescript
import { mkdirSync } from "node:fs"
import typia from "typia"
import path from "node:path"
import { DatabaseSync, StatementSync } from "node:sqlite"

/** SQLite database wrapper with WAL mode, foreign keys, and transaction support. */
export class Database {
  private constructor(private readonly inner: DatabaseSync) {}

  /** Open (or create) a database at the given path, creating parent directories as needed. */
  static open(databasePath: string): Database {
    mkdirSync(path.dirname(databasePath), { recursive: true })
    const database = new DatabaseSync(databasePath, {
      enableForeignKeyConstraints: true,
    })
    database.exec("PRAGMA journal_mode = WAL")
    database.exec("PRAGMA synchronous = NORMAL")
    database.exec("PRAGMA busy_timeout = 5000")
    return new Database(database)
  }

  prepare(sql: string): Statement {
    return new Statement(this.inner.prepare(sql))
  }

  exec(sql: string): void {
    this.inner.exec(sql)
  }

  close(): void {
    this.inner.close()
  }

  transaction<T>(function_: () => T): T {
    this.inner.exec("BEGIN TRANSACTION")
    try {
      const result = function_()
      this.inner.exec("COMMIT")
      return result
    } catch (error) {
      this.inner.exec("ROLLBACK")
      throw error
    }
  }
}

/** Wraps node:sqlite StatementSync, adding getJsonData for the `data` column pattern. */
export class Statement {
  constructor(private readonly inner: StatementSync) {}

  get(...params: unknown[]): Record<string, unknown> | undefined {
    return (
      this.inner.get as (
        ...args: unknown[]
      ) => Record<string, unknown> | undefined
    )(...params)
  }

  all(...params: unknown[]): Record<string, unknown>[] {
    return (
      this.inner.all as (...args: unknown[]) => Record<string, unknown>[]
    )(...params)
  }

  run(
    ...params: unknown[]
  ): { changes: number; lastInsertRowid: bigint } {
    return (
      this.inner.run as (
        ...args: unknown[]
      ) => { changes: number; lastInsertRowid: bigint }
    )(...params)
  }

  /** Execute get() and parse the `data` column as JSON. Returns undefined when no row matches. */
  getJsonData(...params: unknown[]): unknown {
    const row = (
      this.inner.get as (
        ...args: unknown[]
      ) => Record<string, unknown> | undefined
    )(...params)
    if (row === undefined) return undefined
    return JSON.parse(typia.assert<{ data: string }>(row).data)
  }
}
```

- [ ] **Step 2: Update `src/utils/node/index.ts`**

Old:
```typescript
export { Database, parseRow } from "./database.js"
export { createUniqueDerivedId } from "./id.js"
export { setupTemporaryDatabaseDirectory } from "./test-database-utilities.js"
```

New:
```typescript
export { Database, Statement } from "./database.js"
export { createUniqueDerivedId } from "./id.js"
export { setupTemporaryDatabaseDirectory } from "./test-database-utilities.js"
```

- [ ] **Step 2a: Update `src/utils/index.ts`** — add `Statement` to the Database export

Old:
```typescript
export { Database } from "./node/database.js"
```
New:
```typescript
export { Database, Statement } from "./node/database.js"
```

- [ ] **Step 3: Read then replace `src/utils/database.test.ts`**

Read file (25 lines), then replace with:

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { Database } from "./node/database.js"

const testDirectory = path.join(tmpdir(), `db-test-${Date.now()}`)
const databasePath = path.join(testDirectory, "test.db")
let database: Database

beforeAll(() => {
  database = Database.open(databasePath)
  database.exec(
    "CREATE TABLE test (id TEXT PRIMARY KEY, data TEXT NOT NULL)",
  )
})

afterAll(() => {
  database.close()
  rmSync(testDirectory, { recursive: true, force: true })
})

describe("Database", () => {
  it("creates parent directories when they do not exist", () => {
    const nestedPath = path.join(testDirectory, "nested", "sub", "nested.db")
    const nested = Database.open(nestedPath)
    nested.close()
  })

  it("exec runs SQL statements", () => {
    database.exec("INSERT INTO test (id, data) VALUES ('a', '1')")
    database.exec("INSERT INTO test (id, data) VALUES ('b', '2')")
  })

  it("prepare returns a Statement", () => {
    const stmt = database.prepare("SELECT data FROM test WHERE id = ?")
    const row = stmt.get("a")
    expect(row?.data).toBe("1")
  })

  describe("transaction", () => {
    it("commits on success", () => {
      database.transaction(() => {
        database.exec(
          "INSERT INTO test (id, data) VALUES ('tx1', 'ok')",
        )
      })
      const row = database
        .prepare("SELECT data FROM test WHERE id = ?")
        .get("tx1")
      expect(row?.data).toBe("ok")
    })

    it("rolls back on error", () => {
      expect(() =>
        database.transaction(() => {
          database.exec(
            "INSERT INTO test (id, data) VALUES ('tx2', 'rollback')",
          )
          throw new Error("abort")
        }),
      ).toThrow("abort")
      const row = database
        .prepare("SELECT data FROM test WHERE id = ?")
        .get("tx2")
      expect(row).toBe(undefined)
    })
  })
})

describe("Statement", () => {
  it("get returns matching row", () => {
    const stmt = database.prepare("SELECT data FROM test WHERE id = ?")
    const row = stmt.get("a")
    expect(row?.data).toBe("1")
  })

  it("get returns undefined for no match", () => {
    const stmt = database.prepare("SELECT data FROM test WHERE id = ?")
    expect(stmt.get("nonexistent")).toBe(undefined)
  })

  it("all returns all matching rows", () => {
    const stmt = database.prepare("SELECT id FROM test ORDER BY id")
    const rows = stmt.all()
    const ids = rows.map((r) => r.id)
    expect(ids).toContain("a")
    expect(ids).toContain("b")
  })

  it("run returns changes count", () => {
    const stmt = database.prepare(
      "UPDATE test SET data = ? WHERE id = ?",
    )
    const result = stmt.run("updated", "a")
    expect(result.changes).toBe(1)
  })

  it("run returns 0 changes on no match", () => {
    const stmt = database.prepare(
      "UPDATE test SET data = ? WHERE id = ?",
    )
    const result = stmt.run("nope", "nonexistent")
    expect(result.changes).toBe(0)
  })

  describe("getJsonData", () => {
    beforeAll(() => {
      database.exec("DELETE FROM test")
      database.exec(
        `INSERT INTO test (id, data) VALUES ('json1', '{"name":"Alice","age":30}')`,
      )
      database.exec(
        `INSERT INTO test (id, data) VALUES ('json2', '{"name":"Bob","age":25}')`,
      )
    })

    it("parses the data column as JSON", () => {
      const stmt = database.prepare(
        "SELECT data FROM test WHERE id = ?",
      )
      const result = stmt.getJsonData("json1") as {
        name: string
        age: number
      }
      expect(result.name).toBe("Alice")
      expect(result.age).toBe(30)
    })

    it("returns undefined when no row matches", () => {
      const stmt = database.prepare(
        "SELECT data FROM test WHERE id = ?",
      )
      expect(stmt.getJsonData("missing")).toBe(undefined)
    })
  })
})
```

- [ ] **Step 4: Run database tests**

```bash
npm test -- src/utils/database.test.ts
```
Expected: all tests pass (~11 tests).

All consumers switch from `@/utils/node/index.js` → `@/utils/index.js`, and `parseRow(...)` → `.getJsonData(...)` where applicable. `StatementSync` field types in `applicant/sqlite` change to `Statement`.

- [ ] **Step 5: Update `src/repositories/applicant/sqlite/index.ts`**

Read file fully (175 lines), then apply:

**Edit 1** — remove `import type { StatementSync } from "node:sqlite"` (line 1). Delete this line entirely.

**Edit 2** — update utils import (around lines 19-22):
Old:
```typescript
import {
  Database,
  createUniqueDerivedId,
  parseRow,
} from "@/utils/node/index.js"
```
New:
```typescript
import {
  Database,
  createUniqueDerivedId,
  type Statement,
} from "@/utils/index.js"
```

**Edit 3** — replace `parseRow(this.loadStmt.get(id))` in `load()` (line 73):
Old:
```typescript
    const applicant = parseRow(this.loadStmt.get(id))
```
New:
```typescript
    const applicant = this.loadStmt.getJsonData(id)
```

**Edit 4** — replace all `StatementSync` field types with `Statement` (private fields at bottom of class). Each line:
```
private readonly listStmt: StatementSync
```
becomes:
```
private readonly listStmt: Statement
```
Do this for all 9 statement fields (listStmt, existsStmt, loadStmt, updateStmt, insertStmt, deleteStmt, loadDraftStmt, saveDraftStmt, deleteDraftStmt).

- [ ] **Step 6: Update `src/repositories/applicant/stub/index.ts`**

Read file, update import (line 17):
Old:
```typescript
import { createUniqueDerivedId } from "@/utils/node/index.js"
```
New:
```typescript
import { createUniqueDerivedId } from "@/utils/index.js"
```

- [ ] **Step 7: Update `src/repositories/applicant/types.ts`**

Read file, update import (line 10):
Old:
```typescript
import { createUniqueDerivedId } from "@/utils/node/index.js"
```
New:
```typescript
import { createUniqueDerivedId } from "@/utils/index.js"
```

- [ ] **Step 8: Update `src/repositories/job-search/sqlite/index.ts`**

Read file fully (~246 lines), then apply:

**Edit 1** — update utils import (around lines 18-22):
Old:
```typescript
import {
  Database,
  createUniqueDerivedId,
  parseRow,
} from "@/utils/node/index.js"
```
New:
```typescript
import {
  Database,
  createUniqueDerivedId,
  type Statement,
} from "@/utils/index.js"
```

**Edit 2** — replace `parseRow(this.loadStmt.get(id))` in `load()` (line 121):
Old:
```typescript
    const jobSearch = parseRow(this.loadStmt.get(id))
```
New:
```typescript
    const jobSearch = this.loadStmt.getJsonData(id)
```

Field types use `ReturnType<Database["prepare"]>` which auto-resolves to `Statement` — no changes needed.

- [ ] **Step 9: Update `src/repositories/job-search/stub/index.ts`**

Read file, update import (line 17):
Old:
```typescript
import { createUniqueDerivedId } from "@/utils/node/index.js"
```
New:
```typescript
import { createUniqueDerivedId } from "@/utils/index.js"
```

- [ ] **Step 10: Update `src/repositories/vacancy/sqlite/index.ts`**

Read file fully (~126 lines), then apply:

**Edit 1** — update import (line 1):
Old:
```typescript
import { Database, parseRow } from "@/utils/node/index.js"
```
New:
```typescript
import { Database } from "@/utils/index.js"
```

**Edit 2** — in `findByHash()` (line 97), replace `parseRow(this.findByHashStmt.get(...))`:
Old:
```typescript
    const row = parseRow(this.findByHashStmt.get(jobSearchId, hash))
```
New:
```typescript
    const row = this.findByHashStmt.getJsonData(jobSearchId, hash)
```

**Edit 3** — in `addActivity()` (line 103), same replacement:
Old:
```typescript
    const row = parseRow(this.findByHashStmt.get(jobSearchId, hash))
```
New:
```typescript
    const row = this.findByHashStmt.getJsonData(jobSearchId, hash)
```

**Edit 4** — replace `hydrateVacancyRow` function (around line 143). This function previously called the now-removed `parseRow`. Since `all()` now returns `Record<string, unknown>[]` and each row has a `data` string property, parse it directly.

Old:
```typescript
function hydrateVacancyRow(row: unknown): Vacancy {
  return hydrateVacancy(parseRow(row))
}
```
New:
```typescript
function hydrateVacancyRow(row: Record<string, unknown>): Vacancy {
  if (typeof row.data !== "string") throw new Error("Invalid vacancy row")
  return hydrateVacancy(JSON.parse(row.data))
}
```

- [ ] **Step 11: Update `src/app/main.ts`** (line 21)

Old:
```typescript
import { Database } from "@/utils/node/index.js"
```
New:
```typescript
import { Database } from "@/utils/index.js"
```

- [ ] **Step 12: Update `src/app/composition/create-service-context.ts`** (line 19)

Old:
```typescript
import type { Database } from "@/utils/node/index.js"
```
New:
```typescript
import type { Database } from "@/utils/index.js"
```

- [ ] **Step 13: Update test files — import path changes**

In each of these files, change `@/utils/node/index.js` → `@/utils/index.js`:

`src/repositories/applicant/applicant.test.ts` (~line 7-10):
Old:
```typescript
import {
  Database,
  setupTemporaryDatabaseDirectory,
} from "@/utils/node/index.js"
```
New:
```typescript
import { Database, setupTemporaryDatabaseDirectory } from "@/utils/index.js"
```

`src/repositories/job-search/job-search.test.ts` (~line 7-10):
Old:
```typescript
import {
  Database,
  setupTemporaryDatabaseDirectory,
} from "@/utils/node/index.js"
```
New:
```typescript
import { Database, setupTemporaryDatabaseDirectory } from "@/utils/index.js"
```

`src/repositories/vacancy/vacancy.test.ts` (~line 5-9):
Old:
```typescript
import {
  Database,
  setupTemporaryDatabaseDirectory,
} from "@/utils/node/index.js"
```
New:
```typescript
import { Database, setupTemporaryDatabaseDirectory } from "@/utils/index.js"
```

- [ ] **Step 14: Run all tests**

```bash
npm test
```
Expected: all tests pass. Fix any type errors or test failures before committing.

- [ ] **Step 15: Commit**

```bash
git add src/utils/node/database.ts src/utils/node/index.ts src/utils/index.ts src/utils/database.test.ts src/repositories/ src/app/
git commit -m "feat: add Statement wrapper with getJsonData, update all consumers, add real database tests"
```

---

### Task 7: Flatten — delete `src/utils/node/` directory

**Files:**
- Modify: `src/utils/test-utils.ts` (become self-contained)
- Modify: `src/utils/database.test.ts` (update import path)
- Modify: `src/utils/index.ts` (update database import path)
- Delete: `src/utils/node/` (entire directory)
- Delete: `src/utils/stub-utilities.ts`
- Delete: `src/utils/test-database-utilities.test.ts`

- [ ] **Step 1: Make `src/utils/test-utils.ts` self-contained**

Read current file (2 re-export lines). Replace with inline implementations:

```typescript
import { beforeAll, afterAll } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

export function findStubMatch<T>(
  entries: Record<string, T>,
  value: string,
): T | undefined {
  if (value in entries) return entries[value]
  for (const [pattern, entry] of Object.entries(entries)) {
    if (value.includes(pattern)) return entry
  }
  return undefined
}

export function setupTemporaryDatabaseDirectory(prefix: string) {
  let temporaryDirectory: string
  let counter = 0

  beforeAll(() => {
    temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), `${prefix}-`),
    )
  })

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  })

  return {
    nextId: () => String(counter++),
    pathForId: (id: string) =>
      path.join(temporaryDirectory, `${id}.db`),
  }
}
```

- [ ] **Step 2: Move `database.ts` out of `node/`**

```bash
mv src/utils/node/database.ts src/utils/database.ts
```

- [ ] **Step 3: Update `src/utils/database.test.ts` import**

Old (first import line):
```typescript
import { Database } from "./node/database.js"
```
New:
```typescript
import { Database } from "./database.js"
```

- [ ] **Step 4: Update `src/utils/index.ts`** — change `node/database.js` → `database.js`

Line to change:
Old:
```typescript
export { Database, Statement } from "./node/database.js"
```
New:
```typescript
export { Database, Statement } from "./database.js"
```

- [ ] **Step 5: Delete stale files**

```bash
rm -rf src/utils/node/
rm src/utils/stub-utilities.ts
rm src/utils/test-database-utilities.test.ts
```

- [ ] **Step 6: Run full verify**

```bash
npm run verify
```
Expected: build, lint, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A src/utils/
git commit -m "refactor: flatten utils, delete src/utils/node/ directory"
```

---

## Final Verification

After all 7 tasks complete:

```bash
npm run verify
npm test
npm run test:crawler
```

All must pass. Final file tree:

```
src/utils/
  index.ts
  normalize.ts
  normalize.test.ts
  json-ld.ts
  json-ld.test.ts
  database.ts
  database.test.ts
  id.ts
  id.test.ts
  test-utils.ts
  test-utils.test.ts
```
