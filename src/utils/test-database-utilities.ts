import { beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function setupTemporaryDatabaseDirectory(prefix: string) {
  let temporaryDirectory: string;
  let counter = 0;

  beforeAll(() => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  return {
    nextId: () => String(counter++),
    pathForId: (id: string) => path.join(temporaryDirectory, `${id}.db`),
  };
}
