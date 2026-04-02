import { test, describe, expect } from "vitest";
import {
  createStubVacancyRepository,
  createSqliteVacancyRepository,
} from "./index";
import { createSqliteJobSearchRepository } from "@/repositories/job-search/index.js";
import { Database } from "@/utils/index.js";
import { setupTemporaryDatabaseDirectory } from "@/utils/index.js";
import type { VacancyDTO, Activity } from "@/models/vacancy/types";
import { Vacancy } from "@/models/vacancy/index.js";
import type { VacancyRepository } from "./types";

vacancyRepositoryTests("StubVacancyRepository", () => ({
  repo: createStubVacancyRepository(),
  teardown: () => {},
}));

// --- Stub-specific ---

test("StubVacancyRepository initializes from provided data", () => {
  const repo = createStubVacancyRepository({
    s1: { vacancies: [SAMPLE_VACANCY], latestCrawl: "2026-01-01.yaml" },
  });
  const output = repo.loadAll("s1");
  expect(output.vacancies.length).toBe(1);
});

// --- SqliteVacancyRepository ---

const { nextId, pathForId } = setupTemporaryDatabaseDirectory("vacancy-test");

vacancyRepositoryTests("SqliteVacancyRepository", () =>
  openDatabaseById(nextId()),
);

// --- Persistence ---

test("saved vacancies survive new repository instance", () => {
  const id = nextId();
  const { repo: repo1, teardown: t1 } = openDatabaseById(id);
  repo1.save("s1", [makeVacancy()], "2026-01-01.yaml");
  t1();

  const { repo: repo2, teardown: t2 } = openDatabaseById(id);
  const output = repo2.loadAll("s1");
  expect(output.vacancies.length).toBe(1);
  expect(output.latestCrawl).toBe("2026-01-01.yaml");
  expect(output.vacancies[0].hash).toBe("abc123");
  expect(output.vacancies[0].title).toBe("Developer");
  t2();
});

test("added activity persists across instances", () => {
  const id = nextId();
  const { repo: repo1, teardown: t1 } = openDatabaseById(id);
  repo1.save("s1", [makeVacancy()], "2026-01-01.yaml");
  repo1.addActivity("s1", "abc123", {
    type: "applied",
    date: "2026-01-15",
  });
  t1();

  const { repo: repo2, teardown: t2 } = openDatabaseById(id);
  const loaded = repo2.loadAll("s1");
  expect(loaded.vacancies[0].activityHistory.length).toBe(1);
  expect(loaded.vacancies[0].activityHistory[0].type).toBe("applied");
  t2();
});

test("findByHash works across instances", () => {
  const id = nextId();
  const { repo: repo1, teardown: t1 } = openDatabaseById(id);
  repo1.save("s1", [makeVacancy()], "2026-01-01.yaml");
  t1();

  const { repo: repo2, teardown: t2 } = openDatabaseById(id);
  const found = repo2.findByHash("s1", "abc123");
  expect(found!.company).toBe("ACME");
  t2();
});

test("multiple vacancies persist correctly", () => {
  const id = nextId();
  const { repo: repo1, teardown: t1 } = openDatabaseById(id);
  const v1 = makeVacancy({ hash: "h1", title: "Frontend Dev" });
  const v2 = makeVacancy({ hash: "h2", title: "Backend Dev" });
  repo1.save("s1", [v1, v2], "2026-01-01.yaml");
  t1();

  const { repo: repo2, teardown: t2 } = openDatabaseById(id);
  const output = repo2.loadAll("s1");
  expect(output.vacancies.length).toBe(2);
  const titles = output.vacancies.map((v) => v.title).toSorted();
  expect(titles).toEqual(["Backend Dev", "Frontend Dev"]);
  t2();
});

