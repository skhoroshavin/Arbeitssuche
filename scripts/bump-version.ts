import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT = join(import.meta.dirname, "..");
const PKG_PATH = join(ROOT, "package.json");
const LOCK_PATH = join(ROOT, "package-lock.json");

export type Prerelease = "dev" | { rc: number };

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: Prerelease | null;
}

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-(dev|rc\.(\d+)))?$/;

export function parseVersion(version: string): ParsedVersion {
  const m = VERSION_RE.exec(version);
  if (!m) throw new Error(`Invalid version: ${version}`);

  const [, major, minor, patch, pre, rcNum] = m;
  let prerelease: Prerelease | null = null;
  if (pre === "dev") prerelease = "dev";
  else if (rcNum !== undefined) prerelease = { rc: Number(rcNum) };

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease,
  };
}

export function formatVersion(v: ParsedVersion): string {
  const base = `${v.major}.${v.minor}.${v.patch}`;
  if (v.prerelease === null) return base;
  if (v.prerelease === "dev") return `${base}-dev`;
  return `${base}-rc.${v.prerelease.rc}`;
}

type BumpArg = "dev" | "major" | "minor" | "patch" | "release";

export function computeNextVersion(
  current: ParsedVersion,
  command: BumpArg | null,
  rc: boolean,
): ParsedVersion {
  // No args → auto-detect
  if (command === null) {
    if (current.prerelease === "dev") {
      // dev → strip dev, bump patch → release
      return { ...current, patch: current.patch + 1, prerelease: null };
    }
    if (current.prerelease !== null && current.prerelease !== "dev") {
      // rc → increment N
      return {
        ...current,
        prerelease: { rc: current.prerelease.rc + 1 },
      };
    }
    throw new Error(
      `Cannot auto-detect bump for release version ${formatVersion(current)}. Specify major, minor, or patch.`,
    );
  }

  if (command === "dev") {
    if (current.prerelease === "dev") {
      throw new Error("Already a dev version");
    }
    return { ...current, prerelease: "dev" };
  }

  if (command === "release") {
    if (current.prerelease === null || current.prerelease === "dev") {
      throw new Error("release command requires an -rc.N version");
    }
    return { ...current, prerelease: null };
  }

  // major / minor / patch — must be dev
  if (current.prerelease !== "dev") {
    throw new Error(
      `${command} bump requires a -dev version, got ${formatVersion(current)}`,
    );
  }

  const suffix: Prerelease | null = rc ? { rc: 0 } : null;

  switch (command) {
    case "major":
      return {
        major: current.major + 1,
        minor: 0,
        patch: 0,
        prerelease: suffix,
      };
    case "minor":
      return {
        ...current,
        minor: current.minor + 1,
        patch: 0,
        prerelease: suffix,
      };
    case "patch":
      return { ...current, patch: current.patch + 1, prerelease: suffix };
  }
}

// --- CLI ---

function main() {
  const args = process.argv.slice(2);
  const validCommands: Set<string> = new Set([
    "dev",
    "major",
    "minor",
    "patch",
    "release",
  ]);
  const isBumpArg = (s: string): s is BumpArg => validCommands.has(s);
  const command: BumpArg | null =
    args[0] && isBumpArg(args[0]) ? args[0] : null;
  const rc = args.includes("rc");

  if (rc && (!command || !["major", "minor", "patch"].includes(command))) {
    console.error(
      "Error: rc flag can only be used with major, minor, or patch",
    );
    process.exit(1);
  }

  if (args.length > 0 && !command && !rc) {
    console.error(
      `Error: Unknown command "${args[0]}". Valid: dev, major, minor, patch, release`,
    );
    process.exit(1);
  }

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

  // Read current version
  const pkg: { version: string } = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
  const currentVersion = pkg.version;
  const parsed = parseVersion(currentVersion);

  // Compute next version
  const next = computeNextVersion(parsed, command, rc);
  const nextStr = formatVersion(next);

  // Update package.json
  pkg.version = nextStr;
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");

  // Update package-lock.json
  const lock = JSON.parse(readFileSync(LOCK_PATH, "utf-8"));
  lock.version = nextStr;
  if (lock.packages?.[""]?.version) {
    lock.packages[""].version = nextStr;
  }
  writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + "\n");

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
const isDirectRun = !process.argv[1]?.includes(".test.");
if (isDirectRun) main();
