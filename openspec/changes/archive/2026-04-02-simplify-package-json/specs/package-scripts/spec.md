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

## Constraints

- **C1:** Total script count MUST NOT exceed 12 commands
- **C2:** All commands MUST use standard configuration file locations without explicit flags
- **C3:** Commands MUST maintain fail-fast behavior with sequential execution
- **C4:** Breaking changes require coordinated CI/CD updates
