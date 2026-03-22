import { existsSync, readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

const ROOT = join(import.meta.dirname, "..");
const SRC_DIR = join(ROOT, "src");
const UI_DIR = join(SRC_DIR, "ui");
const UTILS_DIR = join(SRC_DIR, "utils");

const PAGE_GROUPS: Zone[] = ["applicant", "job-search", "settings"];

/** Source modules excluded from placement checks (always considered shared). */
const EXCLUDED_MODULES = new Set(["Icons"]);

// =============================================================================
// File collection
// =============================================================================

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

function collectFiles(dir: string, baseDir: string, ext: string[]): FileInfo[] {
  const results: FileInfo[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, baseDir, ext));
    } else if (ext.some((e) => entry.name.endsWith(e))) {
      const relPath = relative(baseDir, full);
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

// =============================================================================
// UI shared code check
// =============================================================================
//
// Exports in ui/components/ and ui/hooks/ must be genuinely shared:
// used by 2+ page groups, layout + a page group, or a sibling in the same dir.
// Single-page-group-only code belongs in pages/<group>/components/ or hooks/.

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
      results.push({ file: file.relPath, zone: file.zone });
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
      results.push({ file: file.relPath, zone: file.zone });
    }
  }
  return results;
}

/** Check if a shared module is imported by a sibling file in the same directory. */
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

function isGenuinelyShared(
  sharedExport: SharedExport,
  importers: { file: string; zone: Zone }[],
  allFiles: FileInfo[],
): boolean {
  if (importers.length === 0) return true; // unused — caught by TS/eslint

  const zones = new Set(importers.map((i) => i.zone));
  const pageGroups = PAGE_GROUPS.filter((g) => zones.has(g));

  if (isImportedBySibling(sharedExport, allFiles)) return true;
  if (pageGroups.length >= 2) return true;
  if (zones.has("layout") && pageGroups.length >= 1) return true;
  if (sharedExport.kind === "hooks" && zones.has("data")) return true;

  return false;
}

function checkUiSharedCode(): string[] {
  const errors: string[] = [];
  const uiFiles = collectFiles(UI_DIR, UI_DIR, [".ts", ".tsx"]);

  const sharedExports = [
    ...parseBarrel(join(UI_DIR, "components", "index.ts"), "components"),
    ...parseBarrel(join(UI_DIR, "hooks", "index.ts"), "hooks"),
  ];

  for (const exp of sharedExports) {
    if (EXCLUDED_MODULES.has(exp.sourceModule)) continue;
    const importers = findImporters(uiFiles, exp);
    if (!isGenuinelyShared(exp, importers, uiFiles)) {
      const zones = [...new Set(importers.map((i) => i.zone))];
      const target = zones[0];
      const dir = exp.kind;
      errors.push(
        `ui/${dir}/${exp.sourceModule}.tsx exports "${exp.name}" but is only used by "${target}"` +
          `\n    → Move to src/ui/pages/${target}/${dir}/${exp.sourceModule}.tsx` +
          `\n    Imported by:\n${importers.map((i) => `      ${i.file}`).join("\n")}`,
      );
    }
  }

  return errors;
}

// =============================================================================
// Utils shared code check
// =============================================================================
//
// Each file in src/utils/ must be:
// 1. Imported by 2+ different entities (e.g. plugins/job-site/dm + plugins/job-site/xing)
// 2. Accompanied by a test file (e.g. database.ts → database.test.ts)

function checkUtils(): string[] {
  const errors: string[] = [];
  const srcFiles = collectFiles(SRC_DIR, SRC_DIR, [".ts", ".tsx"]);
  const utilsModules = readdirSync(UTILS_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => f.replace(/\.ts$/, ""));

  for (const name of utilsModules) {
    if (!existsSync(join(UTILS_DIR, `${name}.test.ts`))) {
      errors.push(
        `utils/${name}.ts has no test → Create utils/${name}.test.ts`,
      );
    }

    // Find distinct entities that import this util.
    // Entity = up to 3 directory levels, e.g. "plugins/job-site/dm".
    const importStr = `@/utils/${name}`;
    const entities = new Set<string>();
    for (const file of srcFiles) {
      if (file.relPath.startsWith("utils/")) continue;
      if (!file.content.includes(importStr)) continue;
      const parts = file.relPath.split("/");
      entities.add(parts.slice(0, Math.min(parts.length - 1, 3)).join("/"));
    }

    if (entities.size < 2) {
      const detail =
        entities.size === 0
          ? "not imported by any entity"
          : `only used by: ${[...entities].join(", ")}`;
      errors.push(`utils/${name}.ts ${detail} → Must be used by 2+ entities`);
    }
  }

  return errors;
}

// =============================================================================
// Main
// =============================================================================

const uiErrors = checkUiSharedCode();
const utilsErrors = checkUtils();

if (uiErrors.length > 0) {
  console.error("\nUI shared code violations:\n");
  for (const msg of uiErrors) {
    console.error(`  ${msg}\n`);
  }
}

if (utilsErrors.length > 0) {
  console.error("\nUtils violations:\n");
  for (const msg of utilsErrors) {
    console.error(`  ${msg}\n`);
  }
}

if (uiErrors.length + utilsErrors.length > 0) {
  process.exit(1);
} else {
  console.log("Shared code placement: OK");
}
