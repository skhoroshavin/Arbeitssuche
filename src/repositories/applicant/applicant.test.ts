import { test, describe, expect } from "vitest"
import {
  createStubApplicantRepository,
  createSqliteApplicantRepository,
} from "."
import type { Applicant } from "@/models/applicant/types"
import type { ApplicantRepository } from "./types"
import { Database } from "@/utils/index.js"
import { setupTemporaryDatabaseDirectory } from "@/utils/index.js"

applicantRepositoryTests("StubApplicantRepository", () => ({
  repo: createStubApplicantRepository(),
  teardown: () => {},
}))

// --- Stub-specific ---

test("StubApplicantRepository initializes from provided data", () => {
  const sample = makeSampleApplicant("john")
  const repo = createStubApplicantRepository({ john: sample })
  expect(repo.exists("john")).toBe(true)
  expect(repo.load("john").personal.name).toBe("John Doe")
})

// --- SqliteApplicantRepository ---

const { nextId, pathForId } = setupTemporaryDatabaseDirectory("applicant-test")

applicantRepositoryTests("SqliteApplicantRepository", () =>
  openDatabaseById(nextId()),
)

// --- Persistence ---

test("saved applicant survives new repository instance", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const applicantId = repo1.create("John Doe")
  const sample = makeSampleApplicant(applicantId)
  repo1.save(applicantId, sample)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(repo2.load(applicantId)).toEqual(sample)
  t2()
})

test("list works across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const id1 = repo1.create("Alice")
  const id2 = repo1.create("Bob")
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  const ids = repo2.list().map((a: { id: string }) => a.id)
  expect(ids.toSorted()).toEqual([id1, id2].toSorted())
  t2()
})

test("delete persists across instances", () => {
  const id = nextId()
  const { repo: repo1, teardown: t1 } = openDatabaseById(id)
  const applicantId = repo1.create("John Doe")
  const sample = makeSampleApplicant(applicantId)
  repo1.save(applicantId, sample)
  repo1.delete(applicantId)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(repo2.exists(applicantId)).toBe(false)
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

    test("create returns id + exists + load", () => {
      const { repo, teardown } = createRepo()
      const id = repo.create("John Doe")
      expect(typeof id).toBe("string")
      expect(id.length > 0).toBeTruthy()
      expect(repo.exists(id)).toBe(true)
      expect(repo.exists("nobody")).toBe(false)
      const loaded = repo.load(id)
      expect(loaded.id).toBe(id)
      expect(loaded.personal.name).toBe("John Doe")
      teardown()
    })

    test("save + load round-trips", () => {
      const { repo, teardown } = createRepo()
      const id = repo.create("John Doe")
      const sample = makeSampleApplicant(id)
      repo.save(id, sample)
      const loaded = repo.load(id)
      expect(loaded).toEqual(sample)
      teardown()
    })

    test("save throws for non-existent applicant", () => {
      const { repo, teardown } = createRepo()
      expect(() => repo.save("nope", makeSampleApplicant("nope"))).toThrow()
      teardown()
    })

    test("delete removes applicant", () => {
      const { repo, teardown } = createRepo()
      const id = repo.create("John Doe")
      expect(repo.exists(id)).toBe(true)
      repo.delete(id)
      expect(repo.exists(id)).toBe(false)
      teardown()
    })
  })
}

function makeSampleApplicant(id: string): Applicant {
  return {
    id,
    disclose: {
      birthdate: false,
      gender: false,
      address: false,
      hobbies: false,
    },
    personal: {
      name: "John Doe",
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
    personalNotes: ["Prefers remote work"],
  }
}

function openDatabaseById(id: string) {
  const database = Database.open(pathForId(id))
  return {
    repo: createSqliteApplicantRepository(database),
    teardown: () => database.close(),
  }
}
