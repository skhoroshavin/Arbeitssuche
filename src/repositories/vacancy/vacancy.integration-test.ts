import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createStubVacancyRepository,
  createSqliteVacancyRepository,
} from "./index.js";
import { Database } from "@/repositories/database.js";
import { createSqliteJobSearchRepository } from "@/repositories/job-search/index.js";
import type { Vacancy, Activity } from "@/models/vacancy/types.js";

function makeVacancy(overrides: Partial<Vacancy> = {}): Vacancy {
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

const SAMPLE_VACANCY: Vacancy = makeVacancy();

// --- Repository implementations ---

let tmpDir: string;
let counter = 0;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vacancy-integration-test-"));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const implementations = [
  {
    name: "StubVacancyRepository",
    persistent: false,
    createRepo: (_id: string) => ({
      repo: createStubVacancyRepository(),
      teardown: () => {},
    }),
  },
  {
    name: "SqliteVacancyRepository",
    persistent: true,
    createRepo: (id: string) => {
      const db = Database.open(path.join(tmpDir, `${id}.db`));
      // Create job_searches table and insert parent row so FK constraints are satisfied
      createSqliteJobSearchRepository(db);
      const insertJs = db.prepare(
        "INSERT OR IGNORE INTO job_searches (id, applicant_id, search_term, data) VALUES (?, '', '', '{}')",
      );
      insertJs.run("s1");
      return {
        repo: createSqliteVacancyRepository(db),
        teardown: () => db.close(),
      };
    },
  },
];

