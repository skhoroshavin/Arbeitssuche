# live-e2e-ui-setup Specification

## Purpose

TBD - synced from change replace-env-key-logic-with-ui-e2e-config. Refine after archive.

## Requirements

### Requirement: Live E2E setup uses the Settings UI
The live E2E suite SHALL configure required provider API keys through the same visible Settings UI controls available to end users instead of raw secret injection interfaces.

#### Scenario: Live run configures required keys before the main workflow
- **WHEN** a live E2E scenario starts with required credential values available to the test runner
- **THEN** the scenario SHALL navigate to Settings and save each required provider key through the UI before executing crawl, enrichment, commute, or cover-letter actions

### Requirement: Live E2E runs prove clean-start configuration
Each isolated live E2E app run SHALL begin with no persisted provider secrets and MUST prove configuration by observing the Settings UI transition from an unset state to a saved state.

#### Scenario: Fresh isolated run shows keys as unset before setup
- **WHEN** a new isolated live E2E app instance launches with an empty persisted secrets store
- **THEN** the Settings UI SHALL show required provider keys in the add state until the test saves them through the UI
