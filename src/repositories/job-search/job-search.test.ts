import { test, describe, expect } from "vitest"
import {
  createStubJobSearchRepository,
  createSqliteJobSearchRepository,
} from "."
import { createDefaultJobSearchEditorSnapshot } from "@/models/job-search"
import type { JobSearch } from "@/models/job-search/types"
import type { JobSearchRepository } from "./types"
import {
  Database,
  setupTemporaryDatabaseDirectory,
} from "@/utils/node/index.js"

jobSearchRepositoryTests("StubJobSearchRepository", () => ({
  repo: createStubJobSearchRepository(),
  teardown: () => {},
}))

// --- Stub-specific ---

test("StubJobSearchRepository initializes from provided data", () => {
  const sample = makeSampleJobSearch("s1")
  const repo = createStubJobSearchRepository({
    s1: { jobSearch: sample },
  })
  expect(repo.exists("s1")).toBe(true)
  expect(repo.load("s1").params.searchTerm).toBe("Software Engineer")
})

// --- SqliteJobSearchRepository ---

const { nextId, pathForId } = setupTemporaryDatabaseDirectory("job-search-test")

jobSearchRepositoryTests("SqliteJobSearchRepository", () =>
  openDatabaseById(nextId()),
)

// --- Persistence ---

test("saved job search survives new repository instance", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const searchId = repo1.create("Software Engineer", "john")
  const sample = makeSampleJobSearch(searchId)
  repo1.save(searchId, sample)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(repo2.load(searchId)).toEqual(sample)
  t2()
})

test("cover letter persists across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const searchId = repo1.create("Software Engineer", "john")
  const letter = "Sehr geehrte Damen und Herren,\n\nIch bewerbe mich."
  repo1.saveApplicationCoverLetter(searchId, "", letter)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(repo2.loadApplicationCoverLetter(searchId, "")).toBe(letter)
  t2()
})

test("application cover letter persists across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const searchId = repo1.create("Software Engineer", "john")
  const content = "Application-specific cover letter."
  repo1.saveApplicationCoverLetter(searchId, "hash1", content)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(repo2.loadApplicationCoverLetter(searchId, "hash1")).toBe(content)
  t2()
})

test("delete persists across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const searchId = repo1.create("Software Engineer", "john")
  const sample = makeSampleJobSearch(searchId)
  repo1.save(searchId, sample)
  repo1.delete(searchId)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(repo2.exists(searchId)).toBe(false)
  t2()
})

test("listByApplicant works across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const id1 = repo1.create("Search 1", "john")
  repo1.create("Search 2", "jane")
  const id3 = repo1.create("Search 3", "john")
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  const johns = repo2.listByApplicant("john")
  expect(johns.length).toBe(2)
  expect(johns.map((index: { id: string }) => index.id).toSorted()).toEqual(
    [id1, id3].toSorted(),
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
      expect(repo.list()).toEqual([])
      teardown()
    })

    test("create returns id + exists + load", () => {
      const { repo, teardown } = createRepo()
      const id = repo.create("Software Engineer", "john")
      expect(typeof id).toBe("string")
      expect(id.length > 0).toBeTruthy()
      expect(repo.exists(id)).toBe(true)
      expect(repo.exists("nope")).toBe(false)
      expect(repo.load(id).params.searchTerm).toBe("Software Engineer")
      teardown()
    })

    test("save + load round-trips", () => {
      const { repo, teardown } = createRepo()
      const id = repo.create("Software Engineer", "john")
      const sample = makeSampleJobSearch(id)
      repo.save(id, sample)
      expect(repo.load(id)).toEqual(sample)
      teardown()
    })

    test("delete removes job search", () => {
      const { repo, teardown } = createRepo()
      const id = repo.create("Software Engineer", "john")
      repo.delete(id)
      expect(repo.exists(id)).toBe(false)
      teardown()
    })

    test("save/load draft round-trips and remains unique per applicant", () => {
      const { repo, teardown } = createRepo()
      const first = {
        ...createDefaultJobSearchEditorSnapshot(),
        params: {
          ...createDefaultJobSearchEditorSnapshot().params,
          searchTerm: "First",
        },
      }
      const second = {
        ...createDefaultJobSearchEditorSnapshot(),
        params: {
          ...createDefaultJobSearchEditorSnapshot().params,
          searchTerm: "Second",
        },
      }
      repo.saveDraft("john", first)
      repo.saveDraft("john", second)
      expect(repo.loadDraft("john")?.snapshot.params.searchTerm).toBe("Second")
      teardown()
    })

    test("blank draft is not meaningful", () => {
      const { repo, teardown } = createRepo()
      repo.saveDraft("john", createDefaultJobSearchEditorSnapshot())
      expect(repo.loadDraft("john")?.meaningful).toBe(false)
      teardown()
    })

    test("edited draft is meaningful", () => {
      const { repo, teardown } = createRepo()
      const draft = createDefaultJobSearchEditorSnapshot()
      draft.params.searchTerm = "React"
      repo.saveDraft("john", draft)
      expect(repo.loadDraft("john")?.meaningful).toBe(true)
      teardown()
    })

    test("deleteDraft removes saved draft", () => {
      const { repo, teardown } = createRepo()
      repo.saveDraft("john", createDefaultJobSearchEditorSnapshot())
      repo.deleteDraft("john")
      expect(repo.loadDraft("john")).toBeUndefined()
      teardown()
    })

    test("finalizeDraft creates persisted job search and deletes draft", () => {
      const { repo, teardown } = createRepo()
      const draft = createDefaultJobSearchEditorSnapshot()
      draft.params.searchTerm = "React Engineer"
      draft.coverLetterContent = "Template"
      repo.saveDraft("john", draft)

      const id = repo.finalizeDraft("john")

      expect(repo.load(id).params.searchTerm).toBe("React Engineer")
      expect(repo.loadApplicationCoverLetter(id, "")).toBe("Template")
      expect(repo.loadDraft("john")).toBeUndefined()
      teardown()
    })
  })
}

function makeSampleJobSearch(id: string): JobSearch {
  return {
    id,
    applicantId: "john",
    params: {
      searchTerm: "Software Engineer",
      radiusKm: 50,
      searchMode: "employment",
      sources: ["indeed", "xing"],
      maxResults: 100,
    },
    preferences: {
      maxDistanceKm: 30,
      maxCommuteMinutes: 45,
      freeText: ["Prefer startup culture"],
    },
  }
}

function openDatabaseById(id: string) {
  const database = Database.open(pathForId(id))
  return {
    repo: createSqliteJobSearchRepository(database),
    teardown: () => database.close(),
  }
}
