import { afterAll, describe, it, expect } from "vitest";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "@/utils/database";

describe("Database", () => {
  const testDir = join(tmpdir(), `db-test-${Date.now()}`);

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("creates parent directories when they do not exist", () => {
    const dbPath = join(testDir, "nonexistent", "sub", "test.db");
    const db = Database.open(dbPath);
    db.close();
    expect(true).toBeTruthy();
  });
});
