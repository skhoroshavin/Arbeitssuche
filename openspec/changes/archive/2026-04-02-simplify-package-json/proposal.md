# Simplify package.json Scripts

## Problem

The current `package.json` contains **24 scripts**, creating cognitive overload for developers and complicating LLM instructions. The script structure has grown organically without consolidation, resulting in:

- Multiple ways to run the same checks (format vs lint:fix vs prettier directly)
- Unclear hierarchy (preflight → validate:sandboxed → validate chains)
- Non-standard config file naming (dependency-cruiser.cjs requires --config flag)
- No single command to "check everything" or "fix everything"

This makes the project harder to maintain and increases friction for both human developers and AI assistants.

## Solution

Consolidate package.json scripts following the pattern established by `eslint-plugin-unslop` (a reference project with only 7 well-organized scripts). The goal is **~11 scripts** (-54%) with clear separation of concerns:

### New Script Structure

```
STATIC CHECKS (fast, always run these)
├── fix         # Auto-fix everything (knip --fix, eslint --fix, prettier --write)
└── verify      # Check everything including buildability, fail on issues (prettier --check, knip, depcruise, jscpd, eslint, electron-vite build)

TESTING (tiered by speed/fragility)
├── test              # Unit tests (fast, reliable)
├── test:crawler      # Integration tests hitting real APIs (was: test:integration)
├── test:e2e          # End-to-end tests + visual regression tests (collapsed into one)
├── test:e2e:update   # Update visual baselines/screenshots (was: test:visual:update)
└── test:all          # Sequential kitchen sink: test + test:crawler + test:e2e

DEVELOPMENT
└── dev         # Start Electron in dev mode (was: electron:dev)

RELEASE (CD pipeline)
├── dist:mac:arm64    # Build for macOS ARM64 (was: electron:dist:mac:arm64)
├── dist:mac:x64      # Build for macOS x64 (was: electron:dist:mac:x64)
├── dist:win          # Build for Windows (was: electron:dist:win)
└── dist:linux        # Build for Linux (was: electron:dist:linux)

UTILITIES
├── bump              # Version bump script
└── crawl:download    # Custom crawler utility
```

### Key Changes

**Collapsed Visual Tests into E2E:**

- `test:e2e` now runs both end-to-end tests AND visual regression tests
- Single command for all UI testing - simpler mental model
- `test:e2e:update` updates both e2e and visual baselines (if any)

**Removed Standalone `build` Script:**

- Not used locally as a standalone command (developer uses `dev` and `dist` only)
- Build verification now included in `verify` script via `electron-vite build`
- Catches compilation errors before code reaches CD pipeline
- CD pipeline handles full distribution builds via `dist:*` scripts

**Renamed Distribution Scripts:**

- `electron:dist:*` → `dist:*` (shorter, clearer these are release builds)

### Config File Standardization

| Current                             | Target                    | Rationale                                 |
| ----------------------------------- | ------------------------- | ----------------------------------------- |
| `dependency-cruiser.cjs`            | `.dependency-cruiser.cjs` | Standard name, auto-detected by depcruise |
| `jscpd` with `--config .jscpd.json` | `jscpd` (no flag)         | `.jscpd.json` is already the default      |

### Scripts Being Removed

- `format` → absorbed into `fix` and `verify`
- `lint` → absorbed into `verify`
- `lint:fix` → absorbed into `fix`
- `jscpd` (old version) → integrated into `verify`
- `jscpd:html` → remove (HTML output configured in .jscpd.json)
- `depcruise` (old version) → integrated into `verify`
- `knip` → integrated into `verify`
- `knip:fix` → integrated into `fix`
- `preflight` → replaced by `verify`
- `validate:sandboxed` → replaced by `verify && npm test`
- `validate` → replaced by `verify && npm run test:all`
- `electron:dev` → renamed to `dev`
- `electron:build` → removed (unused)
- `electron:dist:*` → renamed to `dist:*`
- `test:integration` → renamed to `test:crawler`
- `test:visual` → collapsed into `test:e2e`
- `test:visual:update` → renamed to `test:e2e:update`

### CI/CD Compatibility

**⚠️ Breaking Changes for CI/CD:**

The following script names are changing and will break existing CI/CD pipelines:

- `electron:dist:mac:arm64` → `dist:mac:arm64`
- `electron:dist:mac:x64` → `dist:mac:x64`
- `electron:dist:win` → `dist:win`
- `electron:dist:linux` → `dist:linux`
- `electron:dev` → `dev`
- `test:integration` → `test:crawler`
- `test:visual` → now part of `test:e2e`
- `test:visual:update` → `test:e2e:update`

**Migration Path:**
CI/CD configurations must be updated when this change is deployed. The change should be coordinated with CI/CD updates.

## Success Criteria

1. Script count reduced from 24 to ~11
2. `npm run fix` auto-fixes all static analysis issues
3. `npm run verify` checks everything without modifying files
4. `test:integration` renamed to `test:crawler`
5. Visual tests collapsed into `test:e2e`
6. Screenshot update renamed to `test:e2e:update`
7. `dependency-cruiser.cjs` renamed to `.dependency-cruiser.cjs`
8. jscpd commands work without explicit --config flag
9. LLM instruction simplified to: "Run `npm run verify && npm test`"
10. All existing functionality preserved (no lost capabilities)
11. CI/CD pipelines updated to use new script names

## Out of Scope

- Moving CD/release scripts to external configuration
- Adding metadata fields (description, repository, keywords, engines)
- Changing test frameworks or their configs beyond renaming
