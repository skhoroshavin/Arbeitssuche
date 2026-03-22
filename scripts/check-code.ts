import { existsSync, readdirSync } from "fs";
import { join, relative } from "path";
import { Project, SyntaxKind, type SourceFile, Node } from "ts-morph";

// =============================================================================
// Configuration
// =============================================================================

const ROOT = join(import.meta.dirname, "..");
const SRC_DIR = join(ROOT, "src");
const UI_DIR = join(SRC_DIR, "ui");
const UTILS_DIR = join(SRC_DIR, "utils");

// UI sub-layer directories (non-page zones used for classifying importers)
const UI_ZONES = ["components", "hooks", "layout", "data"] as const;

// Which of those zones have barrel exports checked for shared-code placement.
// Each export must be used by 2+ page groups, layout + a page group,
// a sibling in the same directory, or an extra consumer listed below.
const SHARED_UI_DIRS = ["components", "hooks"] as const;

// Independent page groups under ui/pages/. Cannot cross-import.
const PAGE_GROUPS = ["applicant", "job-search", "settings"] as const;

// Extra consumer zones that make a shared dir's export count as shared.
// Example: hooks used only by data/ are still considered shared.
const EXTRA_SHARED_CONSUMERS: Partial<
  Record<(typeof SHARED_UI_DIRS)[number], readonly Zone[]>
> = {
  hooks: ["data"],
};

// Modules always excluded from shared-code placement checks.
const EXCLUDED_MODULES = new Set(["Icons"]);

// src/utils/: each module must be imported by at least this many distinct entities.
const MIN_UTIL_CONSUMERS = 2;

// =============================================================================
// Types
// =============================================================================

interface FileExports {
  sourceFile: SourceFile;
  relPath: string;
  exports: ExportEntry[];
}

interface ExportEntry {
  name: string;
  kind: "value" | "type";
  used: boolean;
}

interface ImportRef {
  targetFile: string;
  names: string[];
  isNamespace: boolean;
}

interface UnusedSymbol {
  relPath: string;
  name: string;
  kind: "value" | "type";
}

/** Map from "file::exportedName" → { sourceFile, originalName } */
type ReExportMap = Map<string, { sourceFile: string; originalName: string }>;

type Zone = (typeof UI_ZONES)[number] | (typeof PAGE_GROUPS)[number];
type SharedDir = (typeof SHARED_UI_DIRS)[number];

interface SharedExport {
  name: string;
  sourceModule: string;
  kind: SharedDir;
}

// =============================================================================
// Helpers
// =============================================================================

function isTestFile(path: string): boolean {
  return (
    path.endsWith(".test.ts") ||
    path.endsWith(".integration-test.ts") ||
    path.endsWith(".test-suite.ts")
  );
}

function isEntryPoint(filePath: string): boolean {
  const rel = relative(SRC_DIR, filePath);
  return (
    rel === "app/main.ts" || rel === "app/preload.ts" || rel === "ui/main.tsx"
  );
}

function getSrcRelPath(sourceFile: SourceFile): string {
  return relative(SRC_DIR, sourceFile.getFilePath());
}

// =============================================================================
// Dead-code functions
// =============================================================================

const TYPE_KINDS = new Set([
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
]);

const DECLARATION_KINDS = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.VariableStatement,
  SyntaxKind.ClassDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.EnumDeclaration,
]);

function extractExports(sourceFile: SourceFile): ExportEntry[] {
  const entries: ExportEntry[] = [];
  const exportedDecls = sourceFile.getExportedDeclarations();

  for (const [name, declarations] of exportedDecls) {
    const decl = declarations[0];
    const kind = TYPE_KINDS.has(decl.getKind()) ? "type" : "value";
    entries.push({ name, kind, used: false });
  }

  return entries;
}

function extractImports(sourceFile: SourceFile): ImportRef[] {
  const imports: ImportRef[] = [];

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const targetFile = importDecl.getModuleSpecifierSourceFile();
    if (!targetFile) continue;

    const targetPath = targetFile.getFilePath();
    const namedImports = importDecl.getNamedImports();
    const defaultImport = importDecl.getDefaultImport();
    const namespaceImport = importDecl.getNamespaceImport();

    if (namespaceImport) {
      imports.push({ targetFile: targetPath, names: [], isNamespace: true });
    } else {
      const names: string[] = [];
      if (defaultImport) names.push("default");
      for (const named of namedImports) {
        names.push(named.getName());
      }
      if (names.length > 0) {
        imports.push({ targetFile: targetPath, names, isNamespace: false });
      }
    }
  }

  return imports;
}

