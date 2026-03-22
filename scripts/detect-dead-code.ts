import { readFileSync, readdirSync } from "fs";
import { join, relative, resolve, dirname } from "path";

const ROOT = join(import.meta.dirname, "..");
const SRC_DIR = join(ROOT, "src");

// =============================================================================
// Types
// =============================================================================

interface FileExports {
  path: string;
  relPath: string;
  exports: ExportEntry[];
}

interface ExportEntry {
  name: string;
  kind: "value" | "type";
  used: boolean;
}

interface ReExport {
  sourceFile: string;
  originalName: string;
}

// =============================================================================
// File collection
// =============================================================================

function collectFiles(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "out") continue;
      results.push(...collectFiles(full, ext));
    } else if (ext.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

// =============================================================================
// Export extraction
// =============================================================================

function extractExports(
  content: string,
): { name: string; kind: "value" | "type" }[] {
  const exports: { name: string; kind: "value" | "type" }[] = [];

  // export (const|let|function|class|enum|abstract class) NAME
  const declRe =
    /^export\s+(?:abstract\s+)?(?:async\s+)?(const|let|function|class|enum)\s+(\w+)/gm;
  let m: RegExpExecArray | null;
  while ((m = declRe.exec(content)) !== null) {
    exports.push({ name: m[2], kind: "value" });
  }

  // export (type|interface) NAME
  const typeRe = /^export\s+(type|interface)\s+(\w+)/gm;
  while ((m = typeRe.exec(content)) !== null) {
    exports.push({ name: m[2], kind: "type" });
  }

  // export default
  if (/^export\s+default\s/m.test(content)) {
    exports.push({ name: "default", kind: "value" });
  }

  // export (type)? { names } (from "path")?
  const braceRe = /^export\s+(?:type\s+)?\{([^}]+)\}/gm;
  while ((m = braceRe.exec(content)) !== null) {
    const isTypeExport = /^export\s+type\s+\{/.test(m[0]);
    const names = m[1].split(",").map((n) => n.trim());
    for (const raw of names) {
      if (!raw) continue;
      const aliasMatch = raw.match(/(?:\w+)\s+as\s+(\w+)/);
      const typePrefix = raw.startsWith("type ");
      const name = aliasMatch
        ? aliasMatch[1]
        : typePrefix
          ? raw.replace(/^type\s+/, "")
          : raw;
      const kind = isTypeExport || typePrefix ? "type" : "value";
      exports.push({ name, kind });
    }
  }

  return exports;
}

// =============================================================================
// Re-export tracking
// =============================================================================

/** Map from "file::exportedName" → { sourceFile, originalName } */
type ReExportMap = Map<string, ReExport>;

function buildReExportMap(
  files: Map<string, string>,
): ReExportMap {
  const map: ReExportMap = new Map();
  const reExportRe =
    /^export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']([^"']+)["']/gm;

  for (const [filePath, content] of files) {
    let m: RegExpExecArray | null;
    while ((m = reExportRe.exec(content)) !== null) {
      const names = m[1].split(",").map((n) => n.trim());
      const importPath = m[2];
      const resolved = resolveImportPath(importPath, dirname(filePath));
      if (!resolved) continue;

      for (const raw of names) {
        if (!raw) continue;
        const aliasMatch = raw.match(/(\w+)\s+as\s+(\w+)/);
        const originalName = aliasMatch
          ? aliasMatch[1].replace(/^type\s+/, "")
          : raw.replace(/^type\s+/, "");
        const exportedName = aliasMatch ? aliasMatch[2] : originalName;
        map.set(`${filePath}::${exportedName}`, {
          sourceFile: resolved,
          originalName,
        });
      }
    }
  }

  return map;
}

// =============================================================================
// Import extraction
// =============================================================================

interface ImportRef {
  importerPath: string;
  targetFile: string;
  names: string[];
  isNamespace: boolean;
}

function extractImports(
  filePath: string,
  content: string,
): ImportRef[] {
  const imports: ImportRef[] = [];
  const importerDir = dirname(filePath);

  // import { names } from "path"  /  import type { names } from "path"
  const namedRe =
    /^import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']([^"']+)["']/gm;
  let m: RegExpExecArray | null;
  while ((m = namedRe.exec(content)) !== null) {
    const resolved = resolveImportPath(m[2], importerDir);
    if (!resolved) continue;
    const names = m[1]
      .split(",")
      .map((n) => {
        const trimmed = n.trim().replace(/^type\s+/, "");
        const aliasMatch = trimmed.match(/(\w+)\s+as\s+\w+/);
        return aliasMatch ? aliasMatch[1] : trimmed;
      })
      .filter(Boolean);
    imports.push({ importerPath: filePath, targetFile: resolved, names, isNamespace: false });
  }

  // import Name from "path"
  const defaultRe =
    /^import\s+(\w+)\s+from\s+["']([^"']+)["']/gm;
  while ((m = defaultRe.exec(content)) !== null) {
    // Skip if it looks like "import type" or a named import
    if (m[1] === "type") continue;
    const resolved = resolveImportPath(m[2], importerDir);
    if (!resolved) continue;
    imports.push({
      importerPath: filePath,
      targetFile: resolved,
      names: ["default"],
      isNamespace: false,
    });
  }

  // import * as Name from "path"
  const nsRe = /^import\s+\*\s+as\s+\w+\s+from\s+["']([^"']+)["']/gm;
  while ((m = nsRe.exec(content)) !== null) {
    const resolved = resolveImportPath(m[1], importerDir);
    if (!resolved) continue;
    imports.push({
      importerPath: filePath,
      targetFile: resolved,
      names: [],
      isNamespace: true,
    });
  }

  return imports;
}

