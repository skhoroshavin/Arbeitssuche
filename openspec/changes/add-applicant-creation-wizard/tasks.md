## 1. Applicant Draft Persistence

- [x] 1.1 Add applicant draft snapshot and meaningful-draft helpers in the applicant model layer.
- [x] 1.2 Extend the applicant repository contract with `loadDraft`, `saveDraft`, `deleteDraft`, and `finalizeDraft` operations.
- [x] 1.3 Implement applicant draft persistence and finalization in the SQLite applicant repository.
- [x] 1.4 Implement applicant draft persistence and finalization in the stub applicant repository.
- [x] 1.5 Add repository tests covering applicant draft save/load uniqueness, discard, and finalize behavior.

## 2. Applicant Draft APIs

- [x] 2.1 Add applicant draft IPC handlers for load, save, delete, and finalize operations.
- [x] 2.2 Add React Query hooks for applicant draft lifecycle operations and query invalidation.
- [x] 2.3 Keep immediate persisted applicant creation available only for internal/test helpers that still need it during migration.

## 3. Shared Applicant Editor Views

- [x] 3.1 Extract the personal section into a shared applicant editor view that can run in draft and persisted modes.
- [x] 3.2 Extract the experience and education sections into shared applicant editor views.
- [x] 3.3 Extract the certifications and other sections into shared applicant editor views.
- [x] 3.4 Refit the existing persisted applicant edit routes to use the shared views without changing their current save behavior.

## 4. Applicant Creation Wizard UI

- [x] 4.1 Replace the applicant-list inline create form with a launch point for the applicant creation wizard.
- [x] 4.2 Implement the applicant wizard modal with multi-step navigation, autosave-to-draft behavior, and finish handling.
- [x] 4.3 Implement resume-draft and cancel-draft dialogs with continue, keep, discard, and start-over actions.
- [x] 4.4 Finalize the draft into a persisted applicant and navigate to the created applicant overview.

## 5. Verification

- [x] 5.1 Add or update applicant flow E2E coverage for start, cancel, resume, discard, and finish flows.
- [x] 5.2 Add UI-level tests for wizard state mapping and meaningful-draft behavior where practical.
- [x] 5.3 Run the applicant-focused test suite first, then run the repository and full verification commands required by the project.
