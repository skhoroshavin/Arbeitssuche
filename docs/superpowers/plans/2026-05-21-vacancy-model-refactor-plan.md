# Implementation Plan: Vacancy Model & Repository Refactor

**Design:** `docs/superpowers/specs/2026-05-21-vacancy-model-refactor-design.md`

---

## Task 1: VacancyAddress Model

**Files:**
- Create: `src/models/vacancy/vacancy-address.ts`
- Create: `src/models/vacancy/vacancy-address.test.ts`
- Modify: `src/models/vacancy/index.ts`

### Step 1: Write the failing test

```ts
import { describe, it, expect } from "vitest"
import { VacancyAddress } from "./vacancy-address"

describe("VacancyAddress", () => {
  it("fromString puts whole string into street", () => {
    const addr = VacancyAddress.fromString("Berlin")
    expect(addr.street).toBe("Berlin")
    expect(addr.zip).toBe("")
    expect(addr.city).toBe("")
    expect(addr.format()).toBe("Berlin")
  })

  it("parse handles object with commute", () => {
    const addr = VacancyAddress.parse({
      street: "Musterstraße 1",
      zip: "10115",
      city: "Berlin",
      commute: {
        distance: "10 km",
        durations: { morning: 25, day: 20, evening: 30 },
        fetchedAt: "2026-01-01",
      },
    })
    expect(addr.street).toBe("Musterstraße 1")
    expect(addr.zip).toBe("10115")
    expect(addr.city).toBe("Berlin")
    expect(addr.commute).toBeDefined()
    expect(addr.commute?.durations.morning).toBe(25)
  })

  it("parse handles plain object without commute", () => {
    const addr = VacancyAddress.parse({ street: "X", zip: "Y", city: "Z" })
    expect(addr.commute).toBeUndefined()
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/models/vacancy/vacancy-address.test.ts`
Expected: FAIL with "Cannot find module"

### Step 3: Write minimal implementation

`src/models/vacancy/vacancy-address.ts`:

```ts
import { z } from "zod"
import { Address } from "@/models/common"

export interface CommuteInfo {
  distance: string
  durations: CommuteDurations
  fetchedAt: string
}

interface CommuteDurations {
  morning: number
  day: number
  evening: number
}

export const CommuteInfoSchema = z.object({
  distance: z.string(),
  durations: z.object({
    morning: z.number(),
    day: z.number(),
    evening: z.number(),
  }),
  fetchedAt: z.string(),
})

export class VacancyAddress extends Address {
  commute?: CommuteInfo

  static fromString(value: string): VacancyAddress {
    const addr = new VacancyAddress()
    addr.street = value
    addr.zip = ""
    addr.city = ""
    return addr
  }

  static parse(data: unknown): VacancyAddress {
    const parsed = VacancyAddressSchema.parse(data)
    const addr = new VacancyAddress()
    addr.street = parsed.street
    addr.zip = parsed.zip
    addr.city = parsed.city
    addr.commute = parsed.commute
    return addr
  }
}

const VacancyAddressSchema = z.object({
  street: z.string().default(""),
  zip: z.string().default(""),
  city: z.string().default(""),
  commute: CommuteInfoSchema.optional(),
})
```

### Step 4: Export from index

`src/models/vacancy/index.ts` — add to the bottom before the existing exports:

```ts
export { VacancyAddress } from "./vacancy-address.js"
```

### Step 5: Run test to verify it passes

Run: `npm test -- src/models/vacancy/vacancy-address.test.ts`
Expected: PASS

### Step 6: Commit

```bash
git add src/models/vacancy/vacancy-address.ts src/models/vacancy/vacancy-address.test.ts src/models/vacancy/index.ts
git commit -m "feat(models): add VacancyAddress class"
```

---

## Task 2: Rewrite Vacancy Model

**Files:**
- Modify: `src/models/vacancy/vacancy.ts` (complete rewrite)
- Modify: `src/models/vacancy/index.ts` (inline types, remove old exports)
- Delete: `src/models/vacancy/schemas.ts`
- Delete: `src/models/vacancy/resolve.ts`
- Modify: `src/models/vacancy/constants.ts` (add "unknown" to MATCH_SCORE_LABELS)

### Step 1: Update constants.ts

`src/models/vacancy/constants.ts` — update the imports and add unknown label:

```ts
import type { ActivityType, MatchScore, VacancyStatus } from "./vacancy.js"
```

And add to `MATCH_SCORE_LABELS`:

```ts
export const MATCH_SCORE_LABELS: Record<MatchScore, string> = {
  "very-bad": "Sehr schlecht",
  bad: "Schlecht",
  ok: "OK",
  good: "Gut",
  excellent: "Ausgezeichnet",
  unknown: "Unbekannt",
}
```

### Step 2: Write the new vacancy.ts

Replace `src/models/vacancy/vacancy.ts` entirely:

```ts
import { z } from "zod"
import { VacancyAddress } from "./vacancy-address.js"

export type ActivityType =
  | "found"
  | "not-found"
  | "applied"
  | "invited"
  | "interviewed"
  | "offered"
  | "rejected"
  | "not-interested"

export type VacancyStatus =
  | "new"
  | "gone"
  | "renewed"
  | "applied"
  | "ignored"
  | "invited"
  | "interviewed"
  | "offered"
  | "rejected"
  | "not-interested"

export interface VacancySource {
  site: string
  url: string
}

export interface VacancyContact {
  name: string
  email: string
  phone: string
}

export type MatchScore = "very-bad" | "bad" | "ok" | "good" | "excellent" | "unknown"

export type Activity =
  | FoundActivity
  | NotFoundActivity
  | AppliedActivity
  | InvitedActivity
  | InterviewedActivity
  | OfferedActivity
  | RejectedActivity
  | NotInterestedActivity

export interface FoundActivity extends BaseActivity {
  type: "found"
  site: string
  url: string
  description: string
  contact: VacancyContact
}

export interface NotFoundActivity extends BaseActivity {
  type: "not-found"
  site: string
}

interface AppliedActivity extends BaseActivity {
  type: "applied"
}

interface InvitedActivity extends BaseActivity {
  type: "invited"
  interviewDate: string
}

interface InterviewedActivity extends BaseActivity {
  type: "interviewed"
  outcome: "completed" | "cancelled"
}

interface OfferedActivity extends BaseActivity {
  type: "offered"
  startDate: string
  salary: string
}

interface RejectedActivity extends BaseActivity {
  type: "rejected"
}

interface NotInterestedActivity extends BaseActivity {
  type: "not-interested"
}

interface BaseActivity {
  date: string
  notes: string
}

export class Vacancy {
  hash = ""
  title = ""
  company = ""
  addresses: VacancyAddress[] = []
  contact: VacancyContact = { name: "", email: "", phone: "" }
  startDate = ""
  description = ""
  enriched = false
  enrichmentDirty = false
  summary = ""
  matchScore: MatchScore = "unknown"
  activityHistory: Activity[] = []
  active = true
  coverLetter = ""

  static parse(data: unknown): Vacancy {
    const parsed = VacancyInputSchema.parse(data)
    const vacancy = new Vacancy()
    vacancy.hash = parsed.hash
    vacancy.title = parsed.title
    vacancy.company = parsed.company
    vacancy.addresses = parsed.addresses.map((a) =>
      typeof a === "string" ? VacancyAddress.fromString(a) : VacancyAddress.parse(a),
    )
    vacancy.contact = parsed.contact
    vacancy.startDate = parsed.startDate
    vacancy.description = parsed.description
    vacancy.enriched = parsed.enriched
    vacancy.enrichmentDirty = parsed.enrichmentDirty
    vacancy.summary = parsed.summary
    vacancy.matchScore = parsed.matchScore
    vacancy.activityHistory = parsed.activityHistory
    vacancy.active = parsed.active
    vacancy.coverLetter = parsed.coverLetter

    if (parsed.commute && typeof parsed.commute === "object") {
      for (const [key, value] of Object.entries(parsed.commute)) {
        const addr = vacancy.addresses.find((a) => a.format() === key)
        if (addr && value) {
          addr.commute = value
        }
      }
    }

    return vacancy
  }

  get status(): VacancyStatus {
    const userActivities = this.activityHistory.filter(
      (a) => a.type !== "found" && a.type !== "not-found",
    )

    if (userActivities.length === 0) {
      return deriveStatusNoUserActivity(this.activityHistory, this.active)
    }

    const types = new Set(userActivities.map((a) => a.type))
    return deriveStatusFromHistory(types, this.active)
  }

  get sources(): VacancySource[] {
    const seen = new Set<string>()
    const sources: VacancySource[] = []

    for (const activity of this.activityHistory) {
      if (activity.type !== "found") continue
      const key = `${activity.site}\0${activity.url}`
      if (seen.has(key)) continue
      seen.add(key)
      sources.push({ site: activity.site, url: activity.url })
    }

    return sources
  }

  addActivity(activity: Activity): void {
    this.activityHistory.push(activity)
  }

  getMinCommuteMinutes(): number | undefined {
    const infos = this.addresses
      .map((a) => a.commute)
      .filter((c): c is CommuteInfo => !!c)
    if (infos.length === 0) return undefined
    return Math.min(...infos.map((info) => info.durations.morning))
  }

  getLatestActivityDate(): string {
    return this.activityHistory.at(-1)?.date ?? ""
  }
}

const VacancyContactSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
})

const VacancySourceSchema = z.object({
  site: z.string(),
  url: z.string(),
})

const ActivitySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("found"),
    date: z.string(),
    notes: z.string(),
    site: z.string(),
    url: z.string(),
    description: z.string(),
    contact: VacancyContactSchema,
  }),
  z.object({
    type: z.literal("not-found"),
    date: z.string(),
    notes: z.string(),
    site: z.string(),
  }),
  z.object({
    type: z.literal("applied"),
    date: z.string(),
    notes: z.string(),
  }),
  z.object({
    type: z.literal("invited"),
    date: z.string(),
    notes: z.string(),
    interviewDate: z.string(),
  }),
  z.object({
    type: z.literal("interviewed"),
    date: z.string(),
    notes: z.string(),
    outcome: z.enum(["completed", "cancelled"]),
  }),
  z.object({
    type: z.literal("offered"),
    date: z.string(),
    notes: z.string(),
    startDate: z.string(),
    salary: z.string(),
  }),
  z.object({
    type: z.literal("rejected"),
    date: z.string(),
    notes: z.string(),
  }),
  z.object({
    type: z.literal("not-interested"),
    date: z.string(),
    notes: z.string(),
  }),
])

const VacancyInputSchema = z
  .object({
    hash: z.string().default(""),
    title: z.string().default(""),
    company: z.string().default(""),
    urls: z.array(z.string()).optional(),
    addresses: z.array(z.union([z.string(), z.unknown()])).default([]),
    contact: VacancyContactSchema.default({ name: "", email: "", phone: "" }),
    startDate: z.string().default(""),
    description: z.string().default(""),
    enriched: z.boolean().default(false),
    enrichmentDirty: z.boolean().default(false),
    summary: z.string().default(""),
    matchScore: z
      .enum(["very-bad", "bad", "ok", "good", "excellent", "unknown"])
      .default("unknown"),
    commute: z.record(z.string(), CommuteInfoSchema).optional(),
    activityHistory: z.array(ActivitySchema).default([]),
    active: z.boolean().default(true),
    coverLetter: z.string().default(""),
  })
  .passthrough()

function deriveStatusNoUserActivity(
  activityHistory: Activity[],
  active: boolean,
): VacancyStatus {
  if (!active) return "gone"
  const wasGone = activityHistory.some((a) => a.type === "not-found")
  return wasGone ? "renewed" : "new"
}

function deriveStatusFromHistory(
  types: Set<string>,
  active: boolean,
): VacancyStatus {
  const STATUS_PRIORITY = [
    "rejected",
    "offered",
    "interviewed",
    "invited",
  ] as const
  const match = STATUS_PRIORITY.find((t) => types.has(t))
  if (match) return match

  if (types.has("applied")) return active ? "applied" : "ignored"
  if (types.has("not-interested")) return "not-interested"
  return active ? "new" : "gone"
}

export const VacancySerializedSchema = z.object({
  hash: z.string(),
  title: z.string(),
  company: z.string(),
  addresses: z.array(z.unknown()),
  contact: VacancyContactSchema,
  startDate: z.string(),
  description: z.string(),
  enriched: z.boolean(),
  enrichmentDirty: z.boolean(),
  summary: z.string(),
  matchScore: z.string(),
  activityHistory: z.array(z.unknown()),
  active: z.boolean(),
  coverLetter: z.string(),
  status: z.string(),
  sources: z.array(VacancySourceSchema),
})
```

