## 1. Applicant Draft Persistence

- [ ] 1.1 Add applicant draft snapshot and meaningful-draft helpers in the applicant model layer.
- [ ] 1.2 Extend the applicant repository contract with `loadDraft`, `saveDraft`, `deleteDraft`, and `finalizeDraft` operations.
- [ ] 1.3 Implement applicant draft persistence and finalization in the SQLite applicant repository.
- [ ] 1.4 Implement applicant draft persistence and finalization in the stub applicant repository.
- [ ] 1.5 Add repository tests covering applicant draft save/load uniqueness, discard, and finalize behavior.

## 2. Applicant Draft APIs

- [ ] 2.1 Add applicant draft IPC handlers for load, save, delete, and finalize operations.
- [ ] 2.2 Add React Query hooks for applicant draft lifecycle operations and query invalidation.
- [ ] 2.3 Keep immediate persisted applicant creation available only for internal/test helpers that still need it during migration.

## 3. Shared Applicant Editor Views

- [ ] 3.1 Extract the personal section into a shared applicant editor view that can run in draft and persisted modes.
- [ ] 3.2 Extract the experience and education sections into shared applicant editor views.
- [ ] 3.3 Extract the certifications and other sections into shared applicant editor views.
- [ ] 3.4 Refit the existing persisted applicant edit routes to use the shared views without changing their current save behavior.

## 4. Applicant Creation Wizard UI

- [ ] 4.1 Replace the applicant-list inline create form with a launch point for the applicant creation wizard.
- [ ] 4.2 Implement the applicant wizard modal with multi-step navigation, autosave-to-draft behavior, and finish handling.
- [ ] 4.3 Implement resume-draft and cancel-draft dialogs with continue, keep, discard, and start-over actions.
- [ ] 4.4 Finalize the draft into a persisted applicant and navigate to the created applicant overview.

## 5. Verification

- [ ] 5.1 Add or update applicant flow E2E coverage for start, cancel, resume, discard, and finish flows.
- [ ] 5.2 Add UI-level tests for wizard state mapping and meaningful-draft behavior where practical.
- [ ] 5.3 Run the applicant-focused test suite first, then run the repository and full verification commands required by the project.
