# Tasks: Simplify package.json Scripts

## Task 1: Rename dependency-cruiser config file

- [x] Rename `dependency-cruiser.cjs` to `.dependency-cruiser.cjs`
- [x] Update any references in documentation if they exist

## Task 2: Update package.json scripts

### 2.1 Remove obsolete scripts

Delete the following scripts from package.json:

- [x] `format`
- [x] `lint`
- [x] `lint:fix`
- [x] `jscpd`
- [x] `jscpd:html`
- [x] `depcruise`
- [x] `knip`
- [x] `knip:fix`
- [x] `preflight`
- [x] `validate:sandboxed`
- [x] `validate`
- [x] `electron:build`

### 2.2 Rename existing scripts

Update script names:

- [x] `electron:dev` → `dev`
- [x] `test:integration` → `test:crawler`
- [x] `test:visual` → remove (will be merged into test:e2e)
- [x] `test:visual:update` → `test:e2e:update`
- [x] `electron:dist:mac:arm64` → `dist:mac:arm64`
- [x] `electron:dist:mac:x64` → `dist:mac:x64`
- [x] `electron:dist:win` → `dist:win`
- [x] `electron:dist:linux` → `dist:linux`

### 2.3 Add new consolidated scripts

Add the following new scripts:

- [x] `fix`: `knip --fix && eslint . --fix && prettier . --write`
- [x] `verify`: `prettier . --check && knip && depcruise src && jscpd && eslint . && electron-vite build`
- [x] `test:all`: `npm test && npm run test:crawler && npm run test:e2e`

### 2.4 Update existing script definitions

- [x] `dev`: `electron-vite dev` (was: electron:dev)
- [x] `test:crawler`: `vitest run --config vitest.integration.config.ts` (was: test:integration)
- [x] `test:e2e`: Update to run both E2E and visual tests (see Task 3)
- [x] `test:e2e:update`: Update to update both E2E and visual baselines (see Task 3)
- [x] `dist:mac:arm64`: `electron-vite build && electron-builder --mac --arm64 --publish never`
- [x] `dist:mac:x64`: `electron-vite build && electron-builder --mac --x64 --publish never`
- [x] `dist:win`: `electron-vite build && electron-builder --win --x64 --publish never`
- [x] `dist:linux`: `electron-vite build && electron-builder --linux --x64 --publish never`

## Task 3: Merge visual tests into E2E

- [x] Update `e2e/playwright.electron.config.ts` to include visual test specs
- [x] Ensure `test:e2e` runs both E2E and visual tests
- [x] Update `test:e2e:update` to update baselines for both test types

## Task 4: Remove --config flag from jscpd commands

Since `.jscpd.json` is the standard config location:

- [x] Remove `--config .jscpd.json` from verify script (already done in Task 2.3)
- [x] No other changes needed - jscpd auto-detects `.jscpd.json`

## Task 5: Verification and Testing

### 5.1 Test fix command

- [x] Introduce a formatting error and run `npm run fix` - should auto-correct
- [x] Introduce an unused import and run `npm run fix` - should be removed by knip
- [x] Verify all auto-fixes work correctly

### 5.2 Test verify command

- [x] Run `npm run verify` on clean codebase - should pass
- [x] Introduce formatting error - verify should fail on prettier
- [x] Introduce dead code - verify should fail on knip
- [x] Introduce import violation - verify should fail on depcruise
- [x] Introduce copy-paste - verify should fail on jscpd
- [x] Introduce lint error - verify should fail on eslint
- [x] Introduce TypeScript error - verify should fail on build

### 5.3 Test test commands

- [x] Run `npm test` - should run only unit tests
- [x] Run `npm run test:crawler` - should run crawler integration tests
- [x] Run `npm run test:e2e` - should run both E2E and visual tests
- [x] Run `npm run test:e2e:update` - should update both baselines
- [x] Run `npm run test:all` - should run all tests sequentially

### 5.4 Test dev command

- [x] Run `npm run dev` - should start Electron in dev mode

### 5.5 Test distribution commands (CI check)

- [x] Verify `npm run dist:mac:arm64` works (if on macOS ARM64)
- [x] Verify `npm run dist:mac:x64` works (if on macOS x64)
- [x] Verify `npm run dist:win` works (if on Windows)
- [x] Verify `npm run dist:linux` works (if on Linux)

## Task 6: Update CI/CD pipelines

- [x] Identify all CI/CD files that reference old script names
- [x] Update references from `electron:dev` to `dev`
- [x] Update references from `electron:dist:*` to `dist:*`
- [x] Update references from `test:integration` to `test:crawler`
- [x] Update references from `test:visual` to appropriate new command
- [x] Update references from `test:visual:update` to `test:e2e:update`
- [x] Update references from `preflight` to `verify`
- [x] Update references from `validate:sandboxed` to `verify && npm test`
- [x] Update references from `validate` to `verify && npm run test:all`

## Task 7: Final Validation

- [x] Run `npm run verify && npm test` - should pass
- [x] Run full `npm run test:all` - should pass (may be slow)
- [x] Verify script count reduced to ~11
- [x] Verify no old script names remain in package.json
- [x] Verify CI/CD pipelines are updated and passing

## Summary of Changes

**Files to modify:**

1. `package.json` - Major script reorganization
2. `dependency-cruiser.cjs` → `.dependency-cruiser.cjs` - Rename
3. `e2e/playwright.electron.config.ts` - Merge visual tests
4. CI/CD configuration files - Update script references

**Expected final script count:** ~11 (down from 24, -54%)

**Breaking changes requiring CI/CD update:**

- All `electron:*` prefixes removed
- `test:integration` → `test:crawler`
- Visual test commands renamed and merged
- Validation chains replaced with single commands