### Step 3: Rewrite index.ts exports

Replace `src/models/vacancy/index.ts` entirely:

```ts
export {
  MATCH_SCORE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TRANSITIONS,
  type StatusAction,
  type StatusLabelKey,
} from "./constants.js"
export {
  Vacancy,
  VacancySerializedSchema,
  type Activity,
  type ActivityType,
  type AppliedActivity,
  type FoundActivity,
  type InterviewedActivity,
  type InvitedActivity,
  type MatchScore,
  type NotFoundActivity,
  type NotInterestedActivity,
  type OfferedActivity,
  type RejectedActivity,
  type VacancyContact,
  type VacancySource,
  type VacancyStatus,
} from "./vacancy.js"
export { VacancyAddress, CommuteInfoSchema, type CommuteInfo } from "./vacancy-address.js"
```

### Step 4: Delete old files

```bash
rm src/models/vacancy/schemas.ts
rm src/models/vacancy/resolve.ts
```

### Step 5: Run tests (will fail until consumers are updated)

Run: `npm test -- src/models/vacancy/vacancy.test.ts`
Expected: FAIL (compilation errors in other files)

### Step 6: Commit

```bash
git add src/models/vacancy/
git rm src/models/vacancy/schemas.ts src/models/vacancy/resolve.ts
git commit -m "refactor(models): rewrite Vacancy as mutable class with getters, delete DTO/resolve"
```

---

## Task 3: Vacancy Model Unit Tests

**Files:**
- Modify: `src/models/vacancy/vacancy.test.ts`

### Step 1: Rewrite tests

Replace `src/models/vacancy/vacancy.test.ts` entirely:

```ts
import { describe, it, test, expect } from "vitest"
import { Vacancy } from "."

describe("status getter", () => {
  it("returns 'new' for active vacancy with no history", () => {
    expect(makeVacancy().status).toBe("new")
  })

  it("returns 'gone' for inactive vacancy with no user activities", () => {
    expect(makeVacancy({ active: false }).status).toBe("gone")
  })

  it("returns 'renewed' for active vacancy that was previously not-found", () => {
    expect(
      makeVacancy({
        activityHistory: [
          {
            type: "found",
            date: "2025-01-01",
            site: "s",
            url: "u",
            notes: "",
            description: "",
            contact: { name: "", email: "", phone: "" },
          },
          { type: "not-found", date: "2025-01-02", site: "s", notes: "" },
          {
            type: "found",
            date: "2025-01-03",
            site: "s",
            url: "u",
            notes: "",
            description: "",
            contact: { name: "", email: "", phone: "" },
          },
        ],
      }).status,
    ).toBe("renewed")
  })

  it("returns 'applied' for active vacancy with applied activity", () => {
    expect(
      makeVacancy({
        activityHistory: [{ type: "applied", date: "2025-01-01", notes: "" }],
      }).status,
    ).toBe("applied")
  })

  it("returns 'ignored' for inactive vacancy with applied activity", () => {
    expect(
      makeVacancy({
        active: false,
        activityHistory: [{ type: "applied", date: "2025-01-01", notes: "" }],
      }).status,
    ).toBe("ignored")
  })

  it("returns 'invited' when invited activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "applied", date: "2025-01-01", notes: "" },
          {
            type: "invited",
            date: "2025-01-02",
            interviewDate: "2025-01-10",
            notes: "",
          },
        ],
      }).status,
    ).toBe("invited")
  })

  it("returns 'interviewed' when interviewed activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "applied", date: "2025-01-01", notes: "" },
          {
            type: "interviewed",
            date: "2025-01-05",
            outcome: "completed",
            notes: "",
          },
        ],
      }).status,
    ).toBe("interviewed")
  })

  it("returns 'offered' when offered activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [
          {
            type: "offered",
            date: "2025-01-01",
            notes: "",
            startDate: "",
            salary: "",
          },
        ],
      }).status,
    ).toBe("offered")
  })

  it("returns 'rejected' when rejected activity exists (highest priority)", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "applied", date: "2025-01-01", notes: "" },
          {
            type: "offered",
            date: "2025-01-02",
            notes: "",
            startDate: "",
            salary: "",
          },
          { type: "rejected", date: "2025-01-03", notes: "" },
        ],
      }).status,
    ).toBe("rejected")
  })

  it("returns 'not-interested' when not-interested activity exists", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "not-interested", date: "2025-01-01", notes: "" },
        ],
      }).status,
    ).toBe("not-interested")
  })

  it("returns 'applied' over 'not-interested' when both exist", () => {
    expect(
      makeVacancy({
        activityHistory: [
          { type: "not-interested", date: "2025-01-01", notes: "" },
          { type: "applied", date: "2025-01-02", notes: "" },
        ],
      }).status,
    ).toBe("applied")
  })
})

describe("parse defaults", () => {
  it("fills missing runtime defaults", () => {
    expect(Vacancy.parse({ hash: "abc" })).toMatchObject({
      hash: "abc",
      title: "",
      company: "",
      addresses: [],
      contact: { name: "", email: "", phone: "" },
      startDate: "",
      description: "",
      enriched: false,
      enrichmentDirty: false,
      summary: "",
      matchScore: "unknown",
      activityHistory: [],
      active: true,
      coverLetter: "",
    })
  })
})

describe("sources getter", () => {
  test("empty history returns empty sources", () => {
    expect(makeVacancy().sources).toEqual([])
  })

  test("single found activity returns one source", () => {
    const result = makeVacancy({
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "xing",
          url: "https://xing.com/job/1",
          notes: "",
          description: "",
          contact: { name: "", email: "", phone: "" },
        },
      ],
    }).sources
    expect(result).toEqual([{ site: "xing", url: "https://xing.com/job/1" }])
  })

  test("repeated same site+url is deduplicated", () => {
    const result = makeVacancy({
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "xing",
          url: "https://xing.com/job/1",
          notes: "",
          description: "",
          contact: { name: "", email: "", phone: "" },
        },
        {
          type: "found",
          date: "2026-01-02",
          site: "xing",
          url: "https://xing.com/job/1",
          notes: "",
          description: "",
          contact: { name: "", email: "", phone: "" },
        },
      ],
    }).sources
    expect(result.length).toBe(1)
    expect(result[0]).toEqual({
      site: "xing",
      url: "https://xing.com/job/1",
    })
  })

  test("non-found activities are ignored", () => {
    const result = makeVacancy({
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "xing",
          url: "https://xing.com/job/1",
          notes: "",
          description: "",
          contact: { name: "", email: "", phone: "" },
        },
        { type: "applied", date: "2026-01-02", notes: "" },
      ],
    }).sources
    expect(result.length).toBe(1)
  })
})

describe("getMinCommuteMinutes", () => {
  test("returns undefined when no commute data", () => {
    expect(makeVacancy().getMinCommuteMinutes()).toBe(undefined)
  })

  test("returns morning minutes for single address with commute", () => {
    const v = makeVacancy({
      addresses: [
        {
          street: "",
          zip: "",
          city: "Berlin",
          commute: {
            distance: "10 km",
            durations: { morning: 25, day: 20, evening: 30 },
            fetchedAt: "2026-01-01",
          },
        },
      ],
    })
    expect(v.getMinCommuteMinutes()).toBe(25)
  })

  test("returns minimum morning across multiple addresses", () => {
    const v = makeVacancy({
      addresses: [
        {
          street: "",
          zip: "",
          city: "Berlin",
          commute: {
            distance: "10 km",
            durations: { morning: 25, day: 20, evening: 30 },
            fetchedAt: "2026-01-01",
          },
        },
        {
          street: "",
          zip: "",
          city: "Munich",
          commute: {
            distance: "600 km",
            durations: { morning: 15, day: 12, evening: 18 },
            fetchedAt: "2026-01-01",
          },
        },
      ],
    })
    expect(v.getMinCommuteMinutes()).toBe(15)
  })
})

describe("getLatestActivityDate", () => {
  test("returns empty string for no activities", () => {
    expect(makeVacancy().getLatestActivityDate()).toBe("")
  })

  test("returns last activity date", () => {
    const v = makeVacancy({
      activityHistory: [
        {
          type: "found",
          date: "2026-01-01",
          site: "s",
          url: "u",
          notes: "",
          description: "",
          contact: { name: "", email: "", phone: "" },
        },
        { type: "applied", date: "2026-01-15", notes: "" },
      ],
    })
    expect(v.getLatestActivityDate()).toBe("2026-01-15")
  })
})

describe("addActivity", () => {
  test("appends activity to history", () => {
    const v = makeVacancy()
    v.addActivity({ type: "applied", date: "2026-01-01", notes: "" })
    expect(v.activityHistory.length).toBe(1)
    expect(v.activityHistory[0].type).toBe("applied")
  })
})

describe("legacy parsing", () => {
  test("ignores old urls field", () => {
    const v = Vacancy.parse({ hash: "h1", urls: ["http://old"] })
    expect(v.sources).toEqual([])
  })

  test("maps old string addresses", () => {
    const v = Vacancy.parse({ hash: "h1", addresses: ["Berlin"] })
    expect(v.addresses.length).toBe(1)
    expect(v.addresses[0].format()).toBe("Berlin")
  })

  test("merges old commute record into matching address", () => {
    const v = Vacancy.parse({
      hash: "h1",
      addresses: ["Berlin"],
      commute: {
        Berlin: {
          distance: "5 km",
          durations: { morning: 10, day: 8, evening: 12 },
          fetchedAt: "2026-01-01",
        },
      },
    })
    expect(v.addresses[0].commute).toBeDefined()
    expect(v.addresses[0].commute?.distance).toBe("5 km")
  })

  test("defaults missing matchScore to unknown", () => {
    const v = Vacancy.parse({ hash: "h1" })
    expect(v.matchScore).toBe("unknown")
  })

  test("defaults missing coverLetter to empty string", () => {
    const v = Vacancy.parse({ hash: "h1" })
    expect(v.coverLetter).toBe("")
  })
})

function makeVacancy(overrides: Record<string, unknown> = {}): Vacancy {
  return Vacancy.parse({
    hash: "abc123",
    title: "Test",
    company: "Test Co",
    addresses: [],
    contact: { name: "", email: "", phone: "" },
    activityHistory: [],
    active: true,
    ...overrides,
  })
}
```

### Step 2: Run tests

Run: `npm test -- src/models/vacancy/vacancy.test.ts`
Expected: PASS

### Step 3: Commit

```bash
git add src/models/vacancy/vacancy.test.ts
git commit -m "test(models): rewrite Vacancy unit tests for parse/getters/mutation"
```

---

## Task 4: VacancyRepository Interface & Output Cleanup

**Files:**
- Modify: `src/repositories/vacancy/index.ts`
- Delete: `src/repositories/vacancy/output.ts`

### Step 1: Rewrite interface

Replace `src/repositories/vacancy/index.ts`:

