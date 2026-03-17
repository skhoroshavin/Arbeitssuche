import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSqliteJobSearchRepository } from "./index.js";
import { Database } from "@/repositories/database.js";
import {
  jobSearchRepositoryTests,
  makeSampleJobSearch,
} from "./job-search.test-suite.js";

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

function createRepo() {
  const db = Database.open(path.join(tmpDir, `${counter++}.db`));
  return {
    repo: createSqliteJobSearchRepository(db),
    teardown: () => db.close(),
  };
}

function createRepoWithId(id: string) {
  const db = Database.open(path.join(tmpDir, `${id}.db`));
  return {
    repo: createSqliteJobSearchRepository(db),
    teardown: () => db.close(),
  };
}

jobSearchRepositoryTests("SqliteJobSearchRepository", { createRepo });

// --- Persistence ---

test("saved job search survives new repository instance", async () => {
  const dbId = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(dbId);
  const id = repo1.create("Software Engineer", "john");
  const sample = makeSampleJobSearch(id);
  await repo1.save(id, sample);
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(dbId);
  assert.deepEqual(repo2.load(id), sample);
  t2();
});

test("cover letter persists across instances", async () => {
  const dbId = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(dbId);
  const id = repo1.create("Software Engineer", "john");
  const letter = "Sehr geehrte Damen und Herren,\n\nIch bewerbe mich.";
  await repo1.saveCoverLetter(id, letter);
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(dbId);
  assert.equal(repo2.loadCoverLetter(id), letter);
  t2();
});

test("application cover letter persists across instances", async () => {
  const dbId = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(dbId);
  const id = repo1.create("Software Engineer", "john");
  const content = "Application-specific cover letter.";
  await repo1.saveApplicationCoverLetter(id, "hash1", content);
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(dbId);
  assert.equal(repo2.loadApplicationCoverLetter(id, "hash1"), content);
  t2();
});

test("delete persists across instances", async () => {
  const dbId = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(dbId);
  const id = repo1.create("Software Engineer", "john");
  const sample = makeSampleJobSearch(id);
  await repo1.save(id, sample);
  repo1.delete(id);
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(dbId);
  assert.equal(repo2.exists(id), false);
  t2();
});

test("listByApplicant works across instances", async () => {
  const dbId = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(dbId);
  const id1 = repo1.create("Search 1", "john");
  repo1.create("Search 2", "jane");
  const id3 = repo1.create("Search 3", "john");
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(dbId);
  const johns = repo2.listByApplicant("john");
  assert.equal(johns.length, 2);
  assert.deepEqual(
    johns.map((j: { id: string }) => j.id).sort(),
    [id1, id3].sort(),
  );
  t2();
});
