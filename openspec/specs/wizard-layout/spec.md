# wizard-layout Specification

## Purpose

TBD - created by archiving change wizard-routes. Update Purpose after archive.

## Requirements

### Requirement: Wizard layout displays step progression in a sidebar

The system SHALL display a sidebar listing all wizard steps with visual states that communicate completion status at a glance.

#### Scenario: Steps shown with distinct visual states

- **WHEN** the wizard layout renders
- **THEN** each step completed before the current one SHALL appear with a done visual indicator
- **THEN** the current step SHALL appear with an active visual indicator distinct from done and pending
- **THEN** each step not yet reached SHALL appear with a dimmed pending indicator

#### Scenario: Exactly one step is current

- **WHEN** the wizard layout renders
- **THEN** exactly one step SHALL have the active state
- **THEN** all steps with a lower index than the active step SHALL have the done state
- **THEN** all steps with a higher index than the active step SHALL have the pending state

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
