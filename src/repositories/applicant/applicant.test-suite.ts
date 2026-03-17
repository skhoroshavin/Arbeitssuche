import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Applicant } from "@/models/applicant/types.js";
import type { ApplicantRepository } from "./types.js";

export function makeSampleApplicant(id: string): Applicant {
  return {
    id,
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
  };
}

interface RepoFactory {
  createRepo: () => { repo: ApplicantRepository; teardown: () => void };
}

export function applicantRepositoryTests(name: string, factory: RepoFactory) {
  describe(name, () => {
    test("returns empty list initially", () => {
      const { repo, teardown } = factory.createRepo();
      assert.deepEqual(repo.list(), []);
      teardown();
    });

    test("create returns id + exists + load", () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("John Doe");
      assert.equal(typeof id, "string");
      assert.ok(id.length > 0);
      assert.equal(repo.exists(id), true);
      assert.equal(repo.exists("nobody"), false);
      const loaded = repo.load(id);
      assert.equal(loaded.id, id);
      assert.equal(loaded.personal.name, "John Doe");
      teardown();
    });

    test("save + load round-trips", async () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("John Doe");
      const sample = makeSampleApplicant(id);
      await repo.save(id, sample);
      const loaded = repo.load(id);
      assert.deepEqual(loaded, sample);
      teardown();
    });

    test("load returns a deep copy", async () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("John Doe");
      const sample = makeSampleApplicant(id);
      await repo.save(id, sample);
      const a = repo.load(id);
      const b = repo.load(id);
      assert.notEqual(a, b);
      a.personal.name = "mutated";
      assert.equal(repo.load(id).personal.name, "John Doe");
      teardown();
    });

    test("save throws for non-existent applicant", async () => {
      const { repo, teardown } = factory.createRepo();
      await assert.rejects(() =>
        repo.save("nope", makeSampleApplicant("nope")),
      );
      teardown();
    });

    test("delete removes applicant", () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("John Doe");
      assert.equal(repo.exists(id), true);
      repo.delete(id);
      assert.equal(repo.exists(id), false);
      teardown();
    });

    test("list returns all applicants", () => {
      const { repo, teardown } = factory.createRepo();
      const id1 = repo.create("Alice");
      const id2 = repo.create("Bob");
      const ids = repo.list().map((a: { id: string }) => a.id);
      assert.deepEqual(ids.sort(), [id1, id2].sort());
      teardown();
    });

    test("list includes name after save", async () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("John Doe");
      const data = repo.load(id);
      data.personal.name = "John Updated";
      await repo.save(id, data);
      const infos = repo.list();
      assert.equal(infos.length, 1);
      assert.equal(infos[0].name, "John Updated");
      teardown();
    });
  });
}
