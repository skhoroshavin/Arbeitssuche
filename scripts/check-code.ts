import { existsSync, readdirSync } from "fs";
import { join, relative } from "path";
import { Project, SyntaxKind, type SourceFile, Node } from "ts-morph";

// =============================================================================
// Configuration
// =============================================================================

const ROOT = join(import.meta.dirname, "..");
const SRC_DIR = join(ROOT, "src");

interface DirConfig {
  dir: string;
  allowedImports?: string[];
  exposedFiles?: string[];
  allowedExports?: RegExp | string[];
  shared?: boolean;
  requireTests?: boolean;
  requireIntegrationTests?: boolean;
  private?: boolean;
}

const EXPORT_CONVENTION = /^(?:create[A-Z]|derive[A-Z]|get[A-Z]|[A-Z])/;

const CHECKED_DIRS: DirConfig[] = [
  // Backend layers (self-imports are implicit — only list OTHER allowed dirs)
  { dir: "utils", shared: true, requireTests: true },
  { dir: "models" },
  {
    dir: "plugins",
    allowedImports: ["utils"],
    exposedFiles: ["index.ts", "types.ts"],
    allowedExports: EXPORT_CONVENTION,
  },
  {
    dir: "repositories",
    allowedImports: ["models", "utils"],
    exposedFiles: ["index.ts", "types.ts"],
    allowedExports: EXPORT_CONVENTION,
  },
  {
    dir: "services",
    allowedImports: ["models", "plugins", "repositories", "utils"],
    exposedFiles: ["index.ts", "types.ts"],
    allowedExports: EXPORT_CONVENTION,
  },
  {
    dir: "app",
    allowedImports: ["models", "plugins", "repositories", "services", "utils"],
  },

  // UI sub-layers (self-imports implicit)
  { dir: "ui/hooks", allowedImports: ["models"], shared: true },
  { dir: "ui/hooks/internal", private: true },
  { dir: "ui/data", allowedImports: ["models", "ui/hooks"] },
  { dir: "ui/data/internal", private: true },
  {
    dir: "ui/components",
    allowedImports: ["models", "ui/hooks"],
    shared: true,
  },
  { dir: "ui/layout", allowedImports: ["models", "ui/components", "ui/hooks"] },
  { dir: "ui/constants", allowedImports: ["models"] },
  {
    dir: "ui/pages/*",
    allowedImports: [
      "models",
      "ui/components",
      "ui/hooks",
      "ui/data",
      "ui/layout",
      "ui/constants",
    ],
  },

  // Job-site plugin exports (explicit per site)
  {
    dir: "plugins/job-site/arbeitsagentur",
    allowedExports: ["createArbeitsagenturSite", "SUPPORTED_MODES"],
  },
  {
    dir: "plugins/job-site/dm",
    allowedExports: ["createDmSite", "SUPPORTED_MODES"],
  },
  {
    dir: "plugins/job-site/xing",
    allowedExports: ["createXingSite", "SUPPORTED_MODES"],
  },
  {
    dir: "plugins/job-site/zalando",
    allowedExports: ["createZalandoSite", "SUPPORTED_MODES"],
  },
];

// Modules excluded from all checks.
const EXCLUDED_MODULES = new Set(["Icons"]);

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
// Import/export helpers
// =============================================================================

/** Expand wildcard `*` in dir paths (e.g. `ui/pages/*`) to actual subdirs. */
function expandWildcardDirs(configs: DirConfig[]): DirConfig[] {
  const expanded: DirConfig[] = [];

  for (const config of configs) {
    if (config.dir.endsWith("/*")) {
      const parentDir = join(SRC_DIR, config.dir.slice(0, -2));
      if (!existsSync(parentDir)) continue;

      for (const entry of readdirSync(parentDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          expanded.push({
            ...config,
            dir: config.dir.slice(0, -1) + entry.name,
          });
        }
      }
    } else {
      expanded.push(config);
    }
  }

  return expanded;
}

/** Check if srcRelPath is within a dir (or IS the file for single-file modules). */
function isInDir(srcRelPath: string, dir: string): boolean {
  return (
    srcRelPath.startsWith(dir + "/") ||
    srcRelPath === dir + ".ts" ||
    srcRelPath === dir + ".tsx"
  );
}

