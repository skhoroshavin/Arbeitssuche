import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Vacancy, Activity } from "@/models/vacancy/types.js";
import type { VacancyRepository } from "./types.js";

export function makeVacancy(overrides: Partial<Vacancy> = {}): Vacancy {
  return {
    hash: "abc123",
    title: "Developer",
    company: "ACME",
    urls: ["https://example.com/job/1"],
    addresses: ["Berlin"],
    descriptionChanged: false,
    activityHistory: [],
    active: true,
    ...overrides,
  };
}

interface RepoFactory {
  createRepo: () => { repo: VacancyRepository; teardown: () => void };
}

export function vacancyRepositoryTests(name: string, factory: RepoFactory) {
  describe(name, () => {
    test("returns undefined for missing job search", () => {
      const { repo, teardown } = factory.createRepo();
      assert.equal(repo.loadAll("nope"), undefined);
      teardown();
    });

    test("save + loadAll round-trips", () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      const output = repo.loadAll("s1");
      assert.equal(output!.vacancies.length, 1);
      assert.equal(output!.latestCrawl, "2026-01-01.yaml");
      assert.equal(output!.vacancies[0].hash, "abc123");
      teardown();
    });

    test("count matches vacancies length", () => {
      const { repo, teardown } = factory.createRepo();
      const v1 = makeVacancy({ hash: "h1" });
      const v2 = makeVacancy({ hash: "h2" });
      const v3 = makeVacancy({ hash: "h3" });
      repo.save("s1", [v1, v2, v3], "2026-01-01.yaml");
      const output = repo.loadAll("s1")!;
      assert.equal(output.vacancies.length, 3);
      teardown();
    });

    test("save with empty list returns empty vacancies, not undefined", () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [], "2026-01-01.yaml");
      const output = repo.loadAll("s1");
      assert.ok(output !== undefined);
      assert.equal(output!.vacancies.length, 0);
      assert.deepEqual(output!.vacancies, []);
      teardown();
    });

    test("save replaces previous vacancies", () => {
      const { repo, teardown } = factory.createRepo();
      const v1 = makeVacancy({ hash: "h1", title: "Old Job" });
      const v2 = makeVacancy({ hash: "h2", title: "New Job" });
      repo.save("s1", [v1, v2], "2026-01-01.yaml");
      repo.save("s1", [v2], "2026-02-01.yaml");
      const output = repo.loadAll("s1")!;
      assert.equal(output.vacancies.length, 1);
      assert.equal(output.latestCrawl, "2026-02-01.yaml");
      assert.equal(output.vacancies[0].hash, "h2");
      teardown();
    });

    test("loadAll returns deep copy", () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      const a = repo.loadAll("s1")!;
      const b = repo.loadAll("s1")!;
      assert.notEqual(a, b);
      a.vacancies[0].title = "mutated";
      assert.equal(repo.loadAll("s1")!.vacancies[0].title, "Developer");
      teardown();
    });

    test("findByHash returns vacancy", () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      const found = repo.findByHash("s1", "abc123");
      assert.equal(found!.company, "ACME");
      teardown();
    });

    test("findByHash returns undefined for missing hash", () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      assert.equal(repo.findByHash("s1", "zzz999"), undefined);
      teardown();
    });

    test("addActivity appends to vacancy history", async () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      const activity: Activity = { type: "applied", date: "2026-01-15" };
      await repo.addActivity("s1", "abc123", activity);
      const loaded = repo.loadAll("s1")!;
      assert.equal(loaded.vacancies[0].activityHistory.length, 1);
      assert.equal(loaded.vacancies[0].activityHistory[0].type, "applied");
      teardown();
    });

    test("addActivity throws for missing job search", async () => {
      const { repo, teardown } = factory.createRepo();
      await assert.rejects(() =>
        repo.addActivity("nope", "abc123", {
          type: "applied",
          date: "2026-01-15",
        }),
      );
      teardown();
    });

    test("addActivity throws for missing vacancy", async () => {
      const { repo, teardown } = factory.createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      await assert.rejects(() =>
        repo.addActivity("s1", "zzz999", {
          type: "applied",
          date: "2026-01-15",
        }),
      );
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
      assert.equal(loaded.vacancies[0].activityHistory.length, 2);
      assert.equal(loaded.vacancies[0].activityHistory[1].type, "invited");
      teardown();
    });

    test("multiple vacancies round-trip", () => {
      const { repo, teardown } = factory.createRepo();
      const v1 = makeVacancy({ hash: "h1", title: "Frontend Dev" });
      const v2 = makeVacancy({ hash: "h2", title: "Backend Dev" });
      repo.save("s1", [v1, v2], "2026-01-01.yaml");
      const output = repo.loadAll("s1")!;
      assert.equal(output.vacancies.length, 2);
      const titles = output.vacancies.map((v) => v.title).sort();
      assert.deepEqual(titles, ["Backend Dev", "Frontend Dev"]);
      teardown();
    });
  });
}
