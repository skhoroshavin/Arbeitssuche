import { existsSync, readdirSync } from "fs";
import { join, relative } from "path";
import { type SourceFile } from "ts-morph";
import { createProject, SRC_DIR } from "./lib/project.js";

const UI_DIR = join(SRC_DIR, "ui");
const UTILS_DIR = join(SRC_DIR, "utils");

const PAGE_GROUPS: Zone[] = ["applicant", "job-search", "settings"];

/** Source modules excluded from placement checks (always considered shared). */
const EXCLUDED_MODULES = new Set(["Icons"]);

// =============================================================================
// Zone classification
// =============================================================================

type Zone =
  | "components"
  | "hooks"
  | "layout"
  | "data"
  | "applicant"
  | "job-search"
  | "settings";

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

// =============================================================================
// UI shared code check
// =============================================================================

interface SharedExport {
  name: string;
  sourceModule: string;
  kind: "components" | "hooks";
}

function parseBarrel(
  barrelFile: SourceFile,
  kind: "components" | "hooks",
): SharedExport[] {
  const exports: SharedExport[] = [];

  for (const exportDecl of barrelFile.getExportDeclarations()) {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    if (!moduleSpecifier?.startsWith("./")) continue;

    const sourceModule = moduleSpecifier.replace("./", "").replace(/\.js$/, "");

    if (exportDecl.isTypeOnly()) continue;

    for (const named of exportDecl.getNamedExports()) {
      if (named.isTypeOnly()) continue;
      const name = named.getName();
      exports.push({ name, sourceModule, kind });
    }
  }

  return exports;
}

function findImporters(
  uiFiles: SourceFile[],
  sharedExport: SharedExport,
): { file: string; zone: Zone }[] {
  const results: { file: string; zone: Zone }[] = [];

  for (const sf of uiFiles) {
    const relPath = relative(UI_DIR, sf.getFilePath());
    const zone = classifyFile(relPath);
    if (!zone || zone === sharedExport.kind) continue;

    for (const importDecl of sf.getImportDeclarations()) {
      const targetFile = importDecl.getModuleSpecifierSourceFile();
      if (!targetFile) continue;

      const targetRel = relative(UI_DIR, targetFile.getFilePath());

      // Direct file import (e.g. @/ui/components/AutoSaveStatus)
      if (
        targetRel === `${sharedExport.kind}/${sharedExport.sourceModule}.tsx`
      ) {
        results.push({ file: relPath, zone });
        break;
      }

      // Barrel import (e.g. @/ui/components)
      if (targetRel === `${sharedExport.kind}/index.ts`) {
        const namedImports = importDecl.getNamedImports();
        const importedNames = namedImports.map((n) => n.getName());
        if (importedNames.includes(sharedExport.name)) {
          results.push({ file: relPath, zone });
          break;
        }
      }
    }
  }
  return results;
}

function isImportedBySibling(
  sharedExport: SharedExport,
  uiFiles: SourceFile[],
): boolean {
  const targetModulePath = join(
    UI_DIR,
    sharedExport.kind,
    `${sharedExport.sourceModule}.tsx`,
  );

  for (const sf of uiFiles) {
    const filePath = sf.getFilePath();
    const relPath = relative(UI_DIR, filePath);
    if (!relPath.startsWith(`${sharedExport.kind}/`)) continue;
    if (filePath.endsWith("index.ts")) continue;
    const baseName = filePath.replace(/\.[^.]+$/, "");
    if (baseName.endsWith(`/${sharedExport.sourceModule}`)) continue;

    for (const importDecl of sf.getImportDeclarations()) {
      const targetFile = importDecl.getModuleSpecifierSourceFile();
      if (targetFile && targetFile.getFilePath() === targetModulePath) {
        return true;
      }
    }
  }
  return false;
}

function isGenuinelyShared(
  sharedExport: SharedExport,
  importers: { file: string; zone: Zone }[],
  uiFiles: SourceFile[],
): boolean {
  if (importers.length === 0) return true; // unused — caught by TS/eslint

  const zones = new Set(importers.map((i) => i.zone));
  const pageGroups = PAGE_GROUPS.filter((g) => zones.has(g));

  if (isImportedBySibling(sharedExport, uiFiles)) return true;
  if (pageGroups.length >= 2) return true;
  if (zones.has("layout") && pageGroups.length >= 1) return true;
  if (sharedExport.kind === "hooks" && zones.has("data")) return true;

  return false;
}

function checkUiSharedCode(srcFiles: SourceFile[]): string[] {
  const errors: string[] = [];

  const uiFiles = srcFiles.filter((sf) =>
    sf.getFilePath().startsWith(UI_DIR + "/"),
  );

  const componentsBarrel = uiFiles.find((sf) =>
    sf.getFilePath().endsWith("/components/index.ts"),
  );
  const hooksBarrel = uiFiles.find((sf) =>
    sf.getFilePath().endsWith("/hooks/index.ts"),
  );

  const sharedExports: SharedExport[] = [];
  if (componentsBarrel) {
    sharedExports.push(...parseBarrel(componentsBarrel, "components"));
  }
  if (hooksBarrel) {
    sharedExports.push(...parseBarrel(hooksBarrel, "hooks"));
  }

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

function checkUtils(srcFiles: SourceFile[]): string[] {
  const errors: string[] = [];

  const utilsModules = readdirSync(UTILS_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => f.replace(/\.ts$/, ""));

  // Single pass: build utilFilePath → entities map
  const utilsPrefix = UTILS_DIR + "/";
  const entitiesByUtil = new Map<string, Set<string>>();

  for (const sf of srcFiles) {
    const sfPath = sf.getFilePath();
    if (sfPath.startsWith(utilsPrefix)) continue;

    const sfRel = relative(SRC_DIR, sfPath);
    const parts = sfRel.split("/");
    const entity = parts.slice(0, Math.min(parts.length - 1, 3)).join("/");

    for (const importDecl of sf.getImportDeclarations()) {
      const targetFile = importDecl.getModuleSpecifierSourceFile();
      if (!targetFile) continue;
      const targetPath = targetFile.getFilePath();
      if (!targetPath.startsWith(utilsPrefix)) continue;

      let entities = entitiesByUtil.get(targetPath);
      if (!entities) {
        entities = new Set();
        entitiesByUtil.set(targetPath, entities);
      }
      entities.add(entity);
    }
  }

  for (const name of utilsModules) {
    if (!existsSync(join(UTILS_DIR, `${name}.test.ts`))) {
      errors.push(
        `utils/${name}.ts has no test → Create utils/${name}.test.ts`,
      );
    }

    const utilFilePath = join(UTILS_DIR, `${name}.ts`);
    const entities = entitiesByUtil.get(utilFilePath);
    const count = entities?.size ?? 0;

    if (count < 2) {
      const detail =
        count === 0
          ? "not imported by any entity"
          : `only used by: ${[...entities!].join(", ")}`;
      errors.push(`utils/${name}.ts ${detail} → Must be used by 2+ entities`);
    }
  }

  return errors;
}

// =============================================================================
// Main
// =============================================================================

const project = createProject();
const srcFiles = project
  .getSourceFiles()
  .filter((sf) => sf.getFilePath().startsWith(SRC_DIR + "/"));

const uiErrors = checkUiSharedCode(srcFiles);
const utilsErrors = checkUtils(srcFiles);

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
