# Spec: Package Scripts

## Overview

This specification defines the delta for simplifying package.json scripts from 24 to ~11 commands.

## ADDED Requirements

### Requirement: Consolidated fix command

The system MUST provide a single `fix` command that auto-fixes all static analysis issues.

#### Scenario: Developer runs fix command

**GIVEN** the codebase has formatting, lint, and dead code issues
**WHEN** the developer runs `npm run fix`
**THEN** knip removes dead code, eslint fixes lint issues, and prettier formats files
**AND** all fixes are applied in the correct order

### Requirement: Consolidated verify command

The system MUST provide a single `verify` command that checks all static analysis without modifying files.

#### Scenario: Developer runs verify command

**GIVEN** the codebase may have any static analysis issues
**WHEN** the developer runs `npm run verify`
**THEN** prettier, knip, depcruise, jscpd, eslint, and electron-vite build all run sequentially
**AND** the command fails fast on the first issue found
**AND** the build step verifies the application compiles

### Requirement: Kitchen sink test command

The system MUST provide a `test:all` command that runs all test suites sequentially.

#### Scenario: Developer runs all tests

**GIVEN** all test suites are configured
**WHEN** the developer runs `npm run test:all`
**THEN** unit tests, crawler tests, and e2e tests run sequentially
**AND** execution stops on the first failing test suite

## MODIFIED Requirements

### Requirement: Renamed development command

The development command MUST be renamed from `electron:dev` to `dev`.

#### Scenario: Developer starts dev server

**GIVEN** the old command was `npm run electron:dev`
**WHEN** the developer runs `npm run dev`
**THEN** the Electron application starts in development mode with hot reload

### Requirement: Renamed crawler test command

The integration test command MUST be renamed from `test:integration` to `test:crawler`.

#### Scenario: Developer runs integration tests

**GIVEN** the old command was `npm run test:integration`
**WHEN** the developer runs `npm run test:crawler`
**THEN** the crawler integration tests execute
**AND** tests may hit real external APIs

### Requirement: Merged visual and E2E tests

The E2E test command MUST include visual regression tests that were previously separate.

#### Scenario: Developer runs E2E tests

**GIVEN** visual tests were previously separate (`npm run test:visual`)
**WHEN** the developer runs `npm run test:e2e`
**THEN** both end-to-end flow tests AND visual regression tests execute
**AND** screenshot comparisons are performed

### Requirement: Renamed visual baseline update

The visual baseline update command MUST be renamed from `test:visual:update` to `test:e2e:update`.

#### Scenario: Developer updates visual baselines

**GIVEN** the old command was `npm run test:visual:update`
**WHEN** the developer runs `npm run test:e2e:update`
**THEN** both E2E and visual test baselines are updated

### Requirement: Renamed distribution commands

The distribution build commands MUST be renamed from `electron:dist:*` to `dist:*`.

#### Scenario: CI builds for multiple platforms

**GIVEN** the old commands were `npm run electron:dist:*`
**WHEN** the CI runs `npm run dist:mac:arm64`, `npm run dist:mac:x64`, `npm run dist:win`, or `npm run dist:linux`
**THEN** the platform-specific distribution is built and packaged
**AND** the --publish never flag prevents accidental releases

## REMOVED Requirements

### Requirement: Removed redundant formatting commands

The separate `format`, `lint`, and `lint:fix` commands MUST be removed.

#### Scenario: Commands no longer exist

**GIVEN** the codebase previously had separate `format`, `lint`, and `lint:fix` commands
**WHEN** a developer or CI tries to run these commands
**THEN** npm reports "missing script" error
**AND** the developer uses `npm run fix` or `npm run verify` instead

### Requirement: Removed static analysis standalone commands

The standalone `jscpd`, `jscpd:html`, `depcruise`, `knip`, and `knip:fix` commands MUST be removed.

#### Scenario: Commands no longer exist

**GIVEN** the codebase previously had `jscpd`, `jscpd:html`, `depcruise`, `knip`, and `knip:fix` commands
**WHEN** a developer or CI tries to run these commands
**THEN** npm reports "missing script" error
**AND** the developer uses `npm run verify` or `npm run fix` instead

### Requirement: Removed validation chains

The `preflight`, `validate:sandboxed`, and `validate` commands MUST be removed.

#### Scenario: Commands no longer exist

**GIVEN** the codebase previously had `preflight`, `validate:sandboxed`, and `validate` commands
**WHEN** a developer or CI tries to run these commands
**THEN** npm reports "missing script" error
**AND** the developer uses `npm run verify && npm test` or `npm run verify && npm run test:all` instead

### Requirement: Removed standalone build command

The standalone `electron:build` command MUST be removed.

#### Scenario: Command no longer exists

**GIVEN** the codebase previously had `electron:build` command
**WHEN** a developer or CI tries to run this command
**THEN** npm reports "missing script" error
**AND** build verification is included in `npm run verify`
**AND** full distribution builds use `npm run dist:*` commands

## Configuration Changes

### Requirement: Standardized depcruise config filename

The dependency-cruiser configuration file MUST be renamed from `dependency-cruiser.cjs` to `.dependency-cruiser.cjs`.

#### Scenario: Config file renamed

**GIVEN** the config file was `dependency-cruiser.cjs`
**WHEN** depcruise runs
**THEN** it uses `.dependency-cruiser.cjs` (dot-prefixed standard name)
**AND** no --config flag is required

## Constraints

- **C1:** Total script count MUST NOT exceed 12 commands
- **C2:** All commands MUST use standard configuration file locations without explicit flags
- **C3:** Commands MUST maintain fail-fast behavior with sequential execution
- **C4:** Breaking changes require coordinated CI/CD updates
