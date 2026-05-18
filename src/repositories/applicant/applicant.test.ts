import { test, describe, expect } from "vitest"
import type { ApplicantRepository } from "."
import { createStubApplicantRepository } from "./stub"
import { createSqliteApplicantRepository } from "./sqlite"
import { createDefaultApplicantDraftSnapshot } from "@/models/applicant"
import type { Applicant } from "@/models/applicant"
import { ApplicantID } from "@/models/applicant"
import { Database, setupTemporaryDatabaseDirectory } from "@/utils/index.js"

applicantRepositoryTests("StubApplicantRepository", () => ({
  repo: createStubApplicantRepository(),
  teardown: () => {},
}))

// --- SqliteApplicantRepository ---

const { nextId, pathForId } = setupTemporaryDatabaseDirectory("applicant-test")

applicantRepositoryTests("SqliteApplicantRepository", () =>
  openDatabaseById(nextId()),
)

// --- Persistence ---

test("saved applicant survives new repository instance", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const applicantId = ApplicantID("1")
  const sample = makeSampleApplicant()
  repo1.save(applicantId, sample)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(repo2.load(applicantId)).toEqual(sample)
  t2()
})

test("list works across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const id1 = ApplicantID("1")
  const id2 = ApplicantID("2")
  repo1.save(id1, makeSampleApplicant("Alice"))
  repo1.save(id2, makeSampleApplicant("Bob"))
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  const names = repo2.list().map((a) => a.displayName)
  expect(names.toSorted()).toEqual(["Alice", "Bob"])
  t2()
})

test("delete persists across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const applicantId = ApplicantID("1")
  const sample = makeSampleApplicant()
  repo1.save(applicantId, sample)
  repo1.delete(applicantId)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(() => repo2.load(applicantId)).toThrow()
  t2()
})

function applicantRepositoryTests(
  name: string,
  createRepo: () => { repo: ApplicantRepository; teardown: () => void },
) {
  describe(name, () => {
    test("returns empty list initially", () => {
      const { repo, teardown } = createRepo()
      expect(repo.list()).toEqual([])
      teardown()
    })

    test("save + load round-trips", () => {
      const { repo, teardown } = createRepo()
      const id = ApplicantID("1")
      const sample = makeSampleApplicant()
      repo.save(id, sample)
      const loaded = repo.load(id)
      expect(loaded).toEqual(sample)
      teardown()
    })

    test("save throws for non-existent applicant", () => {
      const { repo, teardown } = createRepo()
      expect(() => repo.save(ApplicantID("nope"), makeSampleApplicant())).toThrow()
      teardown()
    })

    test("delete removes applicant", () => {
      const { repo, teardown } = createRepo()
      const id = ApplicantID("1")
      repo.save(id, makeSampleApplicant())
      repo.delete(id)
      expect(() => repo.load(id)).toThrow()
      teardown()
    })

    test("save/load draft round-trips and remains globally unique", () => {
      const { repo, teardown } = createRepo()
      const first = createDefaultApplicantDraftSnapshot()
      first.personal.name = "First"
      const second = createDefaultApplicantDraftSnapshot()
      second.personal.name = "Second"

      repo.saveDraft(first)
      repo.saveDraft(second)

      expect(repo.loadDraft()?.personal.name).toBe("Second")
      teardown()
    })

    test("blank draft is not meaningful", () => {
      const { repo, teardown } = createRepo()
      repo.saveDraft(createDefaultApplicantDraftSnapshot())
      expect(repo.loadDraft()).toBeUndefined()
      teardown()
    })

    test("edited draft is meaningful", () => {
      const { repo, teardown } = createRepo()
      const draft = createDefaultApplicantDraftSnapshot()
      draft.personal.name = "Ada Lovelace"

      repo.saveDraft(draft)

      expect(repo.loadDraft()?.personal.name).toBe("Ada Lovelace")
      teardown()
    })

    test("deleteDraft removes saved draft", () => {
      const { repo, teardown } = createRepo()
      repo.saveDraft(createDefaultApplicantDraftSnapshot())
      repo.deleteDraft()
      expect(repo.loadDraft()).toBeUndefined()
      teardown()
    })

    test("finalizeDraft creates persisted applicant and deletes draft", () => {
      const { repo, teardown } = createRepo()
      const draft = createDefaultApplicantDraftSnapshot()
      draft.personal.name = "Ada Lovelace"
      draft.personal.email = "ada@example.com"

      repo.saveDraft(draft)

      const id = repo.finalizeDraft()

      expect(repo.load(id).personal.name).toBe("Ada Lovelace")
      expect(repo.load(id).personal.email).toBe("ada@example.com")
      expect(repo.loadDraft()).toBeUndefined()
      teardown()
    })
  })
}

function makeSampleApplicant(name = "John Doe"): Applicant {
  return {
    disclose: {
      birthdate: false,
      gender: false,
      address: false,
      hobbies: false,
    },
    personal: {
      name,
      email: "john@example.com",
      phone: "+49 123 456",
      address: { street: "Main St 1", zip: "10115", city: "Berlin" },
      hobbies: ["cycling"],
    },
    experience: [
      {
        role: "Developer",
        company: "ACME",
        startDate: "2020-01",
        endDate: "2024-06",
        location: "Berlin",
        highlights: ["Built stuff"],
      },
    ],
    education: [
      {
        institution: "TU Berlin",
        course: "Computer Science",
        startDate: "2016-10",
        endDate: "2020-03",
      },
    ],
    skills: [{ name: "TypeScript" }],
    languages: [{ language: "German", level: "C2" }],
    certifications: [{ name: "AWS", issuer: "Amazon", date: "2023-01" }],
    personalNotes: "Prefers remote work",
  }
}

function openDatabaseById(id: string) {
  const database = Database.open(pathForId(id))
  return {
    repo: createSqliteApplicantRepository(database),
    teardown: () => database.close(),
  }
}
