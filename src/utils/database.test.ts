import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "@/utils/database";

describe("Database", () => {
  const testDir = join(tmpdir(), `db-test-${Date.now()}`);

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("creates parent directories when they do not exist", () => {
    const dbPath = join(testDir, "nonexistent", "sub", "test.db");
    const db = Database.open(dbPath);
    db.close();
    assert.ok(true, "Database opened successfully in non-existent directory");
  });
});
