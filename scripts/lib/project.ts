import { join, relative } from "path";
import { Project, type SourceFile } from "ts-morph";

export const ROOT = join(import.meta.dirname, "../..");
export const SRC_DIR = join(ROOT, "src");

export function createProject(): Project {
  const project = new Project({
    tsConfigFilePath: join(ROOT, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths([
    join(SRC_DIR, "**/*.{ts,tsx}"),
    join(ROOT, "scripts/**/*.ts"),
    join(ROOT, "e2e/**/*.ts"),
  ]);

  return project;
}

export function isTestFile(path: string): boolean {
  return (
    path.endsWith(".test.ts") ||
    path.endsWith(".integration-test.ts") ||
    path.endsWith(".test-suite.ts")
  );
}

export function isEntryPoint(filePath: string): boolean {
  const rel = relative(SRC_DIR, filePath);
  return (
    rel === "app/main.ts" || rel === "app/preload.ts" || rel === "ui/main.tsx"
  );
}

export function getSrcRelPath(sourceFile: SourceFile): string {
  return relative(SRC_DIR, sourceFile.getFilePath());
}