for (const impl of implementations) {
  describe(impl.name, () => {
    // --- Behavior ---

    test("returns undefined for missing job search", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      assert.equal(repo.loadAll("nope"), undefined);
      teardown();
    });

    test("save + loadAll round-trips", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      repo.save("s1", [SAMPLE_VACANCY], "2026-01-01.yaml");
      const output = repo.loadAll("s1");
      assert.equal(output!.vacancies.length, 1);
      assert.equal(output!.latestCrawl, "2026-01-01.yaml");
      assert.equal(output!.vacancies[0].hash, "abc123");
      teardown();
    });

    test("count matches vacancies length", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      const v1 = makeVacancy({ hash: "h1" });
      const v2 = makeVacancy({ hash: "h2" });
      const v3 = makeVacancy({ hash: "h3" });
      repo.save("s1", [v1, v2, v3], "2026-01-01.yaml");
      const output = repo.loadAll("s1")!;
      assert.equal(output.vacancies.length, 3);
      teardown();
    });

    test("save with empty list returns empty vacancies, not undefined", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      repo.save("s1", [], "2026-01-01.yaml");
      const output = repo.loadAll("s1");
      assert.ok(output !== undefined);
      assert.equal(output!.vacancies.length, 0);
      assert.deepEqual(output!.vacancies, []);
      teardown();
    });

    test("save replaces previous vacancies", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
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
      const { repo, teardown } = impl.createRepo(String(counter++));
      repo.save("s1", [SAMPLE_VACANCY], "2026-01-01.yaml");
      const a = repo.loadAll("s1")!;
      const b = repo.loadAll("s1")!;
      assert.notEqual(a, b);
      a.vacancies[0].title = "mutated";
      assert.equal(repo.loadAll("s1")!.vacancies[0].title, "Developer");
      teardown();
    });

    test("findByHash returns vacancy", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      repo.save("s1", [SAMPLE_VACANCY], "2026-01-01.yaml");
      const found = repo.findByHash("s1", "abc123");
      assert.equal(found!.company, "ACME");
      teardown();
    });

    test("findByHash returns undefined for missing hash", () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      repo.save("s1", [SAMPLE_VACANCY], "2026-01-01.yaml");
      assert.equal(repo.findByHash("s1", "zzz999"), undefined);
      teardown();
    });

    test("addActivity appends to vacancy history", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      repo.save("s1", [SAMPLE_VACANCY], "2026-01-01.yaml");
      const activity: Activity = { type: "applied", date: "2026-01-15" };
      await repo.addActivity("s1", "abc123", activity);
      const loaded = repo.loadAll("s1")!;
      assert.equal(loaded.vacancies[0].activityHistory.length, 1);
      assert.equal(loaded.vacancies[0].activityHistory[0].type, "applied");
      teardown();
    });

    test("addActivity throws for missing job search", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      await assert.rejects(() =>
        repo.addActivity("nope", "abc123", {
          type: "applied",
          date: "2026-01-15",
        }),
      );
      teardown();
    });

    test("addActivity throws for missing vacancy", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      repo.save("s1", [SAMPLE_VACANCY], "2026-01-01.yaml");
      await assert.rejects(() =>
        repo.addActivity("s1", "zzz999", {
          type: "applied",
          date: "2026-01-15",
        }),
      );
      teardown();
    });

    test("multiple activities accumulate", async () => {
      const { repo, teardown } = impl.createRepo(String(counter++));
      repo.save("s1", [SAMPLE_VACANCY], "2026-01-01.yaml");
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
      const { repo, teardown } = impl.createRepo(String(counter++));
      const v1 = makeVacancy({ hash: "h1", title: "Frontend Dev" });
      const v2 = makeVacancy({ hash: "h2", title: "Backend Dev" });
      repo.save("s1", [v1, v2], "2026-01-01.yaml");
      const output = repo.loadAll("s1")!;
      assert.equal(output.vacancies.length, 2);
      const titles = output.vacancies.map((v) => v.title).sort();
      assert.deepEqual(titles, ["Backend Dev", "Frontend Dev"]);
      teardown();
    });

    // --- Persistence (Sqlite only) ---

    if (impl.persistent) {
      test("saved vacancies survive new repository instance", () => {
        const id = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(id);
        repo1.save("s1", [makeVacancy()], "2026-01-01.yaml");
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(id);
        const output = repo2.loadAll("s1");
        assert.equal(output!.vacancies.length, 1);
        assert.equal(output!.latestCrawl, "2026-01-01.yaml");
        assert.equal(output!.vacancies[0].hash, "abc123");
        assert.equal(output!.vacancies[0].title, "Developer");
        t2();
      });

      test("added activity persists across instances", async () => {
        const id = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(id);
        repo1.save("s1", [makeVacancy()], "2026-01-01.yaml");
        await repo1.addActivity("s1", "abc123", {
          type: "applied",
          date: "2026-01-15",
        });
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(id);
        const loaded = repo2.loadAll("s1")!;
        assert.equal(loaded.vacancies[0].activityHistory.length, 1);
        assert.equal(loaded.vacancies[0].activityHistory[0].type, "applied");
        t2();
      });

      test("findByHash works across instances", () => {
        const id = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(id);
        repo1.save("s1", [makeVacancy()], "2026-01-01.yaml");
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(id);
        const found = repo2.findByHash("s1", "abc123");
        assert.equal(found!.company, "ACME");
        t2();
      });

      test("multiple vacancies persist correctly", () => {
        const id = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(id);
        const v1 = makeVacancy({ hash: "h1", title: "Frontend Dev" });
        const v2 = makeVacancy({ hash: "h2", title: "Backend Dev" });
        repo1.save("s1", [v1, v2], "2026-01-01.yaml");
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(id);
        const output = repo2.loadAll("s1")!;
        assert.equal(output.vacancies.length, 2);
        const titles = output.vacancies.map((v) => v.title).sort();
        assert.deepEqual(titles, ["Backend Dev", "Frontend Dev"]);
        t2();
      });

      test("save replaces vacancies across instances", () => {
        const id = String(counter++);
        const { repo: repo1, teardown: t1 } = impl.createRepo(id);
        const v1 = makeVacancy({ hash: "h1" });
        const v2 = makeVacancy({ hash: "h2" });
        repo1.save("s1", [v1, v2], "2026-01-01.yaml");
        repo1.save("s1", [v1], "2026-02-01.yaml");
        t1();

        const { repo: repo2, teardown: t2 } = impl.createRepo(id);
        const output = repo2.loadAll("s1")!;
        assert.equal(output.vacancies.length, 1);
        assert.equal(output.latestCrawl, "2026-02-01.yaml");
        t2();
      });
    }
  });
}

// --- Stub-specific ---

test("StubVacancyRepository initializes from provided data", () => {
  const repo = createStubVacancyRepository({
    s1: { vacancies: [SAMPLE_VACANCY], latestCrawl: "2026-01-01.yaml" },
  });
  const output = repo.loadAll("s1");
  assert.equal(output!.vacancies.length, 1);
});
