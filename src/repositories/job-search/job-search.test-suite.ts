import { test, describe, expect } from "vitest";
import type { JobSearch } from "@/models/job-search/types";
import type { JobSearchRepository } from "./types";

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
      expect(repo.list()).toEqual([]);
      teardown();
    });

    test("create returns id + exists + load", () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("Software Engineer", "john");
      expect(typeof id).toBe("string");
      expect(id.length > 0).toBeTruthy();
      expect(repo.exists(id)).toBe(true);
      expect(repo.exists("nope")).toBe(false);
      const loaded = repo.load(id);
      expect(loaded.id).toBe(id);
      expect(loaded.applicantId).toBe("john");
      expect(loaded.params.searchTerm).toBe("Software Engineer");
      teardown();
    });

    test("save + load round-trips", async () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("Software Engineer", "john");
      const sample = makeSampleJobSearch(id);
      await repo.save(id, sample);
      const loaded = repo.load(id);
      expect(loaded).toEqual(sample);
      teardown();
    });

    test("load returns a deep copy", async () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("Software Engineer", "john");
      const sample = makeSampleJobSearch(id);
      await repo.save(id, sample);
      const a = repo.load(id);
      const b = repo.load(id);
      expect(a).not.toBe(b);
      a.params.searchTerm = "mutated";
      expect(repo.load(id).params.searchTerm).toBe("Software Engineer");
      teardown();
    });

    test("save throws for non-existent search", async () => {
      const { repo, teardown } = factory.createRepo();
      await expect(() =>
        repo.save("nope", makeSampleJobSearch("nope")),
      ).rejects.toThrow();
      teardown();
    });

    test("delete removes job search", () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("Software Engineer", "john");
      repo.delete(id);
      expect(repo.exists(id)).toBe(false);
      teardown();
    });

    test("list includes searchTerm after save", async () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("Software Engineer", "john");
      const data = repo.load(id);
      data.params.searchTerm = "React Developer";
      await repo.save(id, data);
      const infos = repo.list();
      expect(infos.length).toBe(1);
      expect(infos[0].searchTerm).toBe("React Developer");
      teardown();
    });

    test("listByApplicant filters correctly", () => {
      const { repo, teardown } = factory.createRepo();
      const id1 = repo.create("Search 1", "john");
      repo.create("Search 2", "jane");
      const id3 = repo.create("Search 3", "john");
      const johns = repo.listByApplicant("john");
      expect(johns.length).toBe(2);
      expect(johns.map((j: { id: string }) => j.id).sort()).toEqual(
        [id1, id3].sort(),
      );
      teardown();
    });

    test("cover letter CRUD", async () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("Software Engineer", "john");
      expect(repo.loadCoverLetter(id)).toBe(undefined);
      const coverLetter =
        "Sehr geehrte Damen und Herren,\n\nIch bewerbe mich.\n\nMit freundlichen Grüßen\nJohn";
      await repo.saveCoverLetter(id, coverLetter);
      expect(repo.loadCoverLetter(id)).toBe(coverLetter);
      teardown();
    });

    test("application cover letter CRUD", async () => {
      const { repo, teardown } = factory.createRepo();
      const id = repo.create("Software Engineer", "john");
      expect(repo.loadApplicationCoverLetter(id, "hash1")).toBe(undefined);
      const content = "Sehr geehrte Damen und Herren,\n\nIch bewerbe mich.";
      await repo.saveApplicationCoverLetter(id, "hash1", content);
      expect(repo.loadApplicationCoverLetter(id, "hash1")).toBe(content);
      teardown();
    });
  });
}
