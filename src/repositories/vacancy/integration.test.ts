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