test("save replaces vacancies across instances", () => {
  const id = nextId();
  const { repo: repo1, teardown: t1 } = openDatabaseById(id);
  const v1 = makeVacancy({ hash: "h1" });
  const v2 = makeVacancy({ hash: "h2" });
  repo1.save("s1", [v1, v2], "2026-01-01.yaml");
  repo1.save("s1", [v1], "2026-02-01.yaml");
  t1();

  const { repo: repo2, teardown: t2 } = openDatabaseById(id);
  const output = repo2.loadAll("s1");
  expect(output.vacancies.length).toBe(1);
  expect(output.latestCrawl).toBe("2026-02-01.yaml");
  t2();
});

// --- Hydration defaults ---

test("hydrates missing active field as true", () => {
  const id = nextId();
  const { db, repo, teardown } = openDatabaseById(id);
  db.prepare(
    "INSERT INTO vacancy_meta (job_search_id, generated_at, latest_crawl) VALUES (?, ?, ?)",
  ).run("s1", "2026-01-01T00:00:00Z", "2026-01-01.yaml");
  db.prepare(
    "INSERT INTO vacancies (job_search_id, hash, data) VALUES (?, ?, ?)",
  ).run(
    "s1",
    "h1",
    JSON.stringify({
      hash: "h1",
      title: "Dev",
      company: "ACME",
      urls: [],
      addresses: [],
      descriptionChanged: false,
      activityHistory: [],
    }),
  );

  const output = repo.loadAll("s1");
  expect(output.vacancies[0].active).toBe(true);
  teardown();
});

test("hydrates missing descriptionChanged field as false", () => {
  const id = nextId();
  const { db, repo, teardown } = openDatabaseById(id);
  db.prepare(
    "INSERT INTO vacancy_meta (job_search_id, generated_at, latest_crawl) VALUES (?, ?, ?)",
  ).run("s1", "2026-01-01T00:00:00Z", "2026-01-01.yaml");
  db.prepare(
    "INSERT INTO vacancies (job_search_id, hash, data) VALUES (?, ?, ?)",
  ).run(
    "s1",
    "h1",
    JSON.stringify({
      hash: "h1",
      title: "Dev",
      company: "ACME",
      urls: [],
      addresses: [],
      active: true,
      activityHistory: [],
    }),
  );

  const output = repo.loadAll("s1");
  expect(output.vacancies[0].descriptionChanged).toBe(false);
  teardown();
});

function vacancyRepositoryTests(
  name: string,
  createRepo: () => { repo: VacancyRepository; teardown: () => void },
) {
  describe(name, () => {
    test("returns empty output for missing job search", () => {
      const { repo, teardown } = createRepo();
      expect(repo.loadAll("nope")).toEqual({
        generatedAt: "",
        latestCrawl: "",
        vacancies: [],
      });
      teardown();
    });

    test("save + loadAll round-trips", () => {
      const { repo, teardown } = createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      const output = repo.loadAll("s1");
      expect(output.vacancies.length).toBe(1);
      expect(output.vacancies[0].hash).toBe("abc123");
      teardown();
    });

    test("addActivity appends to vacancy history", () => {
      const { repo, teardown } = createRepo();
      repo.save("s1", [makeVacancy()], "2026-01-01.yaml");
      const activity: Activity = { type: "applied", date: "2026-01-15" };
      repo.addActivity("s1", "abc123", activity);
      const loaded = repo.loadAll("s1");
      expect(loaded.vacancies[0].activityHistory.length).toBe(1);
      expect(loaded.vacancies[0].activityHistory[0].type).toBe("applied");
      teardown();
    });
  });
}

const SAMPLE_VACANCY = makeVacancy();

function makeVacancy(overrides: Partial<VacancyDTO> = {}): Vacancy {
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

function openDatabaseById(id: string) {
  const database = Database.open(pathForId(id));
  // Create job_searches table and insert parent row so FK constraints are satisfied
  createSqliteJobSearchRepository(database);
  database
    .prepare(
      "INSERT OR IGNORE INTO job_searches (id, applicant_id, search_term, data) VALUES (?, '', '', '{}')",
    )
    .run("s1");
  return {
    db: database,
    repo: createSqliteVacancyRepository(database),
    teardown: () => database.close(),
  };
}
