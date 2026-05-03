## ADDED Requirements

### Requirement: Provider secrets come from persisted settings state
The system SHALL source provider API keys from the persisted secrets repository, including during E2E and test launches, and MUST NOT auto-populate those secrets from startup environment variables.

#### Scenario: Fresh launch without saved provider keys
- **WHEN** the app starts with no persisted provider secrets
- **THEN** provider-dependent settings cards SHALL appear unset and provider-dependent workflows SHALL report the keys as missing until a user saves them

### Requirement: Settings UI persists provider secrets for runtime use
The system SHALL allow users to add, replace, and clear provider API keys through the Settings UI, and saved values MUST be used by subsequent runtime operations without restarting the app.

#### Scenario: User saves a provider key
- **WHEN** a user enters a provider API key in the Settings UI and saves it
- **THEN** the app SHALL persist that secret and runtime operations for that provider SHALL use the saved value

#### Scenario: User clears a provider key
- **WHEN** a user clears a previously saved provider API key in the Settings UI
- **THEN** the app SHALL remove the persisted secret and provider-dependent workflows SHALL return to the missing-key state
