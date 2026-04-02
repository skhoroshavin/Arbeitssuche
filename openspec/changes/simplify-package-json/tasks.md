# Tasks: Simplify package.json Scripts

## Task 1: Rename dependency-cruiser config file

- [ ] Rename `dependency-cruiser.cjs` to `.dependency-cruiser.cjs`
- [ ] Update any references in documentation if they exist

## Task 2: Update package.json scripts

### 2.1 Remove obsolete scripts

Delete the following scripts from package.json:

- [ ] `format`
- [ ] `lint`
- [ ] `lint:fix`
- [ ] `jscpd`
- [ ] `jscpd:html`
- [ ] `depcruise`
- [ ] `knip`
- [ ] `knip:fix`
- [ ] `preflight`
- [ ] `validate:sandboxed`
- [ ] `validate`
- [ ] `electron:build`

### 2.2 Rename existing scripts

Update script names:

- [ ] `electron:dev` → `dev`
- [ ] `test:integration` → `test:crawler`
- [ ] `test:visual` → remove (will be merged into test:e2e)
- [ ] `test:visual:update` → `test:e2e:update`
- [ ] `electron:dist:mac:arm64` → `dist:mac:arm64`
- [ ] `electron:dist:mac:x64` → `dist:mac:x64`
- [ ] `electron:dist:win` → `dist:win`
- [ ] `electron:dist:linux` → `dist:linux`

### 2.3 Add new consolidated scripts

Add the following new scripts:

- [ ] `fix`: `knip --fix && eslint . --fix && prettier . --write`
- [ ] `verify`: `prettier . --check && knip && depcruise src && jscpd && eslint . && electron-vite build`
- [ ] `test:all`: `npm test && npm run test:crawler && npm run test:e2e`

### 2.4 Update existing script definitions

- [ ] `dev`: `electron-vite dev` (was: electron:dev)
- [ ] `test:crawler`: `vitest run --config vitest.integration.config.ts` (was: test:integration)
- [ ] `test:e2e`: Update to run both E2E and visual tests (see Task 3)
- [ ] `test:e2e:update`: Update to update both E2E and visual baselines (see Task 3)
- [ ] `dist:mac:arm64`: `electron-vite build && electron-builder --mac --arm64 --publish never`
- [ ] `dist:mac:x64`: `electron-vite build && electron-builder --mac --x64 --publish never`
- [ ] `dist:win`: `electron-vite build && electron-builder --win --x64 --publish never`
- [ ] `dist:linux`: `electron-vite build && electron-builder --linux --x64 --publish never`

## Task 3: Merge visual tests into E2E

- [ ] Update `e2e/playwright.electron.config.ts` to include visual test specs
- [ ] Ensure `test:e2e` runs both E2E and visual tests
- [ ] Update `test:e2e:update` to update baselines for both test types

## Task 4: Remove --config flag from jscpd commands

Since `.jscpd.json` is the standard config location:

- [ ] Remove `--config .jscpd.json` from verify script (already done in Task 2.3)
- [ ] No other changes needed - jscpd auto-detects `.jscpd.json`

## Task 5: Verification and Testing

### 5.1 Test fix command

- [ ] Introduce a formatting error and run `npm run fix` - should auto-correct
- [ ] Introduce an unused import and run `npm run fix` - should be removed by knip
- [ ] Verify all auto-fixes work correctly

### 5.2 Test verify command

- [ ] Run `npm run verify` on clean codebase - should pass
- [ ] Introduce formatting error - verify should fail on prettier
- [ ] Introduce dead code - verify should fail on knip
- [ ] Introduce import violation - verify should fail on depcruise
- [ ] Introduce copy-paste - verify should fail on jscpd
- [ ] Introduce lint error - verify should fail on eslint
- [ ] Introduce TypeScript error - verify should fail on build

### 5.3 Test test commands

- [ ] Run `npm test` - should run only unit tests
- [ ] Run `npm run test:crawler` - should run crawler integration tests
- [ ] Run `npm run test:e2e` - should run both E2E and visual tests
- [ ] Run `npm run test:e2e:update` - should update both baselines
- [ ] Run `npm run test:all` - should run all tests sequentially

### 5.4 Test dev command

- [ ] Run `npm run dev` - should start Electron in dev mode

### 5.5 Test distribution commands (CI check)

- [ ] Verify `npm run dist:mac:arm64` works (if on macOS ARM64)
- [ ] Verify `npm run dist:mac:x64` works (if on macOS x64)
- [ ] Verify `npm run dist:win` works (if on Windows)
- [ ] Verify `npm run dist:linux` works (if on Linux)

## Task 6: Update CI/CD pipelines

- [ ] Identify all CI/CD files that reference old script names
- [ ] Update references from `electron:dev` to `dev`
- [ ] Update references from `electron:dist:*` to `dist:*`
- [ ] Update references from `test:integration` to `test:crawler`
- [ ] Update references from `test:visual` to appropriate new command
- [ ] Update references from `test:visual:update` to `test:e2e:update`
- [ ] Update references from `preflight` to `verify`
- [ ] Update references from `validate:sandboxed` to `verify && npm test`
- [ ] Update references from `validate` to `verify && npm run test:all`

## Task 7: Final Validation

- [ ] Run `npm run verify && npm test` - should pass
- [ ] Run full `npm run test:all` - should pass (may be slow)
- [ ] Verify script count reduced to ~11
- [ ] Verify no old script names remain in package.json
- [ ] Verify CI/CD pipelines are updated and passing

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