/**
 * Pre-sorted config index for O(n) lookups instead of repeated filter+sort.
 * Configs are sorted longest-first so linear scan finds most-specific match.
 */
function buildConfigIndex(configs: DirConfig[]): DirConfig[] {
  return [...configs].sort((a, b) => b.dir.length - a.dir.length);
}

/** Find most specific DirConfig matching a srcRelPath. */
function matchDir(
  srcRelPath: string,
  sorted: DirConfig[],
): DirConfig | undefined {
  return sorted.find((c) => isInDir(srcRelPath, c.dir));
}

/** Find most specific config with a given property defined. */
function matchDirWith<K extends keyof DirConfig>(
  srcRelPath: string,
  sorted: DirConfig[],
  prop: K,
): DirConfig | undefined {
  return sorted.find(
    (c) => c[prop] !== undefined && isInDir(srcRelPath, c.dir),
  );
}

/**
 * Find the effective import config for a file. Walks up the config hierarchy
 * to find the nearest ancestor with `allowedImports`. If none has it,
 * returns the most specific config with allowedImports defaulting to []
 * (self-imports only).
 */
function findImportConfig(
  srcRelPath: string,
  sorted: DirConfig[],
): DirConfig | undefined {
  const config = matchDirWith(srcRelPath, sorted, "allowedImports");
  if (config) return config;

  // No ancestor has allowedImports → self-imports only
  const closest = matchDir(srcRelPath, sorted);
  return closest ? { ...closest, allowedImports: [] } : undefined;
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

function deriveEntity(srcRelPath: string): string {
  const parts = srcRelPath.split("/");
  return parts.slice(0, Math.min(parts.length - 1, 3)).join("/");
}

function listModules(absDirPath: string): { name: string; filePath: string }[] {
  return readdirSync(absDirPath, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) &&
        !isTestFile(e.name) &&
        e.name !== "index.ts",
    )
    .map((e) => ({
      name: e.name.replace(/\.[^.]+$/, ""),
      filePath: join(absDirPath, e.name),
    }));
}

function buildBarrelMap(barrelFile: SourceFile): Map<string, string> {
  const map = new Map<string, string>();

  for (const exportDecl of barrelFile.getExportDeclarations()) {
    if (exportDecl.isTypeOnly()) continue;

    const targetSf = exportDecl.getModuleSpecifierSourceFile();
    if (!targetSf) continue;
    const targetPath = targetSf.getFilePath();

    for (const named of exportDecl.getNamedExports()) {
      if (named.isTypeOnly()) continue;
      map.set(named.getName(), targetPath);
    }
  }

  return map;
}

interface ModuleInfo {
  dir: string;
  name: string;
  consumers: Set<string>;
  shared: boolean;
  requireTests: boolean;
}

interface SetupResult {
  modulesByFile: Map<string, ModuleInfo>;
  barrelMaps: Map<string, Map<string, string>>;
  dirPrefixes: string[];
}

function setupModules(
  configs: DirConfig[],
  srcFiles: SourceFile[],
): SetupResult {
  const modulesByFile = new Map<string, ModuleInfo>();
  const barrelMaps = new Map<string, Map<string, string>>();
  const dirPrefixes: string[] = [];

  for (const config of configs) {
    const absDir = join(SRC_DIR, config.dir);
    const modules = listModules(absDir);
    const dirPrefix = absDir + "/";
    dirPrefixes.push(dirPrefix);

    for (const mod of modules) {
      modulesByFile.set(mod.filePath, {
        dir: config.dir,
        name: mod.name,
        consumers: new Set(),
        shared: config.shared ?? false,
        requireTests: config.requireTests ?? false,
      });
    }

    const barrelPath = join(absDir, "index.ts");
    const barrelSf = srcFiles.find((sf) => sf.getFilePath() === barrelPath);
    if (barrelSf) {
      barrelMaps.set(barrelPath, buildBarrelMap(barrelSf));
    }
  }

  return { modulesByFile, barrelMaps, dirPrefixes };
}