function findUnusedUnexported(sourceFile: SourceFile): UnusedSymbol[] {
  const unused: UnusedSymbol[] = [];
  const relPath = getSrcRelPath(sourceFile);

  for (const statement of sourceFile.getStatements()) {
    if (!DECLARATION_KINDS.has(statement.getKind())) continue;

    // VariableStatement may contain multiple declarations
    if (Node.isVariableStatement(statement)) {
      if (statement.isExported()) continue;
      for (const decl of statement.getDeclarations()) {
        const name = decl.getName();
        if (name.startsWith("_")) continue;
        const refs = decl.findReferencesAsNodes();
        if (refs.length === 0) {
          unused.push({ relPath, name, kind: "value" });
        }
      }
      continue;
    }

    if (
      Node.isFunctionDeclaration(statement) ||
      Node.isClassDeclaration(statement) ||
      Node.isEnumDeclaration(statement) ||
      Node.isInterfaceDeclaration(statement) ||
      Node.isTypeAliasDeclaration(statement)
    ) {
      if (statement.isExported()) continue;
      const name = statement.getName();
      if (!name || name.startsWith("_")) continue;
      const refs = statement.findReferencesAsNodes();
      if (refs.length === 0) {
        const kind = TYPE_KINDS.has(statement.getKind()) ? "type" : "value";
        unused.push({ relPath, name, kind });
      }
    }
  }

  return unused;
}

function buildReExportMap(srcSourceFiles: SourceFile[]): ReExportMap {
  const map: ReExportMap = new Map();
  // Cache: declaration node → export name (avoids repeated getExportedDeclarations)
  const declNameCache = new Map<Node, string>();

  function getOriginalName(decl: Node, declSourceFile: SourceFile): string {
    const cached = declNameCache.get(decl);
    if (cached !== undefined) return cached;

    // Populate cache for all exports in this source file at once
    for (const [
      origName,
      origDecls,
    ] of declSourceFile.getExportedDeclarations()) {
      for (const d of origDecls) {
        if (!declNameCache.has(d)) declNameCache.set(d, origName);
      }
    }

    return declNameCache.get(decl) ?? decl.getSourceFile().getBaseName();
  }

  for (const sf of srcSourceFiles) {
    const filePath = sf.getFilePath();

    for (const [name, declarations] of sf.getExportedDeclarations()) {
      const decl = declarations[0];
      const declSourceFile = decl.getSourceFile();
      const declFilePath = declSourceFile.getFilePath();
      if (declFilePath === filePath) continue;

      map.set(`${filePath}::${name}`, {
        sourceFile: declFilePath,
        originalName: getOriginalName(decl, declSourceFile),
      });
    }
  }

  return map;
}

// =============================================================================
// Shared-code functions
// =============================================================================

function classifyFile(relPath: string): Zone | null {
  if (relPath.startsWith("pages/")) {
    for (const group of PAGE_GROUPS) {
      if (relPath.startsWith(`pages/${group}/`)) return group;
    }
    return null;
  }
  for (const zone of UI_ZONES) {
    if (relPath.startsWith(`${zone}/`)) return zone;
  }
  return null;
}

function parseBarrel(
  barrelFile: SourceFile,
  kind: SharedDir,
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

  const extra = EXTRA_SHARED_CONSUMERS[sharedExport.kind];
  if (extra?.some((z) => zones.has(z))) return true;

  return false;
}

function checkUiSharedCode(srcFiles: SourceFile[]): string[] {
  const errors: string[] = [];

  const uiFiles = srcFiles.filter((sf) =>
    sf.getFilePath().startsWith(UI_DIR + "/"),
  );

  const sharedExports: SharedExport[] = [];
  for (const dir of SHARED_UI_DIRS) {
    const barrel = uiFiles.find((sf) =>
      sf.getFilePath().endsWith(`/${dir}/index.ts`),
    );
    if (barrel) sharedExports.push(...parseBarrel(barrel, dir));
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

    const sfRel = getSrcRelPath(sf);
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

    if (count < MIN_UTIL_CONSUMERS) {
      const detail =
        count === 0
          ? "not imported by any entity"
          : `only used by: ${[...entities!].join(", ")}`;
      errors.push(
        `utils/${name}.ts ${detail} → Must be used by ${MIN_UTIL_CONSUMERS}+ entities`,
      );
    }
  }

  return errors;
}

// =============================================================================
// Main
// =============================================================================

