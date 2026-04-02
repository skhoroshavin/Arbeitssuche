# Design: Simplify package.json Scripts

## Overview

This change consolidates 24 package.json scripts into ~11 well-organized commands following the pattern established by `eslint-plugin-unslop`. The design focuses on clear separation of concerns: fast static checks, tiered testing, and streamlined development workflow.

## Key Design Decisions

### 1. Script Consolidation Strategy

**Principle:** Every script should have a clear, single responsibility. Avoid chains that hide intent.

| Old Pattern                                            | New Pattern                                     | Rationale                                                                 |
| ------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `preflight` → `validate:sandboxed` → `validate`        | `verify` (static) + `test`/`test:all` (dynamic) | Clear separation: verify doesn't run tests, tests don't verify code style |
| `format`, `lint`, `lint:fix`                           | `fix` (auto-fix all)                            | One command to fix everything                                             |
| `jscpd`, `jscpd:html`, `knip`, `knip:fix`, `depcruise` | Integrated into `verify`/`fix`                  | No need for standalone commands                                           |

### 2. Command Definitions

#### `fix` - Auto-fix Everything

```bash
knip --fix && eslint . --fix && prettier . --write
```

**Order matters:**

1. `knip --fix` - Remove dead code first (less to fix later)
2. `eslint . --fix` - Fix lint issues
3. `prettier . --write` - Format last (may change what eslint fixed)

**Safety:** All three tools have safe auto-fix modes that won't break code.

#### `verify` - Check Everything Without Modifying

```bash
prettier . --check && knip && depcruise src && jscpd && eslint . && electron-vite build
```

**Order rationale:**

1. `prettier --check` - Fastest check first (formatting)
2. `knip` - Dead code detection
3. `depcruise src` - Architecture enforcement
4. `jscpd` - Copy-paste detection
5. `eslint .` - Type-aware linting (slower, depends on type checking)
6. `electron-vite build` - Final compilation check (catches runtime errors)

**Fail-fast:** Each `&&` means stop on first failure. This is intentional - fix formatting before checking dead code.

### 3. Testing Hierarchy

```
test              # Unit tests only (Vitest, fast, reliable)
test:crawler      # Integration tests hitting real APIs (slow, fragile)
test:e2e          # E2E + visual tests (Playwright, collapsed into one)
test:e2e:update   # Update baselines/screenshots
test:all          # Sequential: test → test:crawler → test:e2e
```

**Collapsed visual into e2e:**

- Visual tests are UI regression tests, conceptually part of E2E
- `test:e2e` runs: `npx playwright test --config=e2e/playwright.electron.config.ts`
- Should run both E2E and visual tests in one command
- Implementation: update Playwright config to run both test suites

**Sequential execution (`&&`):**

- Integration tests hit real APIs - if they fail, no point running E2E
- E2E is slowest - only run if unit tests pass
- Clear failure point identification

### 4. Development Commands

```
dev               # Start Electron in dev mode (was: electron:dev)
```

**Removed `electron:build`:**

- No standalone `build` script - not used locally
- Build verification included in `verify`
- Distribution builds handle packaging in CI

### 5. Release Commands

```
dist:mac:arm64    # Build + package for macOS ARM64
dist:mac:x64      # Build + package for macOS x64
dist:win          # Build + package for Windows
dist:linux        # Build + package for Linux
```

**Renamed from `electron:dist:*`:**

- Shorter, clearer these are release artifacts
- Each runs: `electron-vite build && electron-builder --<platform>`
- CI/CD uses these directly per platform

### 6. Config File Standardization

| File                     | Change                      | Rationale                    |
| ------------------------ | --------------------------- | ---------------------------- |
| `dependency-cruiser.cjs` | → `.dependency-cruiser.cjs` | Standard name, auto-detected |

**Why dot-prefix:**

- `.dependency-cruiser.cjs` is the standard name
- `depcruise src` auto-finds it, no `--config` flag needed
- Keeps root directory cleaner

### 7. Tool Configurations

**.jscpd.json already configured:**

- Default config location is `.jscpd.json`
- Current scripts pass `--config .jscpd.json` unnecessarily
- Just `jscpd` works after removal of flag

**eslint.config.ts:**

- Already using type-aware linting (`typescript-eslint`)
- No need for separate `tsc --noEmit` (ESLint catches type errors)

**knip.json:**

- Already at standard location
- `knip` and `knip --fix` work without flags

## CI/CD Impact

### Breaking Changes

| Old Script                | New Script                   |
| ------------------------- | ---------------------------- |
| `electron:dev`            | `dev`                        |
| `electron:dist:mac:arm64` | `dist:mac:arm64`             |
| `electron:dist:mac:x64`   | `dist:mac:x64`               |
| `electron:dist:win`       | `dist:win`                   |
| `electron:dist:linux`     | `dist:linux`                 |
| `test:integration`        | `test:crawler`               |
| `test:visual`             | now in `test:e2e`            |
| `test:visual:update`      | `test:e2e:update`            |
| `preflight`               | `verify`                     |
| `validate:sandboxed`      | `verify && npm test`         |
| `validate`                | `verify && npm run test:all` |

### Migration Path

1. Update CI workflow files to use new script names
2. Coordinate deployment with this change
3. No functional changes - just command renames

## Implementation Details

### File Changes

1. **package.json** - Update scripts section
2. **dependency-cruiser.cjs** → `.dependency-cruiser.cjs` - Rename file
3. **e2e/playwright.electron.config.ts** - Update to run both E2E and visual tests

### Verification

After implementation, verify:

- `npm run fix` fixes all issues without errors
- `npm run verify` passes on clean codebase
- `npm run verify` fails appropriately on broken code
- `npm test` runs unit tests only
- `npm run test:all` runs all tests sequentially
- All dist commands work in CI

## Open Questions

None at design phase. All decisions resolved in proposal.
