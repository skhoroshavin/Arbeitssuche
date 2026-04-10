## 1. Shared View Layer

- [ ] 1.1 Add the `ui/views` architecture boundary and update lint/import rules so `ui/pages/*` can host reusable domain views from `ui/views/*`
- [ ] 1.2 Define the shared job-search editor snapshot model and mapping helpers between persisted job-search data, cover-letter content, and typed view update contracts
- [ ] 1.3 Extract reusable typed job-search views for search configuration and cover-letter editing into `ui/views/job-search/*`
- [ ] 1.4 Update the existing job-search pages to render the extracted typed views through page-specific wrappers without changing normal edit behavior

## 2. Draft Persistence And Generation

- [ ] 2.1 Extend the job-search persistence module with applicant-scoped draft operations for load, save, delete, and finalize
- [ ] 2.2 Ensure draft persistence distinguishes meaningful drafts from blank untouched drafts so resume prompts only appear for real in-progress work
- [ ] 2.3 Add IPC and `ui/data` access for job-search draft load/save/delete/finalize flows
- [ ] 2.4 Add a draft-aware cover-letter generation entrypoint that reuses the existing applicant/job-search generation logic

## 3. Wizard Flow

- [ ] 3.1 Add applicant-overview create flow logic that checks for an existing resumable draft before opening a new wizard
- [ ] 3.2 Implement the two-step job-search creation wizard dialog with typed view adapters for configuration and cover-letter steps
- [ ] 3.3 Implement cancel flow choices for continue editing, keep draft for later, and discard draft without recreating discarded drafts on close
- [ ] 3.4 Implement finish flow by calling the repository-backed draft finalization operation, then navigating to the vacancy list and starting the initial update

## 4. Validation And Regression Coverage

- [ ] 4.1 Add repository or app-layer tests for applicant-scoped draft save/load/delete/finalize behavior and meaningful-draft detection
- [ ] 4.2 Add tests for draft-based cover-letter generation and wizard finish creating a real job search from draft state
- [ ] 4.3 Add UI tests for resume/discard prompt handling, two-step wizard navigation, and post-finish transition to the vacancy list
- [ ] 4.4 Run the required project verification commands and fix any regressions caused by the new `ui/views` and draft flow changes
