import { afterAll, describe, it, expect } from "vitest";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Database } from "@/utils/index.js";

describe("Database", () => {
  const testDirectory = path.join(tmpdir(), `db-test-${Date.now()}`);

  afterAll(() => {
    rmSync(testDirectory, { recursive: true, force: true });
  });

  it("creates parent directories when they do not exist", () => {
    const databasePath = path.join(
      testDirectory,
      "nonexistent",
      "sub",
      "test.db",
    );
    const database = Database.open(databasePath);
    database.close();
    expect(true).toBeTruthy();
  });
});
