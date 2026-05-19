import { test, describe, expect } from "vitest"
import type { ApplicantRepository } from "."
import { createStubApplicantRepository } from "./stub"
import { createSqliteApplicantRepository } from "./sqlite"
import { Applicant } from "@/models/applicant"
import type { Applicant as ApplicantType } from "@/models/applicant"
import { makeApplicantID } from "@/models/applicant"
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
  const applicantId = makeApplicantID("1")
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
  const id1 = makeApplicantID("1")
  const id2 = makeApplicantID("2")
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
  const applicantId = makeApplicantID("1")
  const sample = makeSampleApplicant()
  repo1.save(applicantId, sample)
  repo1.delete(applicantId)
  t1()

  const { repo: repo2, teardown: t2 } = openDatabaseById(id)
  expect(() => repo2.load(applicantId)).toThrow()
  t2()
})

test("migrates v0.2.0 schema to current", () => {
  const id = nextId()
  const database = Database.open(pathForId(id))

  database.exec(`
    CREATE TABLE applicants (
      id TEXT PRIMARY KEY,
      name TEXT,
      data TEXT NOT NULL
    )
  `)
  database.exec(`
    CREATE TABLE applicant_draft (
      id INTEGER PRIMARY KEY CHECK(id=1),
      data TEXT,
      meaningful INTEGER
    )
  `)

  const oldData = JSON.stringify({
    id: "1",
    personal: { name: "Ada" },
    disclose: {
      birthdate: true,
      gender: false,
      address: false,
      hobbies: false,
    },
    experience: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    personalNotes: "",
  })
  database
    .prepare("INSERT INTO applicants (id, name, data) VALUES (?, ?, ?)")
    .run("1", "Ada", oldData)

  const repo = createSqliteApplicantRepository(database)

  const draftTable = database
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'applicant_draft'",
    )
    .get()
  expect(draftTable).toBeUndefined()

  const loaded = repo.load(makeApplicantID("1"))
  expect(loaded.personal.name).toBe("Ada")
  expect(loaded.personal.discloseBirthdate).toBe(true)
  expect(loaded.personal.email).toBe("")
  expect(loaded.personal.hobbies).toBe("")

  database.close()
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
      const id = makeApplicantID("1")
      const sample = makeSampleApplicant()
      repo.save(id, sample)
      const loaded = repo.load(id)
      expect(loaded).toEqual(sample)
      teardown()
    })

    test("delete removes applicant", () => {
      const { repo, teardown } = createRepo()
      const id = makeApplicantID("1")
      repo.save(id, makeSampleApplicant())
      repo.delete(id)
      expect(() => repo.load(id)).toThrow()
      teardown()
    })

    test("save/load draft round-trips and remains globally unique", () => {
      const { repo, teardown } = createRepo()
      const first = new Applicant()
      first.personal.name = "First"
      const second = new Applicant()
      second.personal.name = "Second"

      repo.saveDraft(first)
      repo.saveDraft(second)

      expect(repo.loadDraft()?.personal.name).toBe("Second")
      teardown()
    })

    test("blank draft is not meaningful", () => {
      const { repo, teardown } = createRepo()
      repo.saveDraft(new Applicant())
      expect(repo.loadDraft()).toBeUndefined()
      teardown()
    })

    test("edited draft is meaningful", () => {
      const { repo, teardown } = createRepo()
      const draft = new Applicant()
      draft.personal.name = "Ada Lovelace"

      repo.saveDraft(draft)

      expect(repo.loadDraft()?.personal.name).toBe("Ada Lovelace")
      teardown()
    })

    test("deleteDraft removes saved draft", () => {
      const { repo, teardown } = createRepo()
      repo.saveDraft(new Applicant())
      repo.deleteDraft()
      expect(repo.loadDraft()).toBeUndefined()
      teardown()
    })

    test("finalizeDraft creates persisted applicant and deletes draft", () => {
      const { repo, teardown } = createRepo()
      const draft = new Applicant()
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

function makeSampleApplicant(name = "John Doe"): ApplicantType {
  const a = new Applicant()
  a.personal.name = name
  a.personal.email = "john@example.com"
  a.personal.phone = "+49 123 456"
  a.personal.address = { street: "Main St 1", zip: "10115", city: "Berlin" }
  a.personal.hobbies = "cycling"
  a.experience = [
    {
      role: "Developer",
      company: "ACME",
      startDate: "2020-01",
      endDate: "2024-06",
      location: "Berlin",
      discloseDates: false,
      highlights: ["Built stuff"],
    },
  ]
  a.education = [
    {
      institution: "TU Berlin",
      course: "Computer Science",
      startDate: "2016-10",
      endDate: "2020-03",
      location: "",
      discloseDates: false,
      highlights: [],
    },
  ]
  a.skills = [{ name: "TypeScript" }]
  a.languages = [{ language: "German", level: "C2" }]
  a.certifications = [
    {
      name: "AWS",
      issuer: "Amazon",
      date: "2023-01",
      discloseDates: false,
      description: "",
    },
  ]
  a.personalNotes = "Prefers remote work"
  return a
}

function openDatabaseById(id: string) {
  const database = Database.open(pathForId(id))
  return {
    repo: createSqliteApplicantRepository(database),
    teardown: () => database.close(),
  }
}
