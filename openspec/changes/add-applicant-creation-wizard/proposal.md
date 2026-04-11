## Why

Applicant creation currently persists a mostly empty applicant record as soon as the user enters a name, then asks the user to fill the rest of the profile across multiple edit tabs. After overhauling job-search creation into a draft-backed wizard, applicant creation now feels inconsistent and leaves behind incomplete records when the user abandons setup.

## What Changes

- Replace immediate applicant creation from the root applicant list with a draft-backed applicant creation wizard.
- Add applicant draft storage with save, load, delete, and finalize operations so in-progress wizard state can be resumed or discarded.
- Introduce resume/discard prompts before starting a fresh applicant wizard when a meaningful applicant draft already exists.
- Finalize the applicant draft into a persisted applicant only when the user finishes the wizard, then transition into the normal applicant workflow.
- Reuse the applicant editor sections inside the wizard so applicant creation and applicant editing stay behaviorally aligned.

## Capabilities

### New Capabilities
- `applicant-creation-wizard`: A multi-step applicant creation flow that starts from the applicant list, delays persistence until finish, and transitions into the standard applicant experience.
- `applicant-drafts`: Draft persistence and recovery rules for in-progress applicant creation, including meaningful draft detection and explicit discard behavior.

### Modified Capabilities
None.

## Impact

- Affected UI: applicant list, applicant creation entry point, applicant wizard UI, and shared applicant editor views.
- Affected data and APIs: applicant React Query hooks, applicant IPC handlers, applicant repository contracts, and draft storage.
- Affected persistence: SQLite and stub applicant repositories will need applicant draft support and finalize semantics.
- Affected tests: applicant flow E2E coverage plus applicant repository and UI behavior tests.