```ts
import type { Vacancy } from "@/models/vacancy/index.js"
import type { JobSearchID } from "@/models/job-search"

export { createSqliteVacancyRepository } from "./sqlite"
export { createStubVacancyRepository } from "./stub"

export interface VacancyRepository {
  allForJobSearch(jobSearchId: JobSearchID): Vacancy[]
  save(jobSearchId: JobSearchID, vacancies: Vacancy[]): void
  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined
}
```

### Step 2: Delete output.ts

```bash
rm src/repositories/vacancy/output.ts
```

### Step 3: Commit

```bash
git add src/repositories/vacancy/index.ts
git rm src/repositories/vacancy/output.ts
git commit -m "refactor(repositories): simplify VacancyRepository interface, delete output.ts"
```

---

## Task 5: SqliteVacancyRepository

**Files:**
- Modify: `src/repositories/vacancy/sqlite/index.ts`

### Step 1: Rewrite implementation

Replace `src/repositories/vacancy/sqlite/index.ts` entirely:

```ts
import { Database, semverGreaterThan } from "@/utils/index.js"
import { Vacancy } from "@/models/vacancy/index.js"
import type { JobSearchID } from "@/models/job-search"
import type { VacancyRepository } from "@/repositories/vacancy"

export function createSqliteVacancyRepository(
  database: Database,
): VacancyRepository {
  runVacancyMigration(database)
  database.exec(`
    CREATE TABLE IF NOT EXISTS vacancies (
      job_search_id TEXT NOT NULL REFERENCES job_searches(id) ON DELETE CASCADE,
      hash TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (job_search_id, hash)
    )
  `)
  return new SqliteVacancyRepository(database)
}

function runVacancyMigration(database: Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      repository TEXT PRIMARY KEY,
      version TEXT NOT NULL
    )
  `)

  const row = database
    .prepare("SELECT version FROM _migrations WHERE repository = ?")
    .get("vacancy")
  const version =
    row && typeof row === "object" && "version" in row
      ? String(row.version)
      : "0.0.0"

  if (semverGreaterThan("0.4.0", version)) {
    database.transaction(() => {
      migrateCoverLetters(database)
      database.exec(`DROP TABLE IF EXISTS cover_letters`)
      database.exec(`DROP TABLE IF EXISTS vacancy_meta`)
      database.exec(`
        INSERT OR REPLACE INTO _migrations (repository, version)
        VALUES ('vacancy', '0.4.0')
      `)
    })()
  }
}

function migrateCoverLetters(database: Database): void {
  const tableInfo = database
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cover_letters'")
    .get()
  if (!tableInfo) return

  const rows = database
    .prepare("SELECT job_search_id, vacancy_hash, content FROM cover_letters")
    .all() as Array<{
    job_search_id: string
    vacancy_hash: string
    content: string
  }>

  for (const row of rows) {
    const existing = database
      .prepare("SELECT data FROM vacancies WHERE job_search_id = ? AND hash = ?")
      .get(row.job_search_id, row.vacancy_hash) as
      | { data: string }
      | undefined
    if (!existing) continue

    const data = JSON.parse(existing.data) as Record<string, unknown>
    data.coverLetter = row.content
    database
      .prepare(
        "UPDATE vacancies SET data = ? WHERE job_search_id = ? AND hash = ?",
      )
      .run(JSON.stringify(data), row.job_search_id, row.vacancy_hash)
  }
}

class SqliteVacancyRepository implements VacancyRepository {
  constructor(private readonly database: Database) {
    this.loadAllStmt = database.prepare(
      "SELECT data FROM vacancies WHERE job_search_id = ?",
    )
    this.deleteStaleVacanciesStmt = database.prepare(
      "DELETE FROM vacancies WHERE job_search_id = ? AND hash NOT IN (SELECT value FROM json_each(?))",
    )
    this.upsertVacancyStmt = database.prepare(
      "INSERT OR REPLACE INTO vacancies (job_search_id, hash, data) VALUES (?, ?, ?)",
    )
    this.findByHashStmt = database.prepare(
      "SELECT data FROM vacancies WHERE job_search_id = ? AND hash = ?",
    )
  }

  allForJobSearch(jobSearchId: JobSearchID): Vacancy[] {
    return this.loadAllStmt
      .all(jobSearchId.value)
      .map((raw) => hydrateVacancyRow(raw))
  }

  save(jobSearchId: JobSearchID, vacancies: Vacancy[]): void {
    const hashes = JSON.stringify(vacancies.map((v) => v.hash))

    this.database.transaction(() => {
      this.deleteStaleVacanciesStmt.run(jobSearchId.value, hashes)
      for (const vacancy of vacancies) {
        this.upsertVacancyStmt.run(
          jobSearchId.value,
          vacancy.hash,
          JSON.stringify(vacancy),
        )
      }
    })()
  }

  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined {
    const row = this.findByHashStmt.getJsonData(jobSearchId.value, hash)
    if (row === undefined) return undefined
    return Vacancy.parse(row)
  }

  private readonly loadAllStmt
  private readonly deleteStaleVacanciesStmt
  private readonly upsertVacancyStmt
  private readonly findByHashStmt
}

function hydrateVacancyRow(row: Record<string, unknown>): Vacancy {
  if (typeof row.data !== "string") throw new Error("Invalid vacancy row")
  return Vacancy.parse(JSON.parse(row.data))
}
```

### Step 2: Commit

```bash
git add src/repositories/vacancy/sqlite/index.ts
git commit -m "refactor(repositories): rewrite SqliteVacancyRepository, migrate cover_letters into JSON"
```

---

## Task 6: StubVacancyRepository

**Files:**
- Modify: `src/repositories/vacancy/stub/index.ts`

### Step 1: Rewrite implementation

Replace `src/repositories/vacancy/stub/index.ts` entirely:

```ts
import { Vacancy } from "@/models/vacancy/index.js"
import type { JobSearchID } from "@/models/job-search"
import type { VacancyRepository } from "@/repositories/vacancy"

export function createStubVacancyRepository(
  initial?: Record<string, Vacancy[]>,
): VacancyRepository {
  return new StubVacancyRepository(initial)
}

class StubVacancyRepository implements VacancyRepository {
  constructor(initial?: Record<string, Vacancy[]>) {
    this.store = new Map(
      initial
        ? Object.entries(initial).map(([id, vacancies]) => [
            id,
            vacancies.map((v) => Vacancy.parse(structuredClone(v))),
          ])
        : [],
    )
  }

  allForJobSearch(jobSearchId: JobSearchID): Vacancy[] {
    const data = this.store.get(jobSearchId.value)
    if (!data) return []
    return data.map((v) => Vacancy.parse(structuredClone(v)))
  }

  save(jobSearchId: JobSearchID, vacancies: Vacancy[]): void {
    this.store.set(
      jobSearchId.value,
      vacancies.map((v) => Vacancy.parse(structuredClone(v))),
    )
  }

  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined {
    const data = this.store.get(jobSearchId.value)
    const found = data?.find((v) => v.hash === hash)
    return found ? Vacancy.parse(structuredClone(found)) : undefined
  }

  private readonly store: Map<string, Vacancy[]>
}
```

### Step 2: Commit

```bash
git add src/repositories/vacancy/stub/index.ts
git commit -m "refactor(repositories): rewrite StubVacancyRepository for new interface"
```

---

## Task 7: Vacancy Repository Integration Tests

**Files:**
- Modify: `src/repositories/vacancy/integration.test.ts`

### Step 1: Rewrite tests

Replace `src/repositories/vacancy/integration.test.ts` entirely:

```ts
import { test, describe, expect } from "vitest"
import type { VacancyRepository } from "."
import { createStubVacancyRepository } from "./stub"
import { createSqliteVacancyRepository } from "./sqlite"
import { createSqliteJobSearchRepository } from "@/repositories/job-search"
import { makeJobSearchID } from "@/models/job-search"
import { setupTemporaryDatabaseDirectory } from "@/test-helpers"
import { Database } from "@/utils"
import { Vacancy } from "@/models/vacancy/index.js"

vacancyRepositoryTests("StubVacancyRepository", () => ({
  repo: createStubVacancyRepository(),
  teardown: () => {},
}))

// --- Stub-specific ---

test("StubVacancyRepository initializes from provided data", () => {
  const repo = createStubVacancyRepository({
    s1: [makeVacancy()],
  })
  const output = repo.allForJobSearch(makeJobSearchID("s1"))
  expect(output.length).toBe(1)
})

// --- SqliteVacancyRepository ---

const { nextId, pathForId } = setupTemporaryDatabaseDirectory("vacancy-test")

vacancyRepositoryTests("SqliteVacancyRepository", () =>
  openDatabaseById(nextId()),
)

// --- Persistence ---

test("saved vacancies survive new repository instance", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  repo1.save(makeJobSearchID("s1"), [makeVacancy()])
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  const output = repo2.allForJobSearch(makeJobSearchID("s1"))
  expect(output.length).toBe(1)
  expect(output[0].hash).toBe("abc123")
  expect(output[0].title).toBe("Developer")
  t2()
})

test("cover letter persists via save round-trip", () => {
  const { repo, teardown } = openDatabaseById(nextId())
  const v = makeVacancy()
  v.coverLetter = "Dear hiring manager..."
  repo.save(makeJobSearchID("s1"), [v])

  const loaded = repo.allForJobSearch(makeJobSearchID("s1"))
  expect(loaded[0].coverLetter).toBe("Dear hiring manager...")
  teardown()
})

test("findByHash works across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  repo1.save(makeJobSearchID("s1"), [makeVacancy()])
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  const found = repo2.findByHash(makeJobSearchID("s1"), "abc123")
  if (!found) {
    throw new Error("Expected persisted vacancy to be found by hash")
  }
  expect(found.company).toBe("ACME")
  t2()
})

test("multiple vacancies persist correctly", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const v1 = makeVacancy({ hash: "h1", title: "Frontend Dev" })
  const v2 = makeVacancy({ hash: "h2", title: "Backend Dev" })
  repo1.save(makeJobSearchID("s1"), [v1, v2])
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  const output = repo2.allForJobSearch(makeJobSearchID("s1"))
  expect(output.length).toBe(2)
  const titles = output.map((v) => v.title).toSorted()
  expect(titles).toEqual(["Backend Dev", "Frontend Dev"])
  t2()
})

test("save replaces vacancies", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const v1 = makeVacancy({ hash: "h1" })
  const v2 = makeVacancy({ hash: "h2" })
  repo1.save(makeJobSearchID("s1"), [v1, v2])
  repo1.save(makeJobSearchID("s1"), [v1])
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  const output = repo2.allForJobSearch(makeJobSearchID("s1"))
  expect(output.length).toBe(1)
  t2()
})

test("migrates cover_letters into vacancy JSON on init", () => {
  const id = nextId()
  const database = Database.open(pathForId(id))

  database.exec(`
    CREATE TABLE job_searches (
      id TEXT PRIMARY KEY,
      applicant_id TEXT NOT NULL,
      search_term TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL
    )
  `)
  database.exec(`
    CREATE TABLE vacancies (
      job_search_id TEXT NOT NULL,
      hash TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (job_search_id, hash)
    )
  `)
  database.exec(`
    CREATE TABLE cover_letters (
      job_search_id TEXT NOT NULL,
      vacancy_hash TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      PRIMARY KEY (job_search_id, vacancy_hash)
    )
  `)

  database
    .prepare(
      "INSERT INTO job_searches (id, applicant_id, search_term, data) VALUES (?, '', '', '{}')",
    )
    .run("s1")

  database.prepare("INSERT INTO vacancies VALUES (?, ?, ?)").run(
    "s1",
    "h1",
    JSON.stringify({
      hash: "h1",
      title: "Dev",
      company: "ACME",
      addresses: [],
      active: true,
      activityHistory: [],
    }),
  )

  database
    .prepare("INSERT INTO cover_letters VALUES (?, ?, ?)")
    .run("s1", "h1", "cover letter content")

  const repo = createSqliteVacancyRepository(database)
  const loaded = repo.allForJobSearch(makeJobSearchID("s1"))
  expect(loaded[0].coverLetter).toBe("cover letter content")

  database.close()
})

