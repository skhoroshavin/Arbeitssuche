## ADDED Requirements

### Requirement: Self-contained E2E test command
The system MUST provide a `test:e2e` command that prepares and runs the live Electron E2E suite without requiring undocumented manual setup steps.

#### Scenario: Developer runs E2E tests locally
- **WHEN** the developer runs `npm run test:e2e` with the required provider environment variables present
- **THEN** the command ensures the Electron app build required by the E2E harness exists before Playwright starts
- **AND** the command runs the live Electron flow suite

#### Scenario: Developer runs E2E tests without required credentials
- **WHEN** the developer runs `npm run test:e2e` without the required provider environment variables
- **THEN** the command fails during Playwright preflight validation before Electron launches

## MODIFIED Requirements

### Requirement: Kitchen sink test command
The system MUST provide a `test:all` command that runs all test suites sequentially, including the self-contained live E2E suite.

#### Scenario: Developer runs all tests

**GIVEN** all test suites are configured and the required live E2E provider credentials are available
**WHEN** the developer runs `npm run test:all`
**THEN** unit tests, crawler tests, and e2e tests run sequentially
**AND** execution stops on the first failing test suite
