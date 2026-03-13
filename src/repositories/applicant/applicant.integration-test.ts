import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Applicant } from "@/models/applicant/types.js";
import {
  createStubApplicantRepository,
  createSqliteApplicantRepository,
} from "./index.js";
import { Database } from "@/repositories/database.js";

function makeSampleApplicant(id: string): Applicant {
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

let tmpDir: string;
let counter = 0;

before(() => {
  tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "applicant-integration-test-"),
  );
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const implementations = [
  {
    name: "StubApplicantRepository",
    persistent: false,
    createRepo: (_id: string) => ({
      repo: createStubApplicantRepository(),
      teardown: () => {},
    }),
  },
  {
    name: "SqliteApplicantRepository",
    persistent: true,
    createRepo: (id: string) => {
      const db = Database.open(path.join(tmpDir, `${id}.db`));
      return {
        repo: createSqliteApplicantRepository(db),
        teardown: () => db.close(),
      };
    },
  },
];

for (const impl of implementations) {
  describe(impl.name, () => {
    // --- Behavior ---

    test("returns empty list initially", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      assert.deepEqual(repo.list(), []);
      teardown();
    });

    test("create returns id + exists + load", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
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
      const { repo, teardown } = impl.createRepo(String(counter++));
      const id = repo.create("John Doe");
      const sample = makeSampleApplicant(id);
      await repo.save(id, sample);
      const loaded = repo.load(id);
      assert.deepEqual(loaded, sample);
      teardown();
    });

    test("load returns a deep copy", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
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
      const { repo, teardown } = impl.createRepo(String(counter++));
      await assert.rejects(() =>
        repo.save("nope", makeSampleApplicant("nope")),
      );
      teardown();
    });

    test("delete removes applicant", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const id = repo.create("John Doe");
      assert.equal(repo.exists(id), true);
      repo.delete(id);
      assert.equal(repo.exists(id), false);
      teardown();
    });

    test("list returns all applicants", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const id1 = repo.create("Alice");
      const id2 = repo.create("Bob");
      const ids = repo.list().map((a: { id: string }) => a.id);
      assert.deepEqual(ids.sort(), [id1, id2].sort());
      teardown();
    });

    test("list includes name after save", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const id = repo.create("John Doe");
      const data = repo.load(id);
      data.personal.name = "John Updated";
      await repo.save(id, data);
      const infos = repo.list();
      assert.equal(infos.length, 1);
      assert.equal(infos[0].name, "John Updated");
      teardown();
    });

    // --- Persistence (Sqlite only) ---

    if (impl.persistent) {
      test("saved applicant survives new repository instance", async () => {
        const dbId = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(dbId);
        const id = repo1.create("John Doe");
        const sample = makeSampleApplicant(id);
        await repo1.save(id, sample);
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(dbId);
        assert.deepEqual(repo2.load(id), sample);
        t2();
      });

      test("list works across instances", async () => {
        const dbId = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(dbId);
        const id1 = repo1.create("Alice");
        const id2 = repo1.create("Bob");
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(dbId);
        const ids = repo2.list().map((a: { id: string }) => a.id);
        assert.deepEqual(ids.sort(), [id1, id2].sort());
        t2();
      });

      test("delete persists across instances", async () => {
        const dbId = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(dbId);
        const id = repo1.create("John Doe");
        const sample = makeSampleApplicant(id);
        await repo1.save(id, sample);
        repo1.delete(id);
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(dbId);
        assert.equal(repo2.exists(id), false);
        t2();
      });
    }
  });
}

// --- Stub-specific ---

test("StubApplicantRepository initializes from provided data", () => {
  const sample = makeSampleApplicant("john");
  const repo = createStubApplicantRepository({ john: sample });
  assert.equal(repo.exists("john"), true);
  assert.equal(repo.load("john").personal.name, "John Doe");
});