function vacancyRepositoryTests(
  name: string,
  createRepo: () => { repo: VacancyRepository; teardown: () => void },
) {
  describe(name, () => {
    test("returns empty array for missing job search", () => {
      const { repo, teardown } = createRepo()
      expect(repo.allForJobSearch(makeJobSearchID("nope"))).toEqual([])
      teardown()
    })

    test("save + allForSearch round-trips", () => {
      const { repo, teardown } = createRepo()
      repo.save(makeJobSearchID("s1"), [makeVacancy()])
      const output = repo.allForJobSearch(makeJobSearchID("s1"))
      expect(output.length).toBe(1)
      expect(output[0].hash).toBe("abc123")
      teardown()
    })
  })
}

function makeVacancy(overrides: Record<string, unknown> = {}): Vacancy {
  return Vacancy.parse({
    hash: "abc123",
    title: "Developer",
    company: "ACME",
    addresses: ["Berlin"],
    contact: { name: "", email: "", phone: "" },
    activityHistory: [],
    active: true,
    ...overrides,
  })
}

function openDatabaseById(id: string) {
  const database = Database.open(pathForId(id))
  createSqliteJobSearchRepository(database)
  database
    .prepare(
      "INSERT OR IGNORE INTO job_searches (id, applicant_id, search_term, data) VALUES (?, '', '', '{}')",
    )
    .run("s1")
  return {
    db: database,
    repo: createSqliteVacancyRepository(database),
    teardown: () => database.close(),
  }
}
```

### Step 2: Run tests

Run: `npm run test:integration -- src/repositories/vacancy/integration.test.ts`
Expected: PASS

### Step 3: Commit

```bash
git add src/repositories/vacancy/integration.test.ts
git commit -m "test(repositories): rewrite vacancy integration tests for new interface"
```

---

## Task 8: Vacancy Processor (process.ts + mark-unseen.ts)

**Files:**
- Modify: `src/services/vacancy-processor/process.ts`
- Modify: `src/services/vacancy-processor/mark-unseen.ts`
- Modify: `src/services/vacancy-processor/index.ts`

### Step 1: Rewrite process.ts

Replace `src/services/vacancy-processor/process.ts`:

```ts
import type { VacancyDetails } from "@/plugins/job-site"
import { Vacancy } from "@/models/vacancy/index.js"
import type { FoundActivity, VacancyContact } from "@/models/vacancy"
import { VacancyAddress } from "@/models/vacancy"
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
    return mergeWithExisting(existing, details, hash, foundActivity, description)
  }

  const vacancy = new Vacancy()
  vacancy.hash = hash
  vacancy.title = details.title
  vacancy.company = details.company
  vacancy.addresses = details.address.isValid()
    ? [VacancyAddress.fromString(details.address.format())]
    : []
  vacancy.contact = contact
  vacancy.startDate = details.startDate.value
  vacancy.description = description
  vacancy.enriched = false
  vacancy.enrichmentDirty = true
  vacancy.activityHistory = [foundActivity]
  vacancy.active = true

  return { vacancy, hash, isNew: true }
}

function mergeWithExisting(
  existing: Vacancy,
  details: VacancyDetails,
  hash: string,
  foundActivity: FoundActivity,
  description: string,
): ProcessResult {
  const descriptionChanged = hasDescriptionChanged(
    description,
    existing.description,
  )

  existing.addresses = mergeAddresses(
    existing.addresses,
    details.address.isValid()
      ? [VacancyAddress.fromString(details.address.format())]
      : [],
  )
  existing.description = description || existing.description
  existing.enrichmentDirty = existing.enrichmentDirty || descriptionChanged
  if (hasContact(details.contact)) {
    existing.contact = details.contact
  }
  existing.startDate = details.startDate.value || existing.startDate
  existing.addActivity(foundActivity)
  existing.active = true

  return { vacancy: existing, hash, isNew: false }
}

interface ProcessResult {
  vacancy: Vacancy
  hash: string
  isNew: boolean
}