function countConsumers(
  srcFiles: SourceFile[],
  modulesByFile: Map<string, ModuleInfo>,
  barrelMaps: Map<string, Map<string, string>>,
  dirPrefixes: string[],
): void {
  for (const sf of srcFiles) {
    const sfPath = sf.getFilePath();
    if (dirPrefixes.some((p) => sfPath.startsWith(p))) continue;

    const entity = deriveEntity(getSrcRelPath(sf));

    for (const importDecl of sf.getImportDeclarations()) {
      const targetFile = importDecl.getModuleSpecifierSourceFile();
      if (!targetFile) continue;
      const targetPath = targetFile.getFilePath();

      // Direct module import
      const modInfo = modulesByFile.get(targetPath);
      if (modInfo) {
        modInfo.consumers.add(entity);
        continue;
      }

      // Barrel import — resolve named imports to module files
      const barrelMap = barrelMaps.get(targetPath);
      if (!barrelMap) continue;

      const namedImports = importDecl.getNamedImports();
      for (const named of namedImports) {
        const moduleFilePath = barrelMap.get(named.getName());
        if (moduleFilePath) {
          const info = modulesByFile.get(moduleFilePath);
          if (info) info.consumers.add(entity);
        }
      }

      // Namespace import — count for all modules in the barrel
      if (importDecl.getNamespaceImport()) {
        for (const moduleFilePath of barrelMap.values()) {
          const info = modulesByFile.get(moduleFilePath);
          if (info) info.consumers.add(entity);
        }
      }
    }
  }
}

function reportErrors(modulesByFile: Map<string, ModuleInfo>): string[] {
  const errors: string[] = [];

  for (const [filePath, info] of modulesByFile) {
    if (EXCLUDED_MODULES.has(info.name)) continue;

    if (info.requireTests) {
      const testPath = filePath.replace(/\.[^.]+$/, ".test.ts");
      if (!existsSync(testPath)) {
        errors.push(
          `${info.dir}/${info.name}.ts has no test → Create ${info.dir}/${info.name}.test.ts`,
        );
      }
    }

    if (info.shared && info.consumers.size < 2) {
      const detail =
        info.consumers.size === 0
          ? "not imported by any entity"
          : `only used by: ${[...info.consumers].join(", ")}`;
      errors.push(
        `${info.dir}/${info.name} ${detail} → Must be used by 2+ entities`,
      );
    }
  }

  return errors;
}

function checkDirs(configs: DirConfig[], srcFiles: SourceFile[]): string[] {
  const { modulesByFile, barrelMaps, dirPrefixes } = setupModules(
    configs,
    srcFiles,
  );
  countConsumers(srcFiles, modulesByFile, barrelMaps, dirPrefixes);
  return reportErrors(modulesByFile);
}

// =============================================================================
// Import rules
// =============================================================================

function checkImportRules(
  srcFiles: SourceFile[],
  configs: DirConfig[],
): string[] {
  const errors: string[] = [];
  const sorted = buildConfigIndex(configs);

  for (const sf of srcFiles) {
    const filePath = sf.getFilePath();
    const srcRelPath = getSrcRelPath(sf);
    const isTest = isTestFile(filePath);

    const importConfig = findImportConfig(srcRelPath, sorted);
    const testExposedConfig = isTest
      ? matchDirWith(srcRelPath, sorted, "exposedFiles")
      : undefined;

    for (const importDecl of sf.getImportDeclarations()) {
      const specifier = importDecl.getModuleSpecifierValue();

      if (specifier.startsWith("@/")) {
        if (!importConfig) continue;

        const resolvedFile = importDecl.getModuleSpecifierSourceFile();
        if (!resolvedFile) continue;

        const targetRelPath = getSrcRelPath(resolvedFile);
        const isSelfImport = isInDir(targetRelPath, importConfig.dir);

        // Check allowedImports (self-imports always allowed)
        if (!isSelfImport) {
          const allowed = importConfig.allowedImports!;
          const isAllowed = allowed.some((prefix) =>
            isInDir(targetRelPath, prefix),
          );

          if (!isAllowed) {
            const targetDir = targetRelPath.split("/").slice(0, 2).join("/");
            const selfAndAllowed = [importConfig.dir, ...allowed]
              .map((d) => `@/${d}`)
              .join(", ");
            errors.push(
              `${srcRelPath}: @/${targetDir} is not allowed (from: ${selfAndAllowed})`,
            );
            continue;
          }
        }

        // Check exposedFiles on target dir
        const targetExposed = matchDirWith(
          targetRelPath,
          sorted,
          "exposedFiles",
        );
        if (targetExposed) {
          const filename = targetRelPath.split("/").pop()!;
          if (!targetExposed.exposedFiles!.includes(filename)) {
            errors.push(
              `${srcRelPath}: ${filename} is not importable from @/${targetExposed.dir}/ (only ${targetExposed.exposedFiles!.join(", ")})`,
            );
          }
        }

        // Check private dirs
        const targetConfig = matchDir(targetRelPath, sorted);
        if (targetConfig?.private) {
          const parentDir = targetConfig.dir.split("/").slice(0, -1).join("/");
          if (!srcRelPath.startsWith(parentDir + "/")) {
            errors.push(
              `${srcRelPath}: @/${targetConfig.dir}/ is private to ${parentDir}/`,
            );
          }
        }
      } else if (specifier.startsWith("./") && isTest && testExposedConfig) {
        // Black-box test rule: relative imports restricted
        if (
          specifier !== "./index.js" &&
          specifier !== "./types.js" &&
          !/^\.\/[\w-]+\.test-suite\.js$/.test(specifier)
        ) {
          errors.push(
            `${srcRelPath}: test must import from ./index.js, ./types.js, or ./*.test-suite.js`,
          );
        }
      }
    }
  }

  return errors;
}

