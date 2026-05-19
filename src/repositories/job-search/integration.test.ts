import { test, describe, expect } from "vitest"
import type { JobSearchRepository } from "."
import { createStubJobSearchRepository } from "./stub"
import { createSqliteJobSearchRepository } from "./sqlite"
import { JobSearch } from "@/models/job-search"
import type { JobSearch as JobSearchType } from "@/models/job-search"
import { makeJobSearchID } from "@/models/job-search"
import { makeApplicantID } from "@/models/applicant"
import { Database, setupTemporaryDatabaseDirectory } from "@/utils/index.js"

jobSearchRepositoryTests("StubJobSearchRepository", () => ({
  repo: createStubJobSearchRepository(),
  teardown: () => {},
}))

// --- SqliteJobSearchRepository ---

const { nextId, pathForId } = setupTemporaryDatabaseDirectory("job-search-test")

jobSearchRepositoryTests("SqliteJobSearchRepository", () =>
  openDatabaseById(nextId()),
)

// --- Persistence ---

test("saved job search survives new repository instance", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const searchId = makeJobSearchID("1")
  const applicantId = makeApplicantID("john")
  const sample = makeSampleJobSearch()
  repo1.create("Software Engineer", applicantId)
  repo1.save(searchId, sample)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(repo2.load(searchId).jobSearch).toEqual(sample)
  t2()
})

test("delete persists across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const searchId = makeJobSearchID("1")
  const applicantId = makeApplicantID("john")
  repo1.create("Software Engineer", applicantId)
  const sample = makeSampleJobSearch()
  repo1.save(searchId, sample)
  repo1.delete(searchId)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(() => repo2.load(searchId)).toThrow()
  t2()
})

test("listByApplicant works across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const applicantJohn = makeApplicantID("john")
  const applicantJane = makeApplicantID("jane")
  const id1 = repo1.create("Search 1", applicantJohn)
  repo1.create("Search 2", applicantJane)
  const id3 = repo1.create("Search 3", applicantJohn)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  const johns = repo2.listByApplicant(applicantJohn)
  expect(johns.length).toBe(2)
  expect(johns.map((info) => info.id.value).toSorted()).toEqual(
    [id1.value, id3.value].toSorted(),
  )
  t2()
})

