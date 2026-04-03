# package-scripts Specification

## Purpose

TBD - created by archiving change simplify-package-json. Update Purpose after archive.

## Requirements

### Requirement: Consolidated fix command

The system MUST provide a single `fix` command that auto-fixes all static analysis issues.

#### Scenario: Developer runs fix command

**GIVEN** the codebase has formatting, lint, and dead code issues
**WHEN** the developer runs `npm run fix`
**THEN** knip removes dead code, eslint fixes lint issues, and prettier formats files
**AND** all fixes are applied in the correct order

### Requirement: Consolidated verify command

The system MUST provide a `verify` command that checks static analysis without modifying files and fails on calibrated code duplication.

#### Scenario: verify enforces calibrated duplicate gate

**GIVEN** duplicate detection is configured via `.jscpd.json`
**WHEN** the developer runs `npm run verify`
**THEN** `jscpd` runs in `mild` mode with `minTokens: 60` and `minLines: 5`
**AND** the command fails when any duplication is detected at that calibration (`threshold: 0`)
**AND** duplicate detection output is console-only (no HTML report artifacts)

#### Scenario: verify passes when calibrated duplicates are absent

**GIVEN** the codebase has no duplicate blocks at the configured calibration
**WHEN** the developer runs `npm run verify`
**THEN** duplicate detection does not fail the command
**AND** no HTML duplication report directory is produced

### Requirement: Kitchen sink test command

The system MUST provide a `test:all` command that runs all test suites sequentially.

#### Scenario: Developer runs all tests

**GIVEN** all test suites are configured
**WHEN** the developer runs `npm run test:all`
**THEN** unit tests, crawler tests, and e2e tests run sequentially
**AND** execution stops on the first failing test suite
