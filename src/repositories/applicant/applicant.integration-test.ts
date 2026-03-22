import { test, beforeAll, afterAll, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSqliteApplicantRepository } from "./index";
import { Database } from "@/utils/database";
import {
  applicantRepositoryTests,
  makeSampleApplicant,
} from "./applicant.test-suite";

let tmpDir: string;
let counter = 0;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "applicant-integration-test-"),
  );
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createRepo() {
  const db = Database.open(path.join(tmpDir, `${counter++}.db`));
  return {
    repo: createSqliteApplicantRepository(db),
    teardown: () => db.close(),
  };
}

function createRepoWithId(id: string) {
  const db = Database.open(path.join(tmpDir, `${id}.db`));
  return {
    repo: createSqliteApplicantRepository(db),
    teardown: () => db.close(),
  };
}

applicantRepositoryTests("SqliteApplicantRepository", { createRepo });

// --- Persistence ---

test("saved applicant survives new repository instance", async () => {
  const dbId = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(dbId);
  const id = repo1.create("John Doe");
  const sample = makeSampleApplicant(id);
  await repo1.save(id, sample);
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(dbId);
  expect(repo2.load(id)).toEqual(sample);
  t2();
});

test("list works across instances", async () => {
  const dbId = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(dbId);
  const id1 = repo1.create("Alice");
  const id2 = repo1.create("Bob");
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(dbId);
  const ids = repo2.list().map((a: { id: string }) => a.id);
  expect(ids.sort()).toEqual([id1, id2].sort());
  t2();
});

test("delete persists across instances", async () => {
  const dbId = String(counter++);
  const { repo: repo1, teardown: t1 } = createRepoWithId(dbId);
  const id = repo1.create("John Doe");
  const sample = makeSampleApplicant(id);
  await repo1.save(id, sample);
  repo1.delete(id);
  t1();

  const { repo: repo2, teardown: t2 } = createRepoWithId(dbId);
  expect(repo2.exists(id)).toBe(false);
  t2();
});
