import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { JobSearch } from "@/models/job-search/types.js";
import type { JobSearchRepository } from "./types.js";

export function makeSampleJobSearch(id: string): JobSearch {
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

interface RepoFactory {
  createRepo: () => { repo: JobSearchRepository; teardown: () => void };
}

export function jobSearchRepositoryTests(name: string, factory: RepoFactory) {
  describe(name, () => {
    test("returns empty list initially", () => {
      const { repo, teardown } = factory.createRepo();
      assert.deepEqual(repo.list(), []);
      teardown();
    });

    test("create returns id + exists + load", () => {
      const { repo, teardown } = factory.createRepo();
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
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("Software Engineer", "john");
      const sample = makeSampleJobSearch(id);
      await repo.save(id, sample);
      const loaded = repo.load(id);
      assert.deepEqual(loaded, sample);
      teardown();
    });

    test("load returns a deep copy", async () => {
      const { repo, teardown } = factory.createRepo();
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
      const { repo, teardown } = factory.createRepo();
      await assert.rejects(() =>
        repo.save("nope", makeSampleJobSearch("nope")),
      );
      teardown();
    });

    test("delete removes job search", () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("Software Engineer", "john");
      repo.delete(id);
      assert.equal(repo.exists(id), false);
      teardown();
    });

    test("list includes searchTerm after save", async () => {
      const { repo, teardown } = factory.createRepo();
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
      const { repo, teardown } = factory.createRepo();
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
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("Software Engineer", "john");
      assert.equal(repo.loadCoverLetter(id), undefined);
      const coverLetter =
        "Sehr geehrte Damen und Herren,\n\nIch bewerbe mich.\n\nMit freundlichen Grüßen\nJohn";
      await repo.saveCoverLetter(id, coverLetter);
      assert.equal(repo.loadCoverLetter(id), coverLetter);
      teardown();
    });

    test("application cover letter CRUD", async () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("Software Engineer", "john");
      assert.equal(repo.loadApplicationCoverLetter(id, "hash1"), undefined);
      const content = "Sehr geehrte Damen und Herren,\n\nIch bewerbe mich.";
      await repo.saveApplicationCoverLetter(id, "hash1", content);
      assert.equal(repo.loadApplicationCoverLetter(id, "hash1"), content);
      teardown();
    });
  });
}