const project = new Project({
  tsConfigFilePath: join(ROOT, "tsconfig.json"),
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths([
  join(SRC_DIR, "**/*.{ts,tsx}"),
  join(ROOT, "scripts/**/*.ts"),
  join(ROOT, "e2e/**/*.ts"),
]);

const allSourceFiles = project.getSourceFiles();
const srcFiles = allSourceFiles.filter((sf) =>
  sf.getFilePath().startsWith(SRC_DIR + "/"),
);

// --- Dead code analysis ---

const analyzedFiles = srcFiles.filter(
  (sf) => !isTestFile(sf.getFilePath()) && !isEntryPoint(sf.getFilePath()),
);
const fileExports: FileExports[] = [];
for (const sf of analyzedFiles) {
  const exports = extractExports(sf);
  if (exports.length > 0) {
    fileExports.push({
      sourceFile: sf,
      relPath: getSrcRelPath(sf),
      exports,
    });
  }
}

// Build re-export map
const reExportMap = buildReExportMap(analyzedFiles);

// Mark exports as used
const exportsByFile = new Map<string, FileExports>();
for (const fe of fileExports) {
  exportsByFile.set(fe.sourceFile.getFilePath(), fe);
}

function markUsed(targetFile: string, name: string): void {
  const fe = exportsByFile.get(targetFile);
  if (!fe) return;

  const entry = fe.exports.find((e) => e.name === name);
  if (entry) entry.used = true;

  // Propagate through re-exports
  const reExport = reExportMap.get(`${targetFile}::${name}`);
  if (reExport) {
    markUsed(reExport.sourceFile, reExport.originalName);
  }
}

function markAllUsed(targetFile: string): void {
  const fe = exportsByFile.get(targetFile);
  if (!fe) return;
  for (const entry of fe.exports) {
    entry.used = true;
    const reExport = reExportMap.get(`${targetFile}::${entry.name}`);
    if (reExport) {
      markUsed(reExport.sourceFile, reExport.originalName);
    }
  }
}

for (const sf of allSourceFiles) {
  for (const imp of extractImports(sf)) {
    if (imp.isNamespace) {
      markAllUsed(imp.targetFile);
    } else {
      for (const name of imp.names) {
        markUsed(imp.targetFile, name);
      }
    }
  }
}

// Report unused exports
const unusedValues: { relPath: string; names: string[] }[] = [];
const unusedTypes: { relPath: string; names: string[] }[] = [];
const fullyUnused: string[] = [];

for (const fe of fileExports) {
  const unusedV = fe.exports.filter((e) => !e.used && e.kind === "value");
  const unusedT = fe.exports.filter((e) => !e.used && e.kind === "type");
  const allUnused = fe.exports.every((e) => !e.used);

  if (allUnused && fe.exports.length > 0) {
    fullyUnused.push(fe.relPath);
  }

  if (unusedV.length > 0) {
    unusedValues.push({
      relPath: fe.relPath,
      names: unusedV.map((e) => e.name),
    });
  }
  if (unusedT.length > 0) {
    unusedTypes.push({
      relPath: fe.relPath,
      names: unusedT.map((e) => e.name),
    });
  }
}

// Find unused unexported symbols
const unusedUnexportedValues: UnusedSymbol[] = [];
const unusedUnexportedTypes: UnusedSymbol[] = [];

for (const sf of analyzedFiles) {
  const symbols = findUnusedUnexported(sf);
  for (const sym of symbols) {
    if (sym.kind === "value") {
      unusedUnexportedValues.push(sym);
    } else {
      unusedUnexportedTypes.push(sym);
    }
  }
}

let hasErrors = false;

if (fullyUnused.length > 0) {
  console.error("\nFully unused files (all exports unused):\n");
  for (const f of fullyUnused) {
    console.error(`  ${f}`);
  }
  hasErrors = true;
}

if (unusedValues.length > 0) {
  console.error("\nUnused value exports:\n");
  for (const { relPath, names } of unusedValues) {
    console.error(`  ${relPath}: ${names.join(", ")}`);
  }
  hasErrors = true;
}

if (unusedTypes.length > 0) {
  console.log("\nUnused type exports (informational):\n");
  for (const { relPath, names } of unusedTypes) {
    console.log(`  ${relPath}: ${names.join(", ")}`);
  }
}

if (unusedUnexportedValues.length > 0) {
  console.error("\nUnused unexported symbols:\n");
  for (const { relPath, name } of unusedUnexportedValues) {
    console.error(`  ${relPath}: ${name}`);
  }
  hasErrors = true;
}

if (unusedUnexportedTypes.length > 0) {
  console.log("\nUnused unexported types (informational):\n");
  for (const { relPath, name } of unusedUnexportedTypes) {
    console.log(`  ${relPath}: ${name}`);
  }
}

// --- Shared code analysis ---

const uiErrors = checkUiSharedCode(srcFiles);
const utilsErrors = checkUtils(srcFiles);

if (uiErrors.length > 0) {
  console.error("\nUI shared code violations:\n");
  for (const msg of uiErrors) {
    console.error(`  ${msg}\n`);
  }
  hasErrors = true;
}

if (utilsErrors.length > 0) {
  console.error("\nUtils violations:\n");
  for (const msg of utilsErrors) {
    console.error(`  ${msg}\n`);
  }
  hasErrors = true;
}

// --- Result ---

if (hasErrors) {
  process.exit(1);
} else {
  console.log("Dead code detection: OK");
  console.log("Shared code placement: OK");
}
