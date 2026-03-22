import { relative } from "path";
import { SyntaxKind, type SourceFile, Node } from "ts-morph";
import {
  createProject,
  SRC_DIR,
  isTestFile,
  isEntryPoint,
  getSrcRelPath,
} from "./lib/project.js";

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

// =============================================================================
// Export extraction
// =============================================================================

const TYPE_KINDS = new Set([
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
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

// =============================================================================
// Import extraction
// =============================================================================

interface ImportRef {
  targetFile: string;
  names: string[];
  isNamespace: boolean;
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

// =============================================================================
// Unused unexported symbol detection
// =============================================================================

interface UnusedSymbol {
  relPath: string;
  name: string;
  kind: "value" | "type";
}

const DECLARATION_KINDS = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.VariableStatement,
  SyntaxKind.ClassDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.EnumDeclaration,
]);

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

// =============================================================================
// Re-export map
// =============================================================================

/** Map from "file::exportedName" → { sourceFile, originalName } */
type ReExportMap = Map<string, { sourceFile: string; originalName: string }>;

function buildReExportMap(srcSourceFiles: SourceFile[]): ReExportMap {
  const map: ReExportMap = new Map();
  // Cache: declaration node → export name (avoids repeated getExportedDeclarations)
  const declNameCache = new Map<Node, string>();

  function getOriginalName(decl: Node, declSourceFile: SourceFile): string {
    const cached = declNameCache.get(decl);
    if (cached !== undefined) return cached;

    // Populate cache for all exports in this source file at once
    for (const [origName, origDecls] of declSourceFile.getExportedDeclarations()) {
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
// Main
// =============================================================================

const project = createProject();

const allSourceFiles = project.getSourceFiles();
const srcFiles = allSourceFiles.filter((sf) =>
  sf.getFilePath().startsWith(SRC_DIR + "/"),
);

// Extract exports from src/ files (excluding test files and entry points)
const analyzedFiles = srcFiles.filter(
  (sf) => !isTestFile(sf.getFilePath()) && !isEntryPoint(sf.getFilePath()),
);
const fileExports: FileExports[] = [];
for (const sf of analyzedFiles) {
  const exports = extractExports(sf);
  if (exports.length > 0) {
    fileExports.push({
      sourceFile: sf,
      relPath: relative(SRC_DIR, sf.getFilePath()),
      exports,
    });
  }
}

// Build re-export map
const reExportMap = buildReExportMap(analyzedFiles);

// Collect all imports from all files
const allImports: ImportRef[] = [];
for (const sf of allSourceFiles) {
  allImports.push(...extractImports(sf));
}

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

for (const sf of srcFiles) {
  const path = sf.getFilePath();
  if (isTestFile(path) || isEntryPoint(path)) continue;
  const symbols = findUnusedUnexported(sf);
  for (const sym of symbols) {
    if (sym.kind === "value") {
      unusedUnexportedValues.push(sym);
    } else {
      unusedUnexportedTypes.push(sym);
    }
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

if (unusedUnexportedValues.length > 0) {
  console.error("\nUnused unexported symbols:\n");
  for (const { relPath, name } of unusedUnexportedValues) {
    console.error(`  ${relPath}: ${name}`);
  }
  hasFindings = true;
}

if (unusedUnexportedTypes.length > 0) {
  console.log("\nUnused unexported types (informational):\n");
  for (const { relPath, name } of unusedUnexportedTypes) {
    console.log(`  ${relPath}: ${name}`);
  }
}

if (hasFindings) {
  process.exit(1);
} else {
  console.log("Dead code detection: OK");
}
