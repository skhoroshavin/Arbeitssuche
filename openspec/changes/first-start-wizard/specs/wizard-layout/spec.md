## MODIFIED Requirements

### Requirement: Wizard layout provides a fixed navigation footer

The system SHALL display a persistent footer with navigation controls whose presence depends on the current step position. The footer MAY also display a Skip button when the wizard is configured to allow skipping.

#### Scenario: First step omits Back

- **WHEN** the wizard is on the first step
- **THEN** the footer SHALL show a Next button
- **THEN** the footer SHALL show a Cancel button
- **THEN** the footer SHALL NOT show a Back button

#### Scenario: Middle step shows Back and Next

- **WHEN** the wizard is on a step that is neither the first nor the last
- **THEN** the footer SHALL show a Back button
- **THEN** the footer SHALL show a Next button
- **THEN** the footer SHALL show a Cancel button

#### Scenario: Final step shows Finish instead of Next

- **WHEN** the wizard is on the last step
- **THEN** the footer SHALL show a Back button
- **THEN** the footer SHALL show a Finish button
- **THEN** the footer SHALL show a Cancel button
- **THEN** the footer SHALL NOT show a Next button

#### Scenario: Skip button shown when skip is allowed

- **WHEN** the wizard layout is configured with a skip action
- **THEN** the footer SHALL show a Skip button

#### Scenario: Skip button absent when skip is not allowed

- **WHEN** the wizard layout is not configured with a skip action
- **THEN** the footer SHALL NOT show a Skip button