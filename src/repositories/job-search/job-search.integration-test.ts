import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { JobSearch } from "@/models/job-search/types.js";
import {
  createStubJobSearchRepository,
  createSqliteJobSearchRepository,
} from "./index.js";
import { Database } from "@/repositories/database.js";

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
  };
}

let tmpDir: string;
let counter = 0;

before(() => {
  tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "job-search-integration-test-"),
  );
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const implementations = [
  {
    name: "StubJobSearchRepository",
    persistent: false,
    createRepo: (_id: string) => ({
      repo: createStubJobSearchRepository(),
      teardown: () => {},
    }),
  },
  {
    name: "SqliteJobSearchRepository",
    persistent: true,
    createRepo: (id: string) => {
      const db = Database.open(path.join(tmpDir, `${id}.db`));
      return {
        repo: createSqliteJobSearchRepository(db),
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
      const id = repo.create("Software Engineer", "john");
      assert.equal(typeof id, "string");
      assert.ok(id.length > 0);
      assert.equal(repo.exists(id), true);
      assert.equal(repo.exists("nope"), false);
      const loaded = repo.load(id);
      assert.equal(loaded.id, id);
      assert.equal(loaded.applicantId, "john");
      assert.equal(loaded.params.searchTerm, "Software Engineer");
      teardown();
    });

    test("save + load round-trips", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const id = repo.create("Software Engineer", "john");
      const sample = makeSampleJobSearch(id);
      await repo.save(id, sample);
      const loaded = repo.load(id);
      assert.deepEqual(loaded, sample);
      teardown();
    });

    test("load returns a deep copy", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const id = repo.create("Software Engineer", "john");
      const sample = makeSampleJobSearch(id);
      await repo.save(id, sample);
      const a = repo.load(id);
      const b = repo.load(id);
      assert.notEqual(a, b);
      a.params.searchTerm = "mutated";
      assert.equal(repo.load(id).params.searchTerm, "Software Engineer");
      teardown();
    });

    test("save throws for non-existent search", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      await assert.rejects(() =>
        repo.save("nope", makeSampleJobSearch("nope")),
      );
      teardown();
    });

    test("delete removes job search", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const id = repo.create("Software Engineer", "john");
      repo.delete(id);
      assert.equal(repo.exists(id), false);
      teardown();
    });

    test("list includes searchTerm after save", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const id = repo.create("Software Engineer", "john");
      const data = repo.load(id);
      data.params.searchTerm = "React Developer";
      await repo.save(id, data);
      const infos = repo.list();
      assert.equal(infos.length, 1);
      assert.equal(infos[0].searchTerm, "React Developer");
      teardown();
    });

    test("listByApplicant filters correctly", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const id1 = repo.create("Search 1", "john");
      repo.create("Search 2", "jane");
      const id3 = repo.create("Search 3", "john");
      const johns = repo.listByApplicant("john");
      assert.equal(johns.length, 2);
      assert.deepEqual(
        johns.map((j: { id: string }) => j.id).sort(),
        [id1, id3].sort(),
      );
      teardown();
    });

    test("cover letter CRUD", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const id = repo.create("Software Engineer", "john");
      assert.equal(repo.loadCoverLetter(id), undefined);
      const coverLetter =
        "Sehr geehrte Damen und Herren,\n\nIch bewerbe mich.\n\nMit freundlichen Grüßen\nJohn";
      await repo.saveCoverLetter(id, coverLetter);
      assert.equal(repo.loadCoverLetter(id), coverLetter);
      teardown();
    });

    test("application cover letter CRUD", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const id = repo.create("Software Engineer", "john");
      assert.equal(repo.loadApplicationCoverLetter(id, "hash1"), undefined);
      const content = "Sehr geehrte Damen und Herren,\n\nIch bewerbe mich.";
      await repo.saveApplicationCoverLetter(id, "hash1", content);
      assert.equal(repo.loadApplicationCoverLetter(id, "hash1"), content);
      teardown();
    });

    // --- Persistence (Sqlite only) ---

    if (impl.persistent) {
      test("saved job search survives new repository instance", async () => {
        const dbId = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(dbId);
        const id = repo1.create("Software Engineer", "john");
        const sample = makeSampleJobSearch(id);
        await repo1.save(id, sample);
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(dbId);
        assert.deepEqual(repo2.load(id), sample);
        t2();
      });

      test("cover letter persists across instances", async () => {
        const dbId = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(dbId);
        const id = repo1.create("Software Engineer", "john");
        const letter = "Sehr geehrte Damen und Herren,\n\nIch bewerbe mich.";
        await repo1.saveCoverLetter(id, letter);
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(dbId);
        assert.equal(repo2.loadCoverLetter(id), letter);
        t2();
      });

      test("application cover letter persists across instances", async () => {
        const dbId = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(dbId);
        const id = repo1.create("Software Engineer", "john");
        const content = "Application-specific cover letter.";
        await repo1.saveApplicationCoverLetter(id, "hash1", content);
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(dbId);
        assert.equal(repo2.loadApplicationCoverLetter(id, "hash1"), content);
        t2();
      });

      test("delete persists across instances", async () => {
        const dbId = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(dbId);
        const id = repo1.create("Software Engineer", "john");
        const sample = makeSampleJobSearch(id);
        await repo1.save(id, sample);
        repo1.delete(id);
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(dbId);
        assert.equal(repo2.exists(id), false);
        t2();
      });

      test("listByApplicant works across instances", async () => {
        const dbId = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(dbId);
        const id1 = repo1.create("Search 1", "john");
        repo1.create("Search 2", "jane");
        const id3 = repo1.create("Search 3", "john");
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(dbId);
        const johns = repo2.listByApplicant("john");
        assert.equal(johns.length, 2);
        assert.deepEqual(
          johns.map((j: { id: string }) => j.id).sort(),
          [id1, id3].sort(),
        );
        t2();
      });
    }
  });
}

// --- Stub-specific ---

test("StubJobSearchRepository initializes from provided data", () => {
  const sample = makeSampleJobSearch("s1");
  const repo = createStubJobSearchRepository({
    s1: { jobSearch: sample },
  });
  assert.equal(repo.exists("s1"), true);
  assert.equal(repo.load("s1").params.searchTerm, "Software Engineer");
});