test("migrates v0.2.0 schema to current", () => {
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
    CREATE TABLE cover_letters (
      job_search_id TEXT NOT NULL,
      vacancy_hash TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      PRIMARY KEY (job_search_id, vacancy_hash)
    )
  `)
  database.exec(`
    CREATE TABLE job_search_drafts (
      applicant_id TEXT PRIMARY KEY,
      data TEXT,
      meaningful INTEGER
    )
  `)

  const oldData = JSON.stringify({
    id: "1",
    applicantId: "ada",
    searchTerm: "React",
    mode: "employment",
    sources: [],
    maxResultsPerSource: 0,
    maxCommuteMinutes: 0,
    notes: "",
    coverLetter: "",
  })
  database
    .prepare(
      "INSERT INTO job_searches (id, applicant_id, search_term, data) VALUES (?, ?, ?, ?)",
    )
    .run("1", "ada", "React", oldData)
  database
    .prepare(
      "INSERT INTO cover_letters (job_search_id, vacancy_hash, content) VALUES (?, ?, ?)",
    )
    .run("1", "", "default letter")

  const repo = createSqliteJobSearchRepository(database)

  const draftTable = database
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'job_search_drafts'",
    )
    .get()
  expect(draftTable).toBeUndefined()

  const loaded = repo.load(makeJobSearchID("1"))
  expect(loaded.jobSearch.searchTerm).toBe("React")
  expect(loaded.jobSearch.coverLetter).toBe("")

  const defaultCoverLetter = database
    .prepare("SELECT 1 FROM cover_letters WHERE vacancy_hash = ''")
    .get()
  expect(defaultCoverLetter).toBeUndefined()

  database.close()
})

function jobSearchRepositoryTests(
  name: string,
  createRepo: () => { repo: JobSearchRepository; teardown: () => void },
) {
  describe(name, () => {
    test("returns empty list initially", () => {
      const { repo, teardown } = createRepo()
      expect(repo.listByApplicant(makeApplicantID("any"))).toEqual([])
      teardown()
    })

    test("create returns id + load", () => {
      const { repo, teardown } = createRepo()
      const applicantId = makeApplicantID("john")
      const id = repo.create("Software Engineer", applicantId)
      expect(typeof id.value).toBe("string")
      expect(id.value.length > 0).toBeTruthy()
      expect(repo.load(id).jobSearch.searchTerm).toBe("Software Engineer")
      teardown()
    })

    test("save + load round-trips", () => {
      const { repo, teardown } = createRepo()
      const applicantId = makeApplicantID("john")
      const id = repo.create("Software Engineer", applicantId)
      const sample = makeSampleJobSearch()
      repo.save(id, sample)
      expect(repo.load(id).jobSearch).toEqual(sample)
      teardown()
    })

    test("delete removes job search", () => {
      const { repo, teardown } = createRepo()
      const applicantId = makeApplicantID("john")
      const id = repo.create("Software Engineer", applicantId)
      repo.delete(id)
      expect(() => repo.load(id)).toThrow()
      teardown()
    })

    test("save/load draft round-trips and remains unique per applicant", () => {
      const { repo, teardown } = createRepo()
      const first = new JobSearch()
      first.searchTerm = "First"
      const second = new JobSearch()
      second.searchTerm = "Second"
      const applicantId = makeApplicantID("john")
      repo.saveDraft(applicantId, first)
      repo.saveDraft(applicantId, second)
      expect(repo.loadDraft(applicantId)?.searchTerm).toBe("Second")
      teardown()
    })

    test("blank draft is not meaningful", () => {
      const { repo, teardown } = createRepo()
      const applicantId = makeApplicantID("john")
      repo.saveDraft(applicantId, new JobSearch())
      expect(repo.loadDraft(applicantId)).toBeUndefined()
      teardown()
    })

    test("edited draft is meaningful", () => {
      const { repo, teardown } = createRepo()
      const applicantId = makeApplicantID("john")
      const draft = new JobSearch()
      draft.searchTerm = "React"
      repo.saveDraft(applicantId, draft)
      expect(repo.loadDraft(applicantId)?.searchTerm).toBe("React")
      teardown()
    })

    test("deleteDraft removes saved draft", () => {
      const { repo, teardown } = createRepo()
      const applicantId = makeApplicantID("john")
      repo.saveDraft(applicantId, new JobSearch())
      repo.deleteDraft(applicantId)
      expect(repo.loadDraft(applicantId)).toBeUndefined()
      teardown()
    })

    test("finalizeDraft creates persisted job search and deletes draft", () => {
      const { repo, teardown } = createRepo()
      const applicantId = makeApplicantID("john")
      const draft = new JobSearch()
      draft.searchTerm = "React Engineer"
      draft.coverLetter = "Template"
      repo.saveDraft(applicantId, draft)

      const id = repo.finalizeDraft(applicantId)

      expect(repo.load(id).jobSearch.searchTerm).toBe("React Engineer")
      expect(repo.load(id).jobSearch.coverLetter).toBe("Template")
      expect(repo.loadDraft(applicantId)).toBeUndefined()
      teardown()
    })
  })
}

function makeSampleJobSearch(): JobSearchType {
  const index = new JobSearch()
  index.searchTerm = "Software Engineer"
  index.radiusKm = 50
  index.mode = "employment"
  index.sources = [{ value: "indeed" }, { value: "xing" }]
  index.maxResultsPerSource = 100
  index.maxCommuteMinutes = 45
  index.notes = "Prefer startup culture"
  index.coverLetter = ""
  return index
}

function openDatabaseById(id: string) {
  const database = Database.open(pathForId(id))
  return {
    repo: createSqliteJobSearchRepository(database),
    teardown: () => database.close(),
  }
}
