import { test, describe, expect } from "vitest";
import { Vacancy } from "@/models/vacancy/vacancy";
import type { VacancyDTO, Activity } from "@/models/vacancy/types";
import type { VacancyRepository } from "./types";

export function makeVacancy(overrides: Partial<VacancyDTO> = {}): Vacancy {
  return new Vacancy({
    hash: "abc123",
    title: "Developer",
    company: "ACME",
    urls: ["https://example.com/job/1"],
    addresses: ["Berlin"],
    descriptionChanged: false,
    activityHistory: [],
    active: true,
    ...overrides,
  });
}

interface RepoFactory {
  createRepo: () => { repo: VacancyRepository; teardown: () => void };
}

export function vacancyRepositoryTests(name: string, factory: RepoFactory) {
  describe(name, () => {
    test("returns undefined for missing job search", () => {
      const { repo, teardown } = factory.createRepo();
      expect(repo.loadAll("nope")).toBe(undefined);
      teardown();
    });

    test("save + loadAll round-trips", () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      const output = repo.loadAll("s1");
      expect(output!.vacancies.length).toBe(1);
      expect(output!.latestCrawl).toBe("2026-01-01.yaml");
      expect(output!.vacancies[0].hash).toBe("abc123");
      teardown();
    });

    test("count matches vacancies length", () => {
      const { repo, teardown } = factory.createRepo();
      const v1 = makeVacancy({ hash: "h1" });
      const v2 = makeVacancy({ hash: "h2" });
      const v3 = makeVacancy({ hash: "h3" });
      repo.save("s1", [v1, v2, v3], "2026-01-01.yaml");
      const output = repo.loadAll("s1")!;
      expect(output.vacancies.length).toBe(3);
      teardown();
    });

    test("save with empty list returns empty vacancies, not undefined", () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [], "2026-01-01.yaml");
      const output = repo.loadAll("s1");
      expect(output !== undefined).toBeTruthy();
      expect(output!.vacancies.length).toBe(0);
      expect(output!.vacancies).toEqual([]);
      teardown();
    });

    test("save replaces previous vacancies", () => {
      const { repo, teardown } = factory.createRepo();
      const v1 = makeVacancy({ hash: "h1", title: "Old Job" });
      const v2 = makeVacancy({ hash: "h2", title: "New Job" });
      repo.save("s1", [v1, v2], "2026-01-01.yaml");
      repo.save("s1", [v2], "2026-02-01.yaml");
      const output = repo.loadAll("s1")!;
      expect(output.vacancies.length).toBe(1);
      expect(output.latestCrawl).toBe("2026-02-01.yaml");
      expect(output.vacancies[0].hash).toBe("h2");
      teardown();
    });

    test("loadAll returns deep copy", () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      const a = repo.loadAll("s1")!;
      const b = repo.loadAll("s1")!;
      expect(a).not.toBe(b);
      Object.assign(a.vacancies[0], { title: "mutated" });
      expect(repo.loadAll("s1")!.vacancies[0].title).toBe("Developer");
      teardown();
    });

    test("findByHash returns vacancy", () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      const found = repo.findByHash("s1", "abc123");
      expect(found!.company).toBe("ACME");
      teardown();
    });

    test("findByHash returns undefined for missing hash", () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      expect(repo.findByHash("s1", "zzz999")).toBe(undefined);
      teardown();
    });

    test("addActivity appends to vacancy history", async () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      const activity: Activity = { type: "applied", date: "2026-01-15" };
      await repo.addActivity("s1", "abc123", activity);
      const loaded = repo.loadAll("s1")!;
      expect(loaded.vacancies[0].activityHistory.length).toBe(1);
      expect(loaded.vacancies[0].activityHistory[0].type).toBe("applied");
      teardown();
    });

    test("addActivity throws for missing job search", async () => {
      const { repo, teardown } = factory.createRepo();
      await expect(() =>
        repo.addActivity("nope", "abc123", {
          type: "applied",
          date: "2026-01-15",
        }),
      ).rejects.toThrow();
      teardown();
    });

    test("addActivity throws for missing vacancy", async () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      await expect(() =>
        repo.addActivity("s1", "zzz999", {
          type: "applied",
          date: "2026-01-15",
        }),
      ).rejects.toThrow();
      teardown();
    });

    test("multiple activities accumulate", async () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      await repo.addActivity("s1", "abc123", {
        type: "applied",
        date: "2026-01-15",
      });
      await repo.addActivity("s1", "abc123", {
        type: "invited",
        date: "2026-01-20",
        interviewDate: "2026-02-01",
      });
      const loaded = repo.loadAll("s1")!;
      expect(loaded.vacancies[0].activityHistory.length).toBe(2);
      expect(loaded.vacancies[0].activityHistory[1].type).toBe("invited");
      teardown();
    });

    test("multiple vacancies round-trip", () => {
      const { repo, teardown } = factory.createRepo();
      const v1 = makeVacancy({ hash: "h1", title: "Frontend Dev" });
      const v2 = makeVacancy({ hash: "h2", title: "Backend Dev" });
      repo.save("s1", [v1, v2], "2026-01-01.yaml");
      const output = repo.loadAll("s1")!;
      expect(output.vacancies.length).toBe(2);
      const titles = output.vacancies.map((v) => v.title).sort();
      expect(titles).toEqual(["Backend Dev", "Frontend Dev"]);
      teardown();
    });
  });
}