export function mergeAddresses(
  existing: VacancyAddress[],
  extracted: VacancyAddress[],
): VacancyAddress[] {
  const merged = [...existing]
  const mergedLower = merged.map((a) => a.format().toLowerCase())

  for (const newAddr of extracted) {
    const newLower = newAddr.format().toLowerCase()

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

### Step 2: Rewrite mark-unseen.ts

Replace `src/services/vacancy-processor/mark-unseen.ts`:

```ts
import { Vacancy } from "@/models/vacancy/index.js"
import type { NotFoundActivity } from "@/models/vacancy"

export function markUnseenAsGone(
  allVacancies: Vacancy[],
  seenHashes: Set<string>,
  crawlDate: string,
): MarkUnseenResult {
  let goneCount = 0
  const vacancies = allVacancies.map((v) => {
    if (seenHashes.has(v.hash) || !v.active) return v

    goneCount++
    const notFoundActivity: NotFoundActivity = {
      type: "not-found",
      date: crawlDate,
      site: "all",
      notes: "",
    }
    v.addActivity(notFoundActivity)
    v.active = false
    return v
  })

  return { vacancies, goneCount }
}

interface MarkUnseenResult {
  vacancies: Vacancy[]
  goneCount: number
}
```

### Step 3: Update index.ts export

`src/services/vacancy-processor/index.ts` already exports `process` and `mergeAddresses`. No change needed.

### Step 4: Commit

```bash
git add src/services/vacancy-processor/process.ts src/services/vacancy-processor/mark-unseen.ts
git commit -m "refactor(services/vacancy-processor): mutate Vacancy directly, use VacancyAddress"
```

---

## Task 9: Vacancy Processor Tests

**Files:**
- Modify: `src/services/vacancy-processor/process.test.ts`

### Step 1: Rewrite tests

Replace `src/services/vacancy-processor/process.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { process, markUnseenAsGone, vacancyHash } from "."
import { Vacancy } from "@/models/vacancy/index.js"
import type { VacancyDetails } from "@/plugins/job-site"
import { Address } from "@/models/common"
import { makeDateString } from "@/plugins/job-site"

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

function makeExisting(overrides: Record<string, unknown> = {}): Vacancy {
  return Vacancy.parse({
    hash: vacancyHash("Developer", "ACME"),
    title: "Developer",
    company: "ACME",
    addresses: [],
    contact: { name: "", email: "", phone: "" },
    activityHistory: [],
    active: true,
    enriched: true,
    enrichmentDirty: false,
    summary: "- Good match",
    ...overrides,
  })
}
```

### Step 2: Run tests

Run: `npm test -- src/services/vacancy-processor/process.test.ts`
Expected: PASS

### Step 3: Commit

```bash
git add src/services/vacancy-processor/process.test.ts
git commit -m "test(services/vacancy-processor): update tests for mutable Vacancy"
```

---

## Task 10: Vacancy Enricher

**Files:**
- Modify: `src/services/vacancy-enricher/vacancy-enricher.ts`
- Modify: `src/services/vacancy-enricher/commute.ts`
- Modify: `src/services/vacancy-enricher/extract-contact.ts`

### Step 1: Rewrite commute.ts

Replace `src/services/vacancy-enricher/commute.ts`:

```ts
import type { CommuteClient } from "@/plugins/commute"
import type { Vacancy } from "@/models/vacancy/index.js"
import { formatError } from "@/services/vacancy-scanner/index.js"

export async function computeCommutes(
  input: ComputeCommutesInput,
): Promise<ComputeCommutesOutput> {
  const { vacancies, origin, commuteClient, signal, onProgress } = input

  const needsCommute = vacancies.filter(
    (v) => v.active && v.addresses.some((addr) => !addr.commute),
  )

  let computedCount = 0
  let errorCount = 0
  const total = needsCommute.length

  for (const [index, vacancy] of needsCommute.entries()) {
    if (signal?.aborted) break

    onProgress?.(
      `Computing commute for "${vacancy.title}" (${index + 1}/${total})`,
      index + 1,
      total,
    )

    const result = await computeSingleVacancyCommute(
      vacancy,
      origin,
      commuteClient,
      signal,
    )
    errorCount += result.errors

    if (result.computed) {
      computedCount++
    }
  }

  const skippedCount = vacancies.length - needsCommute.length

  return { vacancies, computedCount, skippedCount, errorCount }
}

interface ComputeCommutesInput {
  vacancies: Vacancy[]
  origin: string
  commuteClient: CommuteClient
  signal?: AbortSignal
  onProgress?: (message: string, current: number, total: number) => void
}

interface ComputeCommutesOutput {
  vacancies: Vacancy[]
  computedCount: number
  skippedCount: number
  errorCount: number
}

async function computeSingleVacancyCommute(
  vacancy: Vacancy,
  origin: string,
  commuteClient: CommuteClient,
  signal?: AbortSignal,
) {
  let computed = false
  let errors = 0

  for (const address of vacancy.addresses) {
    if (address.commute) continue
    if (signal?.aborted) break

    try {
      address.commute = await commuteClient.getCommute(
        origin,
        address.format(),
        signal,
      )
      computed = true
    } catch (error) {
      rethrowAbortError(error)
      console.error(
        `Commute error for "${vacancy.title}" → "${address.format()}":`,
        formatError(error),
      )
      errors++
    }
  }

  return { computed, errors }
}

function rethrowAbortError(error: unknown): void {
  if (error instanceof DOMException && error.name === "AbortError") throw error
}
```

### Step 2: Rewrite extract-contact.ts

Replace `src/services/vacancy-enricher/extract-contact.ts`:

```ts
import { z } from "zod"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { VacancyContact } from "@/models/vacancy"
import { VacancyAddress } from "@/models/vacancy"
import type { LlmClient, TypedSchema } from "@/plugins/llm"
import { mergeAddresses } from "@/services/vacancy-processor/index.js"

export function needsContactExtraction(vacancy: Vacancy): boolean {
  if (!vacancy.description) return false

  const hasEmptyAddresses = vacancy.addresses.length === 0
  const contact = vacancy.contact
  const hasPartialContact =
    contact.name.trim().length === 0 ||
    contact.email.trim().length === 0 ||
    contact.phone.trim().length === 0

  return hasEmptyAddresses || hasPartialContact
}

export async function extractContactInfo(
  vacancy: Vacancy,
  llmClient: LlmClient,
  signal?: AbortSignal,
): Promise<ContactExtractionResult | undefined> {
  const prompt = buildContactExtractionPrompt(vacancy)
  const raw = await llmClient.completeJSON(
    prompt,
    512,
    EXTRACT_CONTACT_SCHEMA,
    signal,
  )

  const addresses = raw.addresses.map((s) => s.trim()).filter(Boolean)
  const contact = cleanContact(raw.contact)

  if (addresses.length === 0 && !hasContact(contact)) return undefined
  return { addresses, contact }
}

export function mergeContactInfo(
  vacancy: Vacancy,
  extracted: ContactExtractionResult,
): void {
  if (extracted.addresses.length > 0) {
    const newAddresses = extracted.addresses.map((a) =>
      VacancyAddress.fromString(a),
    )
    vacancy.addresses = mergeAddresses(vacancy.addresses, newAddresses)
  }
  if (hasContact(extracted.contact)) {
    vacancy.contact = { ...vacancy.contact, ...extracted.contact }
  }
}

interface ContactExtractionResult {
  addresses: string[]
  contact: VacancyContact
}

const RawContactSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
})

const RawContactResultSchema = z.object({
  addresses: z.array(z.string()),
  contact: RawContactSchema.nullable(),
})
type RawContactResult = z.infer<typeof RawContactResultSchema>

const EXTRACT_CONTACT_SCHEMA: TypedSchema<RawContactResult> = {
  schema: z.toJSONSchema(RawContactResultSchema),
  parse: (input: string) => RawContactResultSchema.parse(JSON.parse(input)),
}

function buildContactExtractionPrompt(vacancy: Vacancy): string {
  const existingAddresses =
    vacancy.addresses.length > 0
      ? vacancy.addresses.map((a) => a.format()).join(", ")
      : "Keine vorhanden"

  const contact = vacancy.contact
  const existingContact =
    [
      contact.name.trim().length > 0 ? `Name: ${contact.name}` : undefined,
      contact.email.trim().length > 0 ? `E-Mail: ${contact.email}` : undefined,
      contact.phone.trim().length > 0 ? `Telefon: ${contact.phone}` : undefined,
    ]
      .filter(Boolean)
      .join(", ") || "Keine vorhanden"

  return `Extrahieren Sie die Adress- und Kontaktdaten aus der folgenden Stellenausschreibung.

## Stellenausschreibung
Titel: ${vacancy.title}
Unternehmen: ${vacancy.company}

## Bereits bekannte Daten
Adressen: ${existingAddresses}
Kontakt: ${existingContact}

## Beschreibung
${vacancy.description}

Geben Sie NUR ein JSON-Objekt zurück (keine Markdown-Fences, kein zusätzlicher Text):
{"addresses": ["Vollständige Adresse 1"], "contact": {"name": "Ansprechpartner", "email": "email@example.com", "phone": "+49..."}}

Regeln:
- Geben Sie nur Adressen/Kontaktdaten an, die tatsächlich im Text vorkommen
- Wenn keine Adresse/kein Kontakt gefunden wird, geben Sie leere Arrays bzw. null zurück
- Bevorzugen Sie vollständige Adressen (Straße, PLZ, Stadt) gegenüber nur Stadtnamen
- contact darf null sein, wenn keine Kontaktdaten gefunden werden
- Einzelne Felder in contact dürfen weggelassen werden, wenn nicht vorhanden`
}

function cleanContact(
  contact: z.infer<typeof RawContactSchema> | null,
): VacancyContact {
  if (!contact) return { name: "", email: "", phone: "" }
  return {
    name: trimOrEmpty(contact.name),
    email: trimOrEmpty(contact.email),
    phone: trimOrEmpty(contact.phone),
  }
}

function trimOrEmpty(value?: string | null): string {
  return value?.trim() ?? ""
}

function hasContact(contact: VacancyContact): boolean {
  return (
    contact.name.trim().length > 0 ||
    contact.email.trim().length > 0 ||
    contact.phone.trim().length > 0
  )
}
```

### Step 3: Rewrite vacancy-enricher.ts

Replace `src/services/vacancy-enricher/vacancy-enricher.ts`:

```ts
import type { LlmClient } from "@/plugins/llm"
import type { CommuteClient } from "@/plugins/commute"
import type { Applicant } from "@/models/applicant"
import type { JobSearch } from "@/models/job-search"
import type { Vacancy } from "@/models/vacancy/index.js"
import { formatError } from "@/services/vacancy-scanner/index.js"
import { computeCommutes } from "./commute.js"
import { needsAssessment, assessVacancy } from "./assess.js"
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

    const commuted = await this.tryComputeCommute(
      vacancy,
      context.applicant,
      signal,
    )
    const { result, successful } = await this.tryLlmEnrich(
      commuted,
      context,
      signal,
    )
    if (successful) {
      result.enriched = true
      result.enrichmentDirty = false
    }
    return result
  }

  private async tryComputeCommute(
    vacancy: Vacancy,
    applicant: Applicant,
    signal?: AbortSignal,
  ): Promise<Vacancy> {
    const origin = resolveCommuteOrigin(applicant)
    if (!this.deps.commuteClient || !origin || vacancy.addresses.length === 0) {
      return vacancy
    }
    try {
      const result = await computeCommutes({
        vacancies: [vacancy],
        origin,
        commuteClient: this.deps.commuteClient,
        signal,
      })
      return result.vacancies[0]
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        throw error
      console.error(
        `Failed to compute commute for "${vacancy.title}":`,
        formatError(error),
      )
      return vacancy
    }
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
      context.jobSearch,
      this.deps.llmClient,
      signal,
    )

    if (assessmentResult) {
      vacancy.summary = assessmentResult.summary
      vacancy.matchScore = assessmentResult.matchScore
    }
    if (contactResult) {
      mergeContactInfo(vacancy, contactResult)
    }

    const anySucceeded = !!(assessmentResult || contactResult)
    const noneNeeded =
      !needsAssessment(vacancy) && !needsContactExtraction(vacancy)
    return { result: vacancy, successful: anySucceeded || noneNeeded }
  }
}

export interface EnrichContext {
  applicant: Applicant
  jobSearch: JobSearch
}

interface EnricherDeps {
  llmClient?: LlmClient
  commuteClient?: CommuteClient
}

function resolveCommuteOrigin(applicant: Applicant): string | undefined {
  const { street, zip, city } = applicant.personal.address
  const parts = [street, zip, city].filter((s) => s.trim().length > 0)
  if (parts.length === 0) return undefined
  return `${street}, ${zip} ${city}`
}

function runLlmEnrichment(
  vacancy: Vacancy,
  applicant: Applicant,
  jobSearch: JobSearch,
  llmClient: LlmClient,
  signal?: AbortSignal,
) {
  return Promise.all([
    needsAssessment(vacancy)
      ? assessVacancy(vacancy, applicant, jobSearch, llmClient, signal).catch(
          (error) => {
            if (error instanceof DOMException && error.name === "AbortError")
              throw error
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
          if (error instanceof DOMException && error.name === "AbortError")
            throw error
          console.error(
            `Failed to extract contact for "${vacancy.title}":`,
            formatError(error),
          )
          return
        })
      : undefined,
  ])
}
```

### Step 4: Commit

```bash
git add src/services/vacancy-enricher/
git commit -m "refactor(services/vacancy-enricher): mutate Vacancy directly, store commute on addresses"
```

---

## Task 11: Vacancy Enricher Tests

**Files:**
- Modify: `src/services/vacancy-enricher/vacancy-enricher.test.ts`

### Step 1: Rewrite tests

Replace `src/services/vacancy-enricher/vacancy-enricher.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest"
import { VacancyEnricher } from "."
import { Vacancy } from "@/models/vacancy/index.js"
import { Applicant } from "@/models/applicant"
import { Address } from "@/models/common"
import { JobSearch } from "@/models/job-search"
import type { LlmClient, TypedSchema } from "@/plugins/llm"
import type { CommuteClient } from "@/plugins/commute"

describe("VacancyEnricher", () => {
  it("sets enriched=true and enrichmentDirty=false after successful enrichment", async () => {
    const enricher = new VacancyEnricher({ llmClient: makeLlmClient() })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(result.enriched).toBe(true)
    expect(result.enrichmentDirty).toBe(false)
  })

  it("computes commute and sets summary when both clients configured", async () => {
    const { commuteClient, getCommuteMock } = makeCommuteClient()
    const llmClient = makeLlmClient()
    const enricher = new VacancyEnricher({ commuteClient, llmClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(getCommuteMock).toHaveBeenCalledWith(
      "Teststr. 1, 10115 Berlin",
      "Berlin",
      undefined,
    )
    expect(result.summary).toBe("- Good match")
    expect(result.matchScore).toBe("good")
    expect(result.enriched).toBe(true)
  })

  it("skips commute when no client configured", async () => {
    const enricher = new VacancyEnricher({ llmClient: makeLlmClient() })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(result.addresses.every((a) => !a.commute)).toBe(true)
  })

  it("keeps vacancies retryable when no LLM client is configured", async () => {
    const { commuteClient } = makeCommuteClient()
    const enricher = new VacancyEnricher({ commuteClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(result.summary).toBe("")
    expect(result.enriched).toBe(false)
    expect(result.enrichmentDirty).toBe(true)
  })

  it("continues enrichment after commute failure", async () => {
    const { commuteClient } = makeCommuteClient({ shouldFail: true })
    const llmClient = makeLlmClient()
    const enricher = new VacancyEnricher({ commuteClient, llmClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(result.addresses.every((a) => !a.commute)).toBe(true)
    expect(result.summary).toBe("- Good match")
    expect(result.enriched).toBe(true)
  })

  it("keeps enrichmentDirty=true after LLM failure so user can retry", async () => {
    const llmClient = makeLlmClient({ shouldFail: true })
    const enricher = new VacancyEnricher({ llmClient })
    const vacancy = makeVacancy()

    const result = await enricher.enrich(vacancy, {
      applicant: APPLICANT,
      jobSearch: JOB_SEARCH,
    })

    expect(result.summary).toBe("")
    expect(result.enriched).toBe(false)
    expect(result.enrichmentDirty).toBe(true)
  })

  it("derives commute origin from applicant address", async () => {
    const { commuteClient, getCommuteMock } = makeCommuteClient()
    const enricher = new VacancyEnricher({ commuteClient })
    const applicant = (() => {
      const a = new Applicant()
      a.personal.name = "Test User"
      a.personal.address = Address.parse({
        street: "Hauptstr. 5",
        zip: "80331",
        city: "München",
      })
      return a
    })()

    await enricher.enrich(makeVacancy(), {
      applicant,
      jobSearch: JOB_SEARCH,
    })

    expect(getCommuteMock).toHaveBeenCalledWith(
      "Hauptstr. 5, 80331 München",
      "Berlin",
      undefined,
    )
  })

  it("rejects with AbortError when signal is already aborted", async () => {
    const controller = new AbortController()
    controller.abort()

    const llmClient = makeLlmClient()
    const enricher = new VacancyEnricher({ llmClient })
    const vacancy = makeVacancy()

    await expect(
      enricher.enrich(
        vacancy,
        { applicant: APPLICANT, jobSearch: JOB_SEARCH },
        controller.signal,
      ),
    ).rejects.toThrow()
  })

  it("rejects with AbortError when signal is aborted during LLM call", async () => {
    const controller = new AbortController()

    const llmClient = makeLlmClient({ delayMs: 500 })
    const enricher = new VacancyEnricher({ llmClient })
    const vacancy = makeVacancy()

    const promise = enricher.enrich(
      vacancy,
      { applicant: APPLICANT, jobSearch: JOB_SEARCH },
      controller.signal,
    )

    setTimeout(() => controller.abort(), 10)

    await expect(promise).rejects.toThrow()
  })

  it("passes signal through to commute client", async () => {
    const controller = new AbortController()
    const signalCalls: (AbortSignal | undefined)[] = []

    const commuteClient: CommuteClient = {
      getCommute: (origin, destination, signal) => {
        signalCalls.push(signal)
        return Promise.resolve({
          distance: "10 km",
          durations: { morning: 20, day: 15, evening: 25 },
          fetchedAt: "2026-01-01",
        })
      },
      ping: () => Promise.resolve(true),
    }

    const enricher = new VacancyEnricher({ commuteClient })
    const vacancy = makeVacancy()

    await enricher.enrich(
      vacancy,
      { applicant: APPLICANT, jobSearch: JOB_SEARCH },
      controller.signal,
    )

    expect(signalCalls.length).toBeGreaterThanOrEqual(1)
    expect(signalCalls[0]).toBe(controller.signal)
  })
})

const APPLICANT: Applicant = (() => {
  const a = new Applicant()
  a.personal.name = "Test User"
  a.personal.address = Address.parse({
    street: "Teststr. 1",
    zip: "10115",
    city: "Berlin",
  })
  return a
})()

const JOB_SEARCH: JobSearch = (() => {
  const index = new JobSearch()
  index.searchTerm = ""
  index.radiusKm = 30
  index.mode = "employment"
  index.sources = []
  index.maxResultsPerSource = 0
  index.maxCommuteMinutes = 0
  index.notes = ""
  index.coverLetter = ""
  return index
})()

function makeVacancy(overrides: Record<string, unknown> = {}): Vacancy {
  return Vacancy.parse({
    hash: "abc123",
    title: "Developer",
    company: "ACME",
    description: "Some job description",
    addresses: ["Berlin"],
    contact: { name: "", email: "", phone: "" },
    startDate: "",
    activityHistory: [],
    active: true,
    enriched: false,
    enrichmentDirty: true,
    ...overrides,
  })
}

function makeLlmClient(
  options: { shouldFail?: boolean; delayMs?: number } = {},
): LlmClient {
  const delay = options.delayMs ?? 0

  const resolveWithSchema = <T>(
    schema: TypedSchema<T>,
    signal?: AbortSignal,
  ): Promise<T> => {
    if (delay > 0 && signal) {
      return new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"))
          return
        }
        const timer = setTimeout(() => {
          resolve(
            schema.parse(
              JSON.stringify({ summary: "- Good match", matchScore: "good" }),
            ),
          )
        }, delay)
        const onAbort = () => {
          clearTimeout(timer)
          reject(new DOMException("Aborted", "AbortError"))
        }
        signal.addEventListener("abort", onAbort, { once: true })
      })
    }
    return Promise.resolve(
      schema.parse(
        JSON.stringify({ summary: "- Good match", matchScore: "good" }),
      ),
    )
  }

  const completeJSON: LlmClient["completeJSON"] = options.shouldFail
    ? <T>(
        _prompt: string,
        _maxTokens: number,
        _schema: TypedSchema<T>,
        _signal?: AbortSignal,
      ): Promise<T> => Promise.reject(new Error("LLM unavailable"))
    : <T>(
        _prompt: string,
        _maxTokens: number,
        schema: TypedSchema<T>,
        signal?: AbortSignal,
      ): Promise<T> => resolveWithSchema(schema, signal)

  return {
    complete: vi.fn<LlmClient["complete"]>().mockResolvedValue(""),
    completeJSON,
    ping: vi.fn<LlmClient["ping"]>().mockResolvedValue(true),
  }
}

function makeCommuteClient(options: { shouldFail?: boolean } = {}) {
  const getCommuteMock = options.shouldFail
    ? vi
        .fn<CommuteClient["getCommute"]>()
        .mockRejectedValue(new Error("API down"))
    : vi
        .fn<CommuteClient["getCommute"]>()
        .mockImplementation(
          (_origin: string, _destination: string, _signal?: AbortSignal) =>
            Promise.resolve({
              distance: "10 km",
              durations: { morning: 20, day: 15, evening: 25 },
              fetchedAt: "2026-01-01",
            }),
        )

  const commuteClient: CommuteClient = {
    getCommute: getCommuteMock,
    ping: vi.fn<CommuteClient["ping"]>().mockResolvedValue(true),
  }

  return {
    commuteClient,
    getCommuteMock,
  }
}
```

### Step 2: Run tests

Run: `npm test -- src/services/vacancy-enricher/vacancy-enricher.test.ts`
Expected: PASS

### Step 3: Commit

```bash
git add src/services/vacancy-enricher/vacancy-enricher.test.ts
git commit -m "test(services/vacancy-enricher): update tests for mutable Vacancy"
```

---

## Task 12: Cover Letter Writer

**Files:**
- Modify: `src/services/cover-letter-writer/cover-letter-writer.ts`
- Modify: `src/services/cover-letter-writer/cover-letter-writer.test.ts`

### Step 1: Rewrite cover-letter-writer.ts

Replace the `generateForVacancy` method in `src/services/cover-letter-writer/cover-letter-writer.ts`:

```ts
  async generateForVacancy(
    jobSearchId: string,
    vacancyHash: string,
  ): Promise<{ content: string }> {
    ensureLlmAvailable(this.llm)

    const vacancy = this.vacancyRepo.findByHash(
      makeJobSearchID(jobSearchId),
      vacancyHash,
    )
    if (!vacancy) {
      throw new Error(`Vacancy "${vacancyHash}" not found`)
    }

    const { jobSearch, applicantId } = this.jobSearchRepo.load(
      makeJobSearchID(jobSearchId),
    )
    const applicant = this.applicantRepo.load(applicantId)
    const templateCoverLetter = jobSearch.coverLetter

    const content = await generatePersonalizedCoverLetter(
      applicant,
      vacancy,
      templateCoverLetter,
      jobSearch,
      this.llm,
    )

    const vacancies = this.vacancyRepo.allForJobSearch(makeJobSearchID(jobSearchId))
    const target = vacancies.find((v) => v.hash === vacancyHash)
    if (!target) throw new Error(`Vacancy "${vacancyHash}" not found`)
    target.coverLetter = content
    this.vacancyRepo.save(makeJobSearchID(jobSearchId), vacancies)

    return { content }
  }
```

### Step 2: Update test

The test in `cover-letter-writer.test.ts` doesn't test `generateForVacancy`, so no changes needed.

### Step 3: Commit

```bash
git add src/services/cover-letter-writer/cover-letter-writer.ts
git commit -m "refactor(services/cover-letter-writer): save cover letter via allForSearch + mutate"
```

---

## Task 13: Vacancy Scanner

**Files:**
- Modify: `src/services/vacancy-scanner/vacancy-scanner.ts`

### Step 1: Update repository calls

In `src/services/vacancy-scanner/vacancy-scanner.ts`, make these changes:

1. Replace `const existing = this.vacancyRepo.loadAll(searchId)` with:
```ts
const existing = this.vacancyRepo.allForJobSearch(searchId)
```

2. Replace `for (const v of existing.vacancies)` with:
```ts
for (const v of existing)
```

3. Replace all `this.vacancyRepo.save(searchId, [...existingByHash.values()], crawlDate)` with:
```ts
this.vacancyRepo.save(searchId, [...existingByHash.values()])
```

4. In `createEnrichQueue`, replace the `onEnriched` callback:
```ts
onEnriched: (enriched, hash) => {
  existingByHash.set(hash, enriched)
  services.vacancyRepo.save(makeJobSearchID(jobSearchId), [...existingByHash.values()])
  safeSend("job:progress", {
    jobSearchId,
    message: "",
    phase: "enrich",
    vacanciesUpdated: true,
  })
},
```

5. Remove the `latestCrawl` parameter from `createEnrichQueue` and from the call sites. The function signature becomes:
```ts
function createEnrichQueue(
  services: AppServices,
  jobSearchId: string,
  applicant: Applicant,
  jobSearch: JobSearch,
  existingByHash: Map<string, Vacancy>,
  safeSend: SafeSend,
  signal: AbortSignal,
): EnrichQueue {
```

And update the call in `scan()`:
```ts
const queue = createEnrichQueue(
  services,
  jobSearchId,
  applicant,
  jobSearch,
  existingByHash,
  safeSend,
  abortController.signal,
)
```

6. Remove the `latestCrawl` variable reads in `vacancies:re-enrich` and `vacancies:enrich-unenriched` in `ipc-vacancies.ts` (handled in next task).

7. In `scan()`, replace the final save:
```ts
this.vacancyRepo.save(searchId, finalVacancies)
```

### Step 2: Commit

```bash
git add src/services/vacancy-scanner/vacancy-scanner.ts
git commit -m "refactor(services/vacancy-scanner): use allForSearch, drop latestCrawl from save"
```

---

## Task 14: Enrich Queue Tests

**Files:**
- Modify: `src/services/vacancy-scanner/enrich-queue.test.ts`

### Step 1: Update makeVacancy helper and StubVacancyEnricher

Replace the `makeVacancy` function and `StubVacancyEnricher` class at the bottom of the file:

```ts
function makeVacancy(hash: string): Vacancy {
  return Vacancy.parse({
    hash,
    title: "Dev",
    company: "ACME",
    description: "",
    addresses: [],
    contact: { name: "", email: "", phone: "" },
    startDate: "",
    activityHistory: [],
    active: true,
    enriched: false,
    enrichmentDirty: true,
  })
}

function makeEnricher(delayMs = 0, shouldFail = false): VacancyEnricher {
  return new StubVacancyEnricher((vacancy) => {
    return new Promise<Vacancy>((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail) {
          reject(new Error("enrichment failed"))
        } else {
          vacancy.enriched = true
          vacancy.enrichmentDirty = false
          resolve(vacancy)
        }
      }, delayMs)
    })
  })
}

class StubVacancyEnricher extends VacancyEnricher {
  constructor(
    private readonly enrichImpl: (
      vacancy: Vacancy,
      context: EnrichContext,
    ) => Promise<Vacancy>,
  ) {
    super({})
  }

  override enrich(
    vacancy: Vacancy,
    context: EnrichContext,
    _signal?: AbortSignal,
  ): Promise<Vacancy> {
    return this.enrichImpl(vacancy, context)
  }
}
```

Also update the `SignalCapturingEnricher` in the same file:

```ts
class SignalCapturingEnricher extends VacancyEnricher {
  override enrich(
    vacancy: Vacancy,
    _context: EnrichContext,
    signal?: AbortSignal,
  ): Promise<Vacancy> {
    enrichCalls.push(signal)
    vacancy.enriched = true
    vacancy.enrichmentDirty = false
    return Promise.resolve(vacancy)
  }
}
```

### Step 2: Run tests

Run: `npm test -- src/services/vacancy-scanner/enrich-queue.test.ts`
Expected: PASS

### Step 3: Commit

```bash
git add src/services/vacancy-scanner/enrich-queue.test.ts
git commit -m "test(services/vacancy-scanner): update enrich-queue tests for mutable Vacancy"
```

---

## Task 15: IPC Vacancies Handler

**Files:**
- Modify: `src/app/ipc-vacancies.ts`

### Step 1: Rewrite handlers

Replace `src/app/ipc-vacancies.ts` entirely:

```ts
import type { Activity } from "@/models/vacancy"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { Applicant } from "@/models/applicant"
import type { JobSearch } from "@/models/job-search"
import type { AppServices } from "."
import { EnrichQueue } from "@/services/vacancy-scanner/index.js"
import type { IpcHandle, SafeSend } from "./ipc-handlers.js"
import { makeJobSearchID } from "@/models/job-search"

export function registerVacanciesHandlers(
  handle: IpcHandle,
  services: AppServices,
  safeSend: SafeSend,
): void {
  handle("job-searches:vacancies:list", (id: string) => {
    const vacancies = services.vacancyRepo.allForJobSearch(makeJobSearchID(id))
    const serialized = vacancies.map((v) => ({
      ...v,
      status: v.status,
      sources: v.sources,
    }))
    return {
      vacancies: serialized,
      totalCount: serialized.length,
    }
  })

  handle(
    "job-searches:vacancies:seed",
    (id: string, vacancies: Vacancy[]) => {
      services.vacancyRepo.save(makeJobSearchID(id), vacancies)
      return { ok: true as const, count: vacancies.length }
    },
  )

  handle("job-searches:vacancies:load", (id: string, hash: string) => {
    const vacancy = services.vacancyRepo.findByHash(makeJobSearchID(id), hash)
    if (!vacancy) {
      throw new Error(`Vacancy "${hash}" not found`)
    }
    return {
      ...vacancy,
      status: vacancy.status,
      sources: vacancy.sources,
    }
  })

  handle(
    "job-searches:vacancies:add-activity",
    (id: string, hash: string, activity: Activity) => {
      const vacancies = services.vacancyRepo.allForJobSearch(makeJobSearchID(id))
      const vacancy = vacancies.find((v) => v.hash === hash)
      if (!vacancy) throw new Error(`Vacancy "${hash}" not found`)
      vacancy.addActivity(activity)
      services.vacancyRepo.save(makeJobSearchID(id), vacancies)
      return { ok: true }
    },
  )

  handle(
    "vacancies:cover-letter:load",
    (jobSearchId: string, vacancyHash: string) => {
      const vacancy = services.vacancyRepo.findByHash(
        makeJobSearchID(jobSearchId),
        vacancyHash,
      )
      return { content: vacancy?.coverLetter ?? "" }
    },
  )

  handle(
    "vacancies:cover-letter:save",
    (jobSearchId: string, vacancyHash: string, content: string) => {
      const vacancies = services.vacancyRepo.allForJobSearch(
        makeJobSearchID(jobSearchId),
      )
      const vacancy = vacancies.find((v) => v.hash === vacancyHash)
      if (!vacancy) throw new Error(`Vacancy "${vacancyHash}" not found`)
      vacancy.coverLetter = content
      services.vacancyRepo.save(makeJobSearchID(jobSearchId), vacancies)
      return { ok: true }
    },
  )

  handle(
    "vacancies:cover-letter:generate",
    (jobSearchId: string, vacancyHash: string) =>
      services.coverLetterWriter.generateForVacancy(jobSearchId, vacancyHash),
  )

  handle("vacancies:re-enrich", async (jobSearchId: string, hash: string) => {
    const vacancy = services.vacancyRepo.findByHash(
      makeJobSearchID(jobSearchId),
      hash,
    )
    if (!vacancy) throw new Error(`Vacancy "${hash}" not found`)

    const { jobSearch, applicantId } = services.jobSearchRepo.load(
      makeJobSearchID(jobSearchId),
    )
    const applicant = services.applicantRepo.load(applicantId)

    vacancy.enrichmentDirty = true
    const enriched = await services.vacancyEnricher.enrich(vacancy, {
      applicant,
      jobSearch,
    })

    const allVacancies = services.vacancyRepo.allForJobSearch(
      makeJobSearchID(jobSearchId),
    )
    const updated = allVacancies.map((v) => (v.hash === hash ? enriched : v))
    services.vacancyRepo.save(makeJobSearchID(jobSearchId), updated)

    if (enriched.enrichmentDirty) {
      throw new Error(
        "Analyse fehlgeschlagen: Modell und API-Schlüssel in den Einstellungen überprüfen",
      )
    }

    return { ok: true }
  })

  handle("vacancies:enrich-unenriched", async (jobSearchId: string) => {
    if (batchEnrichAbortControllers.has(jobSearchId)) {
      throw new Error(`Batch enrichment already running for ${jobSearchId}`)
    }

    const abortController = new AbortController()
    batchEnrichAbortControllers.set(jobSearchId, abortController)

    const { jobSearch, applicantId } = services.jobSearchRepo.load(
      makeJobSearchID(jobSearchId),
    )
    const applicant = services.applicantRepo.load(applicantId)
    const vacancies = services.vacancyRepo.allForJobSearch(
      makeJobSearchID(jobSearchId),
    )
    const vacanciesNeedingEnrichment = vacancies.filter(
      (v) => !v.enriched || v.enrichmentDirty,
    )

    if (vacanciesNeedingEnrichment.length === 0) {
      batchEnrichAbortControllers.delete(jobSearchId)
      return { count: 0 }
    }

    const existingByHash = new Map(vacancies.map((v) => [v.hash, v]))

    try {
      const queue = createEnrichQueue(
        services,
        jobSearchId,
        applicant,
        jobSearch,
        existingByHash,
        safeSend,
        abortController.signal,
      )

      for (const vacancy of vacanciesNeedingEnrichment) {
        queue.submit(vacancy, vacancy.hash)
      }

      const aborted = await drainAndCheckAbort(queue)

      sendBatchEnrichDoneProgress(safeSend, jobSearchId, aborted)

      if (aborted) {
        return { count: 0, aborted: true }
      }

      const updatedVacancies = services.vacancyRepo.allForJobSearch(
        makeJobSearchID(jobSearchId),
      )
      const anyStillDirty = updatedVacancies.some(
        (vacancy) => vacancy.enrichmentDirty,
      )
      if (anyStillDirty) {
        throw new Error(
          "Analyse fehlgeschlagen: Modell und API-Schlüssel in den Einstellungen überprüfen",
        )
      }

      return { count: vacanciesNeedingEnrichment.length }
    } catch (error) {
      sendBatchEnrichDoneProgress(safeSend, jobSearchId, true)
      throw error
    } finally {
      batchEnrichAbortControllers.delete(jobSearchId)
    }
  })

  handle("vacancies:enrich:abort", (jobSearchId: string) => {
    const controller = batchEnrichAbortControllers.get(jobSearchId)
    if (!controller) return { aborted: false }
    controller.abort()
    return { aborted: true }
  })
}

function createEnrichQueue(
  services: AppServices,
  jobSearchId: string,
  applicant: Applicant,
  jobSearch: JobSearch,
  existingByHash: Map<string, Vacancy>,
  safeSend: SafeSend,
  signal: AbortSignal,
): EnrichQueue {
  return new EnrichQueue({
    enricher: services.vacancyEnricher,
    context: { applicant, jobSearch },
    onEnriched: (enriched, hash) => {
      existingByHash.set(hash, enriched)
      services.vacancyRepo.save(
        makeJobSearchID(jobSearchId),
        [...existingByHash.values()],
      )
      safeSend("job:progress", {
        jobSearchId,
        message: "",
        phase: "enrich",
        vacanciesUpdated: true,
      })
    },
    onError: (hash, error) => {
      console.error(`Batch enrichment failed for "${hash}":`, error)
    },
    onProgress: (event) => {
      safeSend("job:progress", {
        jobSearchId,
        message: `Analysiere ${event.completed}/${event.total}`,
        phase: "enrich",
        owner: "batch",
        enrichProgress: event,
      })
    },
    signal,
  })
}

async function drainAndCheckAbort(queue: EnrichQueue): Promise<boolean> {
  try {
    await queue.drain()
    return false
  } catch (error) {
    if (isAbortError(error)) {
      return true
    }
    throw error
  }
}

function sendBatchEnrichDoneProgress(
  safeSend: SafeSend,
  jobSearchId: string,
  aborted: boolean,
): void {
  safeSend("job:progress", {
    jobSearchId,
    message: aborted ? "Analyse abgebrochen" : "Analyse abgeschlossen",
    phase: "done",
    source: "enrich",
    owner: "batch",
  })
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

const batchEnrichAbortControllers = new Map<string, AbortController>()
```

### Step 2: Commit

```bash
git add src/app/ipc-vacancies.ts
git commit -m "refactor(app): update vacancy IPC handlers for mutable Vacancy, drop latestCrawl"
```

---

## Task 16: UI Data Layer

**Files:**
- Modify: `src/ui/data/job-searches.ts`
- Modify: `src/ui/data/index.ts`

### Step 1: Rewrite job-searches.ts

Replace `src/ui/data/job-searches.ts`:

```ts
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { JobSearch, JobSearchInfoSchema } from "@/models/job-search"
import type { Activity } from "@/models/vacancy"
import { Vacancy, VacancySerializedSchema } from "@/models/vacancy"
import { api } from "./internal/api"
import { jobSearchQueryKeys, invalidateQuery } from "./job-search-query-keys"

export function useJobSearchListView(applicantId?: string) {
  const query = useJobSearches(applicantId)
  return {
    ...query,
    data: query.data ?? EMPTY_JOB_SEARCH_LIST,
  }
}

export function useJobSearch(id: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.detail(id),
    queryFn: async () => {
      const response = await api().invoke("job-searches:load", id)
      const parsed = JobSearchLoadResponseSchema.parse(response)
      return {
        jobSearch: JobSearch.parse(parsed.jobSearch),
        applicantId: parsed.applicantId,
      }
    },
    enabled: !!id,
  })
}

export function useCreateJobSearch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      searchTerm: string
      applicantId: string
      searchMode?: string
    }) =>
      api().invoke(
        "job-searches:create",
        body.searchTerm,
        body.applicantId,
        body.searchMode,
      ),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.listRoot()),
  })
}

export function useJobSearchDraft(applicantId: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.draft(applicantId),
    queryFn: async () => {
      const raw = await api().invoke("job-searches:draft:load", applicantId)
      const parsed = JobSearchDraftResponseSchema.parse(raw)
      return { draft: parsed.draft ? JobSearch.parse(parsed.draft) : undefined }
    },
    enabled: !!applicantId,
  })
}

export function useSaveJobSearchDraft(applicantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draft: JobSearch) =>
      api().invoke("job-searches:draft:save", applicantId, draft),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.draft(applicantId)),
  })
}

export function useDeleteJobSearchDraft(applicantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api().invoke("job-searches:draft:delete", applicantId),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.draft(applicantId)),
  })
}

export function useFinalizeJobSearchDraft(applicantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      CreatedJobSearchIdSchema.parse(
        await api().invoke("job-searches:draft:finalize", applicantId),
      ),
    onSuccess: async ({ id }) => {
      await invalidateQuery(queryClient, jobSearchQueryKeys.draft(applicantId))
      await invalidateQuery(queryClient, jobSearchQueryKeys.list(applicantId))
      await invalidateQuery(queryClient, jobSearchQueryKeys.listRoot())
      await invalidateQuery(queryClient, jobSearchQueryKeys.detail(id))
      await invalidateQuery(queryClient, jobSearchQueryKeys.coverLetter(id))
    },
  })
}

export function useUpdateJobSearch(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: JobSearch) =>
      api().invoke("job-searches:save", id, data),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.detail(id)),
  })
}

export function useDeleteJobSearch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api().invoke("job-searches:delete", id),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.listRoot()),
  })
}

export function useJobSearchCoverLetter(id: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.coverLetter(id),
    queryFn: async () =>
      ContentSchema.parse(
        await api().invoke("job-searches:cover-letter:load", id),
      ),
    enabled: !!id,
  })
}

export function useUpdateJobSearchCoverLetter(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api().invoke("job-searches:cover-letter:save", id, content),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.coverLetter(id)),
  })
}

export function useGenerateCoverLetter(id: string) {
  return useMutation({
    mutationFn: async () =>
      ContentSchema.parse(
        await api().invoke("job-searches:cover-letter:generate", id),
      ),
  })
}

export function useGenerateDraftCoverLetter(applicantId: string) {
  return useMutation({
    mutationFn: async () =>
      ContentSchema.parse(
        await api().invoke(
          "job-searches:draft:cover-letter:generate",
          applicantId,
        ),
      ),
  })
}

export function useVacancyCoverLetter(id: string, hash: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.vacancyCoverLetter(id, hash),
    queryFn: async () =>
      ContentSchema.parse(
        await api().invoke("vacancies:cover-letter:load", id, hash),
      ),
    enabled: !!id && !!hash,
  })
}

export function useUpdateVacancyCoverLetter(id: string, hash: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api().invoke("vacancies:cover-letter:save", id, hash, content),
    onSuccess: () =>
      invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyCoverLetter(id, hash),
      ),
  })
}

export function useGenerateVacancyCoverLetter(id: string, hash: string) {
  return useMutation({
    mutationFn: async () =>
      ContentSchema.parse(
        await api().invoke("vacancies:cover-letter:generate", id, hash),
      ),
  })
}

export function useJobSearchVacancyListView(id: string) {
  const query = useJobSearchVacancies(id)
  return {
    ...query,
    data:
      query.data === undefined
        ? EMPTY_VACANCY_LIST
        : {
            vacancies: query.data.vacancies,
            totalCount: query.data.totalCount,
          },
  }
}

export function useJobSearchVacancy(id: string, hash: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.vacancyDetail(id, hash),
    queryFn: async () => {
      const raw = await api().invoke("job-searches:vacancies:load", id, hash)
      return Vacancy.parse(VacancySerializedSchema.parse(raw))
    },
    enabled: !!id && !!hash,
  })
}

export function useReEnrichVacancy(jobSearchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (hash: string) =>
      api().invoke("vacancies:re-enrich", jobSearchId, hash),
    onSuccess: () => {
      void invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyList(jobSearchId),
      )
      void invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyDetailRoot(jobSearchId),
      )
    },
  })
}

export function useEnrichAllUnenriched(jobSearchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api().invoke("vacancies:enrich-unenriched", jobSearchId),
    onSuccess: () =>
      invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(jobSearchId)),
  })
}

export function useAbortEnrichment(jobSearchId: string) {
  return useMutation({
    mutationFn: () => api().invoke("vacancies:enrich:abort", jobSearchId),
  })
}

export function useAddActivity(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ hash, activity }: { hash: string; activity: Activity }) =>
      api().invoke("job-searches:vacancies:add-activity", id, hash, activity),
    onSuccess: () => {
      void invalidateQuery(queryClient, jobSearchQueryKeys.vacancyList(id))
      void invalidateQuery(
        queryClient,
        jobSearchQueryKeys.vacancyDetailRoot(id),
      )
    },
  })
}

const EMPTY_VACANCY_LIST: VacancyListView = {
  vacancies: [],
  totalCount: 0,
}

const EMPTY_JOB_SEARCH_LIST: JobSearchListView = {
  jobSearches: [],
}

type VacancyListView = Readonly<{
  vacancies: Vacancy[]
  totalCount: number
}>

type JobSearchListView = Readonly<{
  jobSearches: import("@/models/job-search").JobSearchInfo[]
}>

function useJobSearches(applicantId?: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.list(applicantId),
    queryFn: async () =>
      JobSearchListResponseSchema.parse(
        await api().invoke("job-searches:list", applicantId),
      ),
  })
}

function useJobSearchVacancies(id: string) {
  return useQuery({
    queryKey: jobSearchQueryKeys.vacancyList(id),
    queryFn: async () => {
      const response = await api().invoke("job-searches:vacancies:list", id)
      const parsed = VacancyListResponseSchema.parse(response)
      return {
        vacancies: parsed.vacancies.map((v) => Vacancy.parse(v)),
        totalCount: parsed.totalCount,
      }
    },
    enabled: !!id,
  })
}

const JobSearchListResponseSchema = z.object({
  jobSearches: z.array(JobSearchInfoSchema),
})

const JobSearchLoadResponseSchema = z.object({
  jobSearch: z.unknown(),
  applicantId: z.string(),
})

const JobSearchDraftResponseSchema = z.object({
  draft: z.unknown().optional(),
})

const CreatedJobSearchIdSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
})

const ContentSchema = z.object({ content: z.string() })

const VacancyListResponseSchema = z.object({
  vacancies: z.array(VacancySerializedSchema),
  totalCount: z.number(),
})
```

### Step 2: Update ui/data/index.ts

Remove the `VacancyWithStatus` type export from `src/ui/data/index.ts`:

Replace the line:
```ts
  type VacancyWithStatus,
```
with nothing (delete it).

### Step 3: Commit

```bash
git add src/ui/data/job-searches.ts src/ui/data/index.ts
git commit -m "refactor(ui/data): use Vacancy class directly, drop VacancyWithStatus"
```

---

## Task 17: UI Components

**Files:**
- Modify: `src/ui/pages/job-search/views/vacancy-detail.tsx`
- Modify: `src/ui/pages/job-search/views/vacancy-card.tsx`
- Modify: `src/ui/pages/job-search/views/vacancy-commute-section.tsx`
- Modify: `src/ui/pages/job-search/views/vacancy-utilities.ts`
- Modify: `src/ui/pages/job-search/views/use-vacancy-filters.ts`
- Modify: `src/ui/pages/job-search/views/vacancy-list.tsx`

### Step 1: Update vacancy-detail.tsx

Replace the imports and type usages in `src/ui/pages/job-search/views/vacancy-detail.tsx`:

1. Remove `import type { VacancyWithStatus } from "@/ui/data"`
2. Add `import type { Vacancy } from "@/models/vacancy"`
3. Replace all `VacancyWithStatus` with `Vacancy`
4. Replace `data.addresses.join(" | ")` with `data.addresses.map((a) => a.format()).join(" | ")`
5. In `VacancyInfoCard`, change the `commute` prop to `addresses` and pass `data.addresses`

```tsx
<VacancyCommuteSection addresses={data.addresses} />
```

And update the `VacancyInfoCard` prop type:

```tsx
function VacancyInfoCard({
  data,
  enrichmentState,
}: {
  data: Pick<
    Vacancy,
    | "title"
    | "company"
    | "addresses"
    | "sources"
    | "contact"
    | "summary"
    | "description"
  >
  enrichmentState: EnrichmentState
}) {
```

And update the addresses rendering:

```tsx
{data.addresses.length > 0 && (
  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
    {data.addresses.map((a) => a.format()).join(" | ")}
  </p>
)}
```

Also update the `status` prop type in `VacancyEnrichmentHeader`:
```tsx
  status: Vacancy["status"]
```

### Step 2: Update vacancy-card.tsx

Replace `import type { VacancyWithStatus } from "@/ui/data"` with `import type { Vacancy } from "@/models/vacancy"`.

Replace all `VacancyWithStatus` with `Vacancy`.

Replace `v.addresses.join(" | ")` with `v.addresses.map((a) => a.format()).join(" | ")`.

### Step 3: Update vacancy-commute-section.tsx

Replace `src/ui/pages/job-search/views/vacancy-commute-section.tsx`:

```tsx
import type { VacancyAddress } from "@/models/vacancy"

export function VacancyCommuteSection({
  addresses,
}: {
  addresses: VacancyAddress[]
}) {
  const withCommute = addresses.filter((a) => a.commute)
  if (withCommute.length === 0) return

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Fahrtweg
      </h3>
      <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="font-medium">Adresse</div>
        <div className="font-medium">Morgens</div>
        <div className="font-medium">Tagsüber</div>
        <div className="font-medium">Entfernung</div>
        {withCommute.map((addr) => {
          const info = addr.commute
          if (!info) return null
          return (
            <div key={addr.format()} className="contents">
              <div>{addr.format()}</div>
              <div>{info.durations.morning} min</div>
              <div>{info.durations.day} min</div>
              <div>{info.distance}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### Step 4: Update vacancy-utilities.ts

Replace `src/ui/pages/job-search/views/vacancy-utilities.ts`:

```ts
import type { Vacancy } from "@/models/vacancy"
import type { SortKey } from "./filter-bar"

export function getCommuteSummary(vacancy: Vacancy): string | undefined {
  const withCommute = vacancy.addresses.filter((a) => a.commute)
  if (withCommute.length === 0) return undefined
  const first = withCommute[0].commute
  if (!first) return undefined
  return `${first.durations.morning} min (${first.distance})`
}

export function compareVacancies(
  sortBy: SortKey,
  a: Vacancy,
  b: Vacancy,
): number {
  switch (sortBy) {
    case "company": {
      return a.company.localeCompare(b.company)
    }
    case "commute": {
      return getCommuteMorningMinutes(a) - getCommuteMorningMinutes(b)
    }
    case "score": {
      const scoreA = MATCH_SCORE_ORDER.indexOf(a.matchScore)
      const scoreB = MATCH_SCORE_ORDER.indexOf(b.matchScore)
      return scoreA - scoreB
    }
    default: {
      return getLatestActivityDate(b).localeCompare(getLatestActivityDate(a))
    }
  }
}

export function getLatestActivityDate(
  vacancy: Pick<Vacancy, "activityHistory">,
): string {
  return vacancy.activityHistory.at(-1)?.date ?? ""
}

const MATCH_SCORE_ORDER = [
  "excellent",
  "good",
  "ok",
  "bad",
  "very-bad",
] as const

function getCommuteMorningMinutes(vacancy: Vacancy): number {
  const withCommute = vacancy.addresses.filter((a) => a.commute)
  if (withCommute.length === 0) return Number.POSITIVE_INFINITY
  const first = withCommute[0].commute
  if (!first) return Number.POSITIVE_INFINITY
  return first.durations.morning
}
```

### Step 5: Update use-vacancy-filters.ts

Replace `import type { VacancyWithStatus } from "@/ui/data"` with `import type { Vacancy } from "@/models/vacancy"`.

Replace both occurrences of `VacancyWithStatus[]` with `Vacancy[]`.

### Step 6: Update vacancy-list.tsx

Replace `import { type VacancyWithStatus } from "@/ui/data"` with `import type { Vacancy } from "@/models/vacancy"`.

Replace `VacancyWithStatus[]` with `Vacancy[]` in the `useEnrichControl` parameter.

### Step 7: Commit

```bash
git add src/ui/pages/job-search/views/
git commit -m "refactor(ui): update vacancy components for Vacancy class with VacancyAddress"
```

---

## Task 18: E2E Types

**Files:**
- Modify: `e2e/helpers/electron-api-helper.ts`
- Modify: `e2e/helpers/live-flow-helper.ts`

### Step 1: Update E2E types

In `e2e/helpers/electron-api-helper.ts`:

1. Remove `generatedAt` and `latestCrawl` from `E2eVacancyList`:
```ts
interface E2eVacancyList {
  vacancies: E2eVacancy[]
  totalCount: number
}
```

2. Update `E2eVacancy` to remove top-level `commute` and add `addresses`:
```ts
interface E2eVacancy {
  hash: string
  title: string
  company: string
  summary: string
  addresses: Array<{ street?: string; zip?: string; city?: string; commute?: { distance: string } }>
  sources: Array<{ site: string; url: string }>
}
```

### Step 2: Update live-flow-helper.ts

Replace commute checks in `e2e/helpers/live-flow-helper.ts`:

```ts
const hasCommute = vacancyList.vacancies.some(
  (vacancy) => vacancy.addresses.some((a) => a.commute),
)
```

And:
```ts
latestVacancyList.vacancies.map((vacancy) => ({
  hash: vacancy.hash,
  title: vacancy.title,
  hasSummary: vacancy.summary.trim().length > 0,
  hasCommute: vacancy.addresses.some((a) => a.commute),
})),
```

### Step 3: Commit

```bash
git add e2e/helpers/electron-api-helper.ts e2e/helpers/live-flow-helper.ts
git commit -m "refactor(e2e): update vacancy types for VacancyAddress and removed fields"
```

---

## Task 19: Final Verification

### Step 1: Run auto-fix

Run: `npm run fix`
Expected: Completes without unfixable errors.

### Step 2: Run all tests

Run: `npm test:all`
Expected: All unit, integration, and E2E tests pass.

### Step 3: Commit

```bash
git add .
git commit -m "chore: lint fixes after vacancy model refactor"
```

---

## Appendix: Cross-Reference Checklist

| Design Requirement | Task |
|---|---|
| Vacancy mutable class with `static parse` | Task 2 |
| `status` and `sources` as getters | Task 2 |
| `addActivity` method | Task 2 |
| `coverLetter` property | Task 2 |
| `VacancyAddress` extends `Address` | Task 1 |
| `commute` on `VacancyAddress` | Task 1, Task 10 |
| `urls` removed | Task 2, Task 8 |
| `matchScore` default `"unknown"` | Task 2 |
| Delete `VacancyDTO`, `VacancyWithStatus`, `resolveVacancy`, `schemas.ts` | Task 2 |
| Repository: `allForJobSearch`, `save` without `latestCrawl`, `findByHash` | Task 4, 5, 6 |
| Delete `addActivity`, `loadCoverLetter`, `saveCoverLetter` from repo | Task 4 |
| Delete `VacancyListOutput`, `output.ts` | Task 4 |
| SQLite migration: cover_letters → JSON, drop meta tables | Task 5 |
| Processor: mutate directly, `VacancyAddress` | Task 8 |
| Enricher: mutate directly, commute on addresses | Task 10 |
| Cover letter writer: mutate via `allForSearch` | Task 12 |
| IPC: serialize getters explicitly, drop `latestCrawl`/`generatedAt` | Task 15 |
| UI data layer: `Vacancy.parse` on receive | Task 16 |
| UI components: `Vacancy` type, `address.format()` | Task 17 |
| E2E: updated types | Task 18 |