// =============================================================================
// Path resolution
// =============================================================================

function resolveImportPath(
  importPath: string,
  importerDir: string,
): string | null {
  let basePath: string;

  if (importPath.startsWith("@/")) {
    basePath = join(SRC_DIR, importPath.slice(2).replace(/\.js$/, ""));
  } else if (importPath.startsWith("./") || importPath.startsWith("../")) {
    basePath = resolve(importerDir, importPath.replace(/\.js$/, ""));
  } else {
    return null; // bare specifier (node_modules)
  }

  const candidates = [
    `${basePath}.ts`,
    `${basePath}.tsx`,
    join(basePath, "index.ts"),
    join(basePath, "index.tsx"),
  ];

  for (const c of candidates) {
    if (allFilePaths.has(c)) return c;
  }
  return null;
}

// =============================================================================
// Entry point detection
// =============================================================================

function isEntryPoint(filePath: string): boolean {
  const rel = relative(SRC_DIR, filePath);
  if (rel === "app/main.ts" || rel === "app/preload.ts" || rel === "ui/main.tsx") {
    return true;
  }
  return false;
}

function isTestFile(filePath: string): boolean {
  return (
    filePath.endsWith(".test.ts") ||
    filePath.endsWith(".integration-test.ts") ||
    filePath.endsWith(".test-suite.ts")
  );
}

// =============================================================================
// Main
// =============================================================================

// Collect all files
const srcFiles = collectFiles(SRC_DIR, [".ts", ".tsx"]);
const scriptFiles = collectFiles(join(ROOT, "scripts"), [".ts"]);
const e2eFiles = collectFiles(join(ROOT, "e2e"), [".ts"]);

const allFiles = [...srcFiles, ...scriptFiles, ...e2eFiles];
const allFilePaths = new Set(allFiles);

// Read file contents
const fileContents = new Map<string, string>();
for (const f of allFiles) {
  fileContents.set(f, readFileSync(f, "utf-8"));
}

// Extract exports from src/ files (excluding test files and entry points)
const fileExports: FileExports[] = [];
for (const f of srcFiles) {
  if (isTestFile(f) || isEntryPoint(f)) continue;
  const content = fileContents.get(f)!;
  const exports = extractExports(content);
  if (exports.length > 0) {
    fileExports.push({
      path: f,
      relPath: relative(SRC_DIR, f),
      exports: exports.map((e) => ({ ...e, used: false })),
    });
  }
}

// Build re-export map
const reExportMap = buildReExportMap(fileContents);

// Collect all imports from all files
const allImports: ImportRef[] = [];
for (const [filePath, content] of fileContents) {
  allImports.push(...extractImports(filePath, content));
}

// Mark exports as used
const exportsByFile = new Map<string, FileExports>();
for (const fe of fileExports) {
  exportsByFile.set(fe.path, fe);
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

for (const imp of allImports) {
  if (imp.isNamespace) {
    markAllUsed(imp.targetFile);
  } else {
    for (const name of imp.names) {
      markUsed(imp.targetFile, name);
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
    unusedValues.push({ relPath: fe.relPath, names: unusedV.map((e) => e.name) });
  }
  if (unusedT.length > 0) {
    unusedTypes.push({ relPath: fe.relPath, names: unusedT.map((e) => e.name) });
  }
}

// Output
let hasFindings = false;

if (fullyUnused.length > 0) {
  console.error("\nFully unused files (all exports unused):\n");
  for (const f of fullyUnused) {
    console.error(`  ${f}`);
  }
  hasFindings = true;
}

if (unusedValues.length > 0) {
  console.error("\nUnused value exports:\n");
  for (const { relPath, names } of unusedValues) {
    console.error(`  ${relPath}: ${names.join(", ")}`);
  }
  hasFindings = true;
}

if (unusedTypes.length > 0) {
  console.log("\nUnused type exports (informational):\n");
  for (const { relPath, names } of unusedTypes) {
    console.log(`  ${relPath}: ${names.join(", ")}`);
  }
}

if (hasFindings) {
  process.exit(1);
} else {
  console.log("Dead code detection: OK");
}
