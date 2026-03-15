import { readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

const UI_DIR = join(import.meta.dirname, "..", "src", "ui");
const PAGE_GROUPS: Zone[] = ["applicant", "job-search", "settings"];

/** Source modules excluded from placement checks (always considered shared). */
const EXCLUDED_MODULES = new Set(["Icons"]);

type Zone =
  | "components"
  | "hooks"
  | "layout"
  | "data"
  | "applicant"
  | "job-search"
  | "settings";

interface FileInfo {
  path: string;
  relPath: string;
  zone: Zone | null;
  content: string;
}

function classifyFile(relPath: string): Zone | null {
  if (relPath.startsWith("pages/")) {
    for (const group of PAGE_GROUPS) {
      if (relPath.startsWith(`pages/${group}/`)) return group;
    }
    return null;
  }
  for (const zone of ["components", "hooks", "layout", "data"] as const) {
    if (relPath.startsWith(`${zone}/`)) return zone;
  }
  return null;
}

function collectFiles(dir: string, ext: string[]): FileInfo[] {
  const results: FileInfo[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, ext));
    } else if (ext.some((e) => entry.name.endsWith(e))) {
      const relPath = relative(UI_DIR, full);
      results.push({
        path: full,
        relPath,
        zone: classifyFile(relPath),
        content: readFileSync(full, "utf-8"),
      });
    }
  }
  return results;
}

interface SharedExport {
  name: string;
  sourceModule: string;
  kind: "components" | "hooks";
}

function parseBarrel(
  barrelPath: string,
  kind: "components" | "hooks",
): SharedExport[] {
  const content = readFileSync(barrelPath, "utf-8");
  const exports: SharedExport[] = [];
  const re = /export\s+\{([^}]+)\}\s+from\s+"\.\/([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const names = match[1]
      .split(",")
      .map((n: string) => n.replace(/\s+as\s+\w+/, "").trim());
    const sourceModule = match[2];
    for (const name of names) {
      if (name && !name.startsWith("type ")) {
        exports.push({ name, sourceModule, kind });
      }
    }
  }
  return exports;
}

/** Check if a shared module is imported by a sibling file in the same directory (via relative import). */
function isImportedBySibling(
  sharedExport: SharedExport,
  allFiles: FileInfo[],
): boolean {
  const relImport = `./${sharedExport.sourceModule}`;
  for (const file of allFiles) {
    if (!file.relPath.startsWith(`${sharedExport.kind}/`)) continue;
    const basename = file.path.replace(/\.[^.]+$/, "");
    if (basename.endsWith(`/${sharedExport.sourceModule}`)) continue;
    if (file.path.endsWith("index.ts")) continue;
    if (file.content.includes(`from "${relImport}"`)) return true;
  }
  return false;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

function findImporters(
  files: FileInfo[],
  sharedExport: SharedExport,
): { file: string; zone: Zone }[] {
  const importPath =
    sharedExport.kind === "components" ? `@/ui/components` : `@/ui/hooks`;

  const results: { file: string; zone: Zone }[] = [];
  for (const file of files) {
    if (!file.zone || file.zone === sharedExport.kind) continue;

    // Check direct file import (e.g. @/ui/components/AutoSaveStatus)
    const directImportPath = `${importPath}/${sharedExport.sourceModule}`;
    const directImportRe = new RegExp(
      `from\\s+["']${escapeRegExp(directImportPath)}["']`,
    );
    if (directImportRe.test(file.content)) {
      results.push({
        file: relative(join(UI_DIR, ".."), file.path),
        zone: file.zone,
      });
      continue;
    }

    // Check barrel import (e.g. @/ui/components)
    const importLineRe = new RegExp(
      `import\\s+(?:type\\s+)?\\{([^}]+)\\}\\s+from\\s+["']${escapeRegExp(importPath)}["']`,
    );
    const importMatch = importLineRe.exec(file.content);
    if (!importMatch) continue;

    const importedNames = importMatch[1].split(",").map((n) =>
      n
        .replace(/\s+as\s+\w+/, "")
        .replace(/^type\s+/, "")
        .trim(),
    );
    if (importedNames.includes(sharedExport.name)) {
      results.push({
        file: relative(join(UI_DIR, ".."), file.path),
        zone: file.zone,
      });
    }
  }
  return results;
}

function isValid(
  sharedExport: SharedExport,
  importers: { file: string; zone: Zone }[],
  allFiles: FileInfo[],
): boolean {
  if (importers.length === 0) return true; // unused exports are fine (caught by TS/eslint)

  const zones = new Set(importers.map((i) => i.zone));
  const pageGroups = PAGE_GROUPS.filter((g) => zones.has(g));

  // Rule 1: Imported by another file in the same shared directory (via relative import)
  if (isImportedBySibling(sharedExport, allFiles)) return true;

  // Rule 2: Imported by 2+ distinct page groups
  if (pageGroups.length >= 2) return true;

  // Rule 3: Imported by layout + at least 1 page group
  if (zones.has("layout") && pageGroups.length >= 1) return true;

  // For hooks: imports from data/ count as shared (data hooks serve all pages)
  if (sharedExport.kind === "hooks" && zones.has("data")) return true;

  return false;
}

// --- Main ---

const componentsBarrel = join(UI_DIR, "components", "index.ts");
const hooksBarrel = join(UI_DIR, "hooks", "index.ts");

const sharedExports = [
  ...parseBarrel(componentsBarrel, "components"),
  ...parseBarrel(hooksBarrel, "hooks"),
];

const allFiles = collectFiles(UI_DIR, [".ts", ".tsx"]);
const violations: {
  export: SharedExport;
  importers: { file: string; zone: Zone }[];
}[] = [];

for (const exp of sharedExports) {
  if (EXCLUDED_MODULES.has(exp.sourceModule)) continue;
  const importers = findImporters(allFiles, exp);
  if (!isValid(exp, importers, allFiles)) {
    violations.push({ export: exp, importers });
  }
}

if (violations.length > 0) {
  console.error("\nShared code placement violations:\n");
  for (const v of violations) {
    const dir = v.export.kind;
    const zones = [...new Set(v.importers.map((i) => i.zone))];
    const targetGroup = zones[0];
    console.error(
      `  ui/${dir}/${v.export.sourceModule}.tsx exports "${v.export.name}" but is only used by page "${targetGroup}"`,
    );
    console.error(
      `    → Move to src/ui/pages/${targetGroup}/${dir}/${v.export.sourceModule}.tsx`,
    );
    console.error(`    Imported by:`);
    for (const imp of v.importers) {
      console.error(`      ${imp.file}`);
    }
    console.error();
  }
  process.exit(1);
} else {
  console.log("Shared code placement: OK");
}
