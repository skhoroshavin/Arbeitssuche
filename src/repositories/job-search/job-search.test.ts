import { test, describe, expect } from "vitest"
import type { JobSearchRepository } from "."
import { createStubJobSearchRepository } from "./stub"
import { createSqliteJobSearchRepository } from "./sqlite"
import { createDefaultJobSearchEditorSnapshot } from "@/models/job-search"
import type { JobSearch } from "@/models/job-search"
import { JobSearchID } from "@/models/job-search"
import { ApplicantID } from "@/models/applicant"
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
  const searchId = JobSearchID("1")
  const applicantId = ApplicantID("john")
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
  const searchId = JobSearchID("1")
  const applicantId = ApplicantID("john")
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
  const applicantJohn = ApplicantID("john")
  const applicantJane = ApplicantID("jane")
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

function jobSearchRepositoryTests(
  name: string,
  createRepo: () => { repo: JobSearchRepository; teardown: () => void },
) {
  describe(name, () => {
    test("returns empty list initially", () => {
      const { repo, teardown } = createRepo()
      expect(repo.listByApplicant(ApplicantID("any"))).toEqual([])
      teardown()
    })

    test("create returns id + load", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      const id = repo.create("Software Engineer", applicantId)
      expect(typeof id.value).toBe("string")
      expect(id.value.length > 0).toBeTruthy()
      expect(repo.load(id).jobSearch.searchTerm).toBe("Software Engineer")
      teardown()
    })

    test("save + load round-trips", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      const id = repo.create("Software Engineer", applicantId)
      const sample = makeSampleJobSearch()
      repo.save(id, sample)
      expect(repo.load(id).jobSearch).toEqual(sample)
      teardown()
    })

    test("delete removes job search", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      const id = repo.create("Software Engineer", applicantId)
      repo.delete(id)
      expect(() => repo.load(id)).toThrow()
      teardown()
    })

    test("save/load draft round-trips and remains unique per applicant", () => {
      const { repo, teardown } = createRepo()
      const first = {
        ...createDefaultJobSearchEditorSnapshot(),
        searchTerm: "First",
      }
      const second = {
        ...createDefaultJobSearchEditorSnapshot(),
        searchTerm: "Second",
      }
      const applicantId = ApplicantID("john")
      repo.saveDraft(applicantId, first)
      repo.saveDraft(applicantId, second)
      expect(repo.loadDraft(applicantId)?.searchTerm).toBe("Second")
      teardown()
    })

    test("blank draft is not meaningful", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      repo.saveDraft(applicantId, createDefaultJobSearchEditorSnapshot())
      expect(repo.loadDraft(applicantId)).toBeUndefined()
      teardown()
    })

    test("edited draft is meaningful", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      const draft = createDefaultJobSearchEditorSnapshot()
      draft.searchTerm = "React"
      repo.saveDraft(applicantId, draft)
      expect(repo.loadDraft(applicantId)?.searchTerm).toBe("React")
      teardown()
    })

    test("deleteDraft removes saved draft", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      repo.saveDraft(applicantId, createDefaultJobSearchEditorSnapshot())
      repo.deleteDraft(applicantId)
      expect(repo.loadDraft(applicantId)).toBeUndefined()
      teardown()
    })

    test("finalizeDraft creates persisted job search and deletes draft", () => {
      const { repo, teardown } = createRepo()
      const applicantId = ApplicantID("john")
      const draft = createDefaultJobSearchEditorSnapshot()
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

function makeSampleJobSearch(): JobSearch {
  return {
    searchTerm: "Software Engineer",
    radiusKm: 50,
    mode: "employment",
    sources: [{ value: "indeed" }, { value: "xing" }],
    maxResultsPerSource: 100,
    maxCommuteMinutes: 45,
    notes: "Prefer startup culture",
    coverLetter: "",
  }
}

function openDatabaseById(id: string) {
  const database = Database.open(pathForId(id))
  return {
    repo: createSqliteJobSearchRepository(database),
    teardown: () => database.close(),
  }
}
