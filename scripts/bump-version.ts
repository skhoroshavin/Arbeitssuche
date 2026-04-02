import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.join(import.meta.dirname, "..");
const BUMP_ARGS = ["dev", "major", "minor", "patch"] as const;
const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-(dev))?$/;
const PKG_PATH = path.join(ROOT, "package.json");
const LOCK_PATH = path.join(ROOT, "package-lock.json");

// Only run when executed directly, not when imported for testing
if (import.meta.url === `file://${process.argv[1]}`) main();

function main() {
  const arguments_ = process.argv.slice(2);
  const validCommands: Set<string> = new Set(BUMP_ARGS);
  const isBumpArgument = (s: string): s is BumpArgument => validCommands.has(s);
  const command = arguments_.find(isBumpArgument);
  const noGit = arguments_.includes("--no-git");

  if (!command) {
    throw new Error(`Missing command. Valid: ${BUMP_ARGS.join(", ")}`);
  }

  if (arguments_.some((a) => a !== command && a !== "--no-git")) {
    throw new Error(
      `Unknown argument. Valid: ${BUMP_ARGS.join(", ")}, --no-git`,
    );
  }

  if (!noGit) {
    // Check clean working tree
    const status = execSync("git status --porcelain", {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    if (status) {
      throw new Error(
        "Working tree is not clean. Commit or stash changes first.",
      );
    }
  }

  // Read current version
  const packageRaw: unknown = JSON.parse(readFileSync(PKG_PATH, "utf8"));
  if (!isPackageJson(packageRaw)) throw new Error("Invalid package.json");
  const package_ = packageRaw;
  const currentVersion: string = package_.version;
  const parsed = parseVersion(currentVersion);

  // Compute next version
  const next = computeNextVersion(parsed, command);
  const nextString = formatVersion(next);

  // Update files
  bumpFiles(package_, nextString);

  if (noGit) {
    // Output version for CI consumption
    process.stdout.write(nextString);
    return;
  }

  // Git commit
  execSync(`git add package.json package-lock.json`, {
    cwd: ROOT,
    stdio: "inherit",
  });
  execSync(`git commit -m "Bump version to ${nextString}"`, {
    cwd: ROOT,
    stdio: "inherit",
  });

  console.log(`\nBumped ${currentVersion} → ${nextString}`);
  console.log("Push with: git push");
}

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: "dev" | undefined;
}

export function parseVersion(version: string): ParsedVersion {
  const m = VERSION_RE.exec(version);
  if (!m) throw new Error(`Invalid version: ${version}`);

  const [, major, minor, patch, pre] = m;

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: pre === "dev" ? "dev" : undefined,
  };
}

export function computeNextVersion(
  current: ParsedVersion,
  command: BumpArgument,
): ParsedVersion {
  if (command === "dev") {
    if (current.prerelease === "dev") {
      throw new Error("Already a dev version");
    }
    return { ...current, prerelease: "dev" };
  }

  // major / minor / patch — must be dev
  if (current.prerelease !== "dev") {
    throw new Error(
      `${command} bump requires a -dev version, got ${formatVersion(current)}`,
    );
  }

  switch (command) {
    case "major": {
      return {
        major: current.major + 1,
        minor: 0,
        patch: 0,
        prerelease: undefined,
      };
    }
    case "minor": {
      return {
        ...current,
        minor: current.minor + 1,
        patch: 0,
        prerelease: undefined,
      };
    }
    case "patch": {
      return { ...current, patch: current.patch + 1, prerelease: undefined };
    }
  }
}

export function formatVersion(v: ParsedVersion): string {
  const base = `${v.major}.${v.minor}.${v.patch}`;
  return v.prerelease === "dev" ? `${base}-dev` : base;
}

function bumpFiles(package_: PackageJson, nextVersion: string): void {
  package_.version = nextVersion;
  writeFileSync(PKG_PATH, JSON.stringify(package_, undefined, 2) + "\n");

  const lockRaw: unknown = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
  if (!isPackageJson(lockRaw)) throw new Error("Invalid package-lock.json");
  const lock = lockRaw;
  lock.version = nextVersion;
  if (lock.packages?.[""]?.version) {
    lock.packages[""].version = nextVersion;
  }
  writeFileSync(LOCK_PATH, JSON.stringify(lock, undefined, 2) + "\n");
}

type BumpArgument = (typeof BUMP_ARGS)[number];

function isPackageJson(value: unknown): value is PackageJson {
  if (!isRecord(value)) return false;
  if (typeof value.version !== "string") return false;
  if (value.packages === undefined) return true;
  if (!isRecord(value.packages)) return false;

  return Object.values(value.packages).every(isPackageEntry);
}

function isPackageEntry(value: unknown): value is { version?: string } {
  if (!isRecord(value)) return false;
  return value.version === undefined || typeof value.version === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

interface PackageJson {
  version: string;
  packages?: Record<string, { version?: string }>;
  [key: string]: unknown;
}
