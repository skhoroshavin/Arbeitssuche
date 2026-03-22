import { test, beforeAll, afterAll, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSqliteVacancyRepository } from "./index";
import { Database } from "@/utils/database";
import { createSqliteJobSearchRepository } from "@/repositories/job-search/index";
import { vacancyRepositoryTests, makeVacancy } from "./vacancy.test-suite";

let tmpDir: string;
let counter = 0;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vacancy-integration-test-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function openDb(pathId: string) {
  const db = Database.open(path.join(tmpDir, `${pathId}.db`));
  // Create job_searches table and insert parent row so FK constraints are satisfied
  createSqliteJobSearchRepository(db);
  db.prepare(
    "INSERT OR IGNORE INTO job_searches (id, applicant_id, search_term, data) VALUES (?, '', '', '{}')",
  ).run("s1");
  return {
    repo: createSqliteVacancyRepository(db),
    teardown: () => db.close(),
  };
}

function createRepo() {
  return openDb(String(counter++));
}

function createRepoWithId(id: string) {
  return openDb(id);
}

vacancyRepositoryTests("SqliteVacancyRepository", { createRepo });

// --- Persistence ---

test("saved vacancies survive new repository instance", () => {
  const id = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(id);
  repo1.save("s1", [makeVacancy()], "2026-01-01.yaml");
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(id);
  const output = repo2.loadAll("s1");
  expect(output!.vacancies.length).toBe(1);
  expect(output!.latestCrawl).toBe("2026-01-01.yaml");
  expect(output!.vacancies[0].hash).toBe("abc123");
  expect(output!.vacancies[0].title).toBe("Developer");
  t2();
});

test("added activity persists across instances", async () => {
  const id = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(id);
  repo1.save("s1", [makeVacancy()], "2026-01-01.yaml");
  await repo1.addActivity("s1", "abc123", {
    type: "applied",
    date: "2026-01-15",
  });
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(id);
  const loaded = repo2.loadAll("s1")!;
  expect(loaded.vacancies[0].activityHistory.length).toBe(1);
  expect(loaded.vacancies[0].activityHistory[0].type).toBe("applied");
  t2();
});

test("findByHash works across instances", () => {
  const id = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(id);
  repo1.save("s1", [makeVacancy()], "2026-01-01.yaml");
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(id);
  const found = repo2.findByHash("s1", "abc123");
  expect(found!.company).toBe("ACME");
  t2();
});

test("multiple vacancies persist correctly", () => {
  const id = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(id);
  const v1 = makeVacancy({ hash: "h1", title: "Frontend Dev" });
  const v2 = makeVacancy({ hash: "h2", title: "Backend Dev" });
  repo1.save("s1", [v1, v2], "2026-01-01.yaml");
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(id);
  const output = repo2.loadAll("s1")!;
  expect(output.vacancies.length).toBe(2);
  const titles = output.vacancies.map((v) => v.title).sort();
  expect(titles).toEqual(["Backend Dev", "Frontend Dev"]);
  t2();
});

test("save replaces vacancies across instances", () => {
  const id = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(id);
  const v1 = makeVacancy({ hash: "h1" });
  const v2 = makeVacancy({ hash: "h2" });
  repo1.save("s1", [v1, v2], "2026-01-01.yaml");
  repo1.save("s1", [v1], "2026-02-01.yaml");
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(id);
  const output = repo2.loadAll("s1")!;
  expect(output.vacancies.length).toBe(1);
  expect(output.latestCrawl).toBe("2026-02-01.yaml");
  t2();
});