// =============================================================================
// Export rules
// =============================================================================

function checkExportRules(
  srcFiles: SourceFile[],
  configs: DirConfig[],
): string[] {
  const errors: string[] = [];

  // Pre-index source files by relPath for O(1) lookup
  const sfByRelPath = new Map<string, SourceFile>();
  for (const sf of srcFiles) {
    if (!isTestFile(sf.getFilePath())) {
      sfByRelPath.set(getSrcRelPath(sf), sf);
    }
  }

  for (const config of configs) {
    if (!config.allowedExports) continue;

    if (config.allowedExports instanceof RegExp) {
      // Naming convention: check {dir}/*/index.ts (sub-module index files)
      const pattern = config.allowedExports;
      const dirParts = config.dir.split("/");
      const depth = dirParts.length + 2;

      for (const [rel, sf] of sfByRelPath) {
        const parts = rel.split("/");
        if (
          parts.length === depth &&
          parts[parts.length - 1] === "index.ts" &&
          rel.startsWith(config.dir + "/")
        ) {
          for (const [name] of sf.getExportedDeclarations()) {
            if (!pattern.test(name)) {
              errors.push(
                `${rel}: export "${name}" does not match convention ${pattern}`,
              );
            }
          }
        }
      }
    } else {
      // Explicit list: check {dir}/index.ts
      const rel = config.dir + "/index.ts";
      const sf = sfByRelPath.get(rel);
      if (!sf) continue;

      const allowedList = config.allowedExports;
      for (const [name] of sf.getExportedDeclarations()) {
        if (!allowedList.includes(name)) {
          errors.push(
            `${rel}: export "${name}" is not allowed (allowed: ${allowedList.join(", ")})`,
          );
        }
      }
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

const expandedConfigs = expandWildcardDirs(CHECKED_DIRS);
const sharedConfigs = expandedConfigs.filter((c) => c.shared || c.requireTests);
const dirErrors = checkDirs(sharedConfigs, srcFiles);

if (dirErrors.length > 0) {
  console.error("\nShared code violations:\n");
  for (const msg of dirErrors) {
    console.error(`  ${msg}\n`);
  }
  hasErrors = true;
}

// --- Import rules ---

const importErrors = checkImportRules(srcFiles, expandedConfigs);

if (importErrors.length > 0) {
  console.error("\nImport violations:\n");
  for (const msg of importErrors) {
    console.error(`  ${msg}`);
  }
  hasErrors = true;
}

// --- Export rules ---

const exportErrors = checkExportRules(srcFiles, expandedConfigs);

if (exportErrors.length > 0) {
  console.error("\nExport violations:\n");
  for (const msg of exportErrors) {
    console.error(`  ${msg}`);
  }
  hasErrors = true;
}

// --- Result ---

if (hasErrors) {
  process.exit(1);
} else {
  console.log("Dead code detection: OK");
  console.log("Shared code placement: OK");
  console.log("Import rules: OK");
  console.log("Export rules: OK");
}
