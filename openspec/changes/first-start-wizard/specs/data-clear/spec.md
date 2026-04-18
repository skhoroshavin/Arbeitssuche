## ADDED Requirements

### Requirement: Settings page offers a clear-all-data action

The system SHALL provide a "Clear all data" action in the settings page that initiates deletion of all user data stored by the app.

#### Scenario: Clear-all-data button visible in settings

- **WHEN** the user is on the settings page
- **THEN** the system SHALL display a "Clear all data" action in a clearly visible location

#### Scenario: Clear-all-data triggers confirmation

- **WHEN** the user activates the "Clear all data" action
- **THEN** the system SHALL display a confirmation warning explaining that all data (applicants, job searches, vacancies, configuration, API keys) will be permanently deleted
- **THEN** the system SHALL NOT proceed with deletion until the user explicitly confirms

#### Scenario: User cancels clear

- **WHEN** the user dismisses the clear-all-data confirmation without confirming
- **THEN** the system SHALL NOT delete any data
- **THEN** the system SHALL remain on the settings page

### Requirement: Clear-all-data deletes all persisted app data

Upon confirmation, the system SHALL delete the database, configuration, and secrets files, and reset the setup state.

#### Scenario: Deletion executed after confirmation

- **WHEN** the user confirms the clear-all-data action
- **THEN** the main process SHALL close the database connection
- **THEN** the main process SHALL delete the database file
- **THEN** the main process SHALL reset the configuration store to empty
- **THEN** the main process SHALL delete the secrets file
- **THEN** the main process SHALL reset `AppSetupState` to `{ completed: false }` with no `lastPhase`
- **THEN** the main process SHALL re-open the database (creating a fresh file)
- **THEN** the renderer SHALL be blocked from making data requests during the deletion operation

### Requirement: Post-deletion screen offers close or restart setup

After all data has been cleared, the system SHALL display a post-deletion screen with two options.

#### Scenario: Post-deletion screen shown

- **WHEN** the clear-all-data operation completes successfully
- **THEN** the system SHALL display a screen indicating that all data has been deleted
- **THEN** the screen SHALL show a "Close the app" button
- **THEN** the screen SHALL show a "Start configuration" button

#### Scenario: User chooses to close the app

- **WHEN** the user clicks "Close the app" on the post-deletion screen
- **THEN** the system SHALL close the application

#### Scenario: User chooses to restart setup

- **WHEN** the user clicks "Start configuration" on the post-deletion screen
- **THEN** the system SHALL navigate to `/first-start/settings`
- **THEN** the first-start wizard SHALL begin from the settings phase

### Requirement: Clear-all-data IPC handler

The system SHALL provide an IPC handler for the clear-all-data operation.

#### Scenario: Invoke clear-data IPC

- **WHEN** the renderer invokes `setup:clear-data`
- **THEN** the main process SHALL perform the full deletion sequence
- **THEN** the main process SHALL return a success response after re-opening the database