import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT = join(import.meta.dirname, "..");
const PKG_PATH = join(ROOT, "package.json");
const LOCK_PATH = join(ROOT, "package-lock.json");

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: "dev" | null;
}

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-(dev))?$/;

export function parseVersion(version: string): ParsedVersion {
  const m = VERSION_RE.exec(version);
  if (!m) throw new Error(`Invalid version: ${version}`);

  const [, major, minor, patch, pre] = m;

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: pre === "dev" ? "dev" : null,
  };
}

export function formatVersion(v: ParsedVersion): string {
  const base = `${v.major}.${v.minor}.${v.patch}`;
  return v.prerelease === "dev" ? `${base}-dev` : base;
}

const BUMP_ARGS = ["dev", "major", "minor", "patch"] as const;
type BumpArg = (typeof BUMP_ARGS)[number];

export function computeNextVersion(
  current: ParsedVersion,
  command: BumpArg,
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
    case "major":
      return { major: current.major + 1, minor: 0, patch: 0, prerelease: null };
    case "minor":
      return {
        ...current,
        minor: current.minor + 1,
        patch: 0,
        prerelease: null,
      };
    case "patch":
      return { ...current, patch: current.patch + 1, prerelease: null };
  }
}

// --- CLI ---

function bumpFiles(nextVersion: string): void {
  const pkg: { version: string } = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
  pkg.version = nextVersion;
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");

  const lock = JSON.parse(readFileSync(LOCK_PATH, "utf-8"));
  lock.version = nextVersion;
  if (lock.packages?.[""]?.version) {
    lock.packages[""].version = nextVersion;
  }
  writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + "\n");
}

function main() {
  const args = process.argv.slice(2);
  const validCommands: Set<string> = new Set(BUMP_ARGS);
  const isBumpArg = (s: string): s is BumpArg => validCommands.has(s);
  const command = args.find(isBumpArg);
  const noGit = args.includes("--no-git");

  if (!command) {
    console.error(`Error: Missing command. Valid: ${BUMP_ARGS.join(", ")}`);
    process.exit(1);
  }

  if (args.some((a) => a !== command && a !== "--no-git")) {
    console.error(
      `Error: Unknown argument. Valid: ${BUMP_ARGS.join(", ")}, --no-git`,
    );
    process.exit(1);
  }

  if (!noGit) {
    // Check clean working tree
    const status = execSync("git status --porcelain", {
      cwd: ROOT,
      encoding: "utf-8",
    }).trim();
    if (status) {
      console.error(
        "Error: Working tree is not clean. Commit or stash changes first.",
      );
      process.exit(1);
    }
  }

  // Read current version
  const pkg: { version: string } = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
  const currentVersion = pkg.version;
  const parsed = parseVersion(currentVersion);

  // Compute next version
  const next = computeNextVersion(parsed, command);
  const nextStr = formatVersion(next);

  // Update files
  bumpFiles(nextStr);

  if (noGit) {
    // Output version for CI consumption
    process.stdout.write(nextStr);
    return;
  }

  // Git commit
  execSync(`git add package.json package-lock.json`, {
    cwd: ROOT,
    stdio: "inherit",
  });
  execSync(`git commit -m "Bump version to ${nextStr}"`, {
    cwd: ROOT,
    stdio: "inherit",
  });

  // Tag if not dev
  const shouldTag = command !== "dev";
  if (shouldTag) {
    execSync(`git tag v${nextStr}`, { cwd: ROOT, stdio: "inherit" });
    console.log(`\nBumped ${currentVersion} → ${nextStr} (tagged v${nextStr})`);
    console.log("Push with: git push && git push --tags");
  } else {
    console.log(`\nBumped ${currentVersion} → ${nextStr}`);
    console.log("Push with: git push");
  }
}

// Only run when executed directly, not when imported for testing
if (import.meta.url === `file://${process.argv[1]}`) main();
