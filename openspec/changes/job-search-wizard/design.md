## Context

Job search creation currently persists a new job search immediately from the applicant overview and then relies on route-based pages for configuration and cover-letter editing. This works for simple creation, but it makes the first-run experience fragmented, leaves no clean way to cancel before persistence, and provides no recovery path when the app or wizard is closed before setup is finished.

This change introduces two new architectural patterns at once: a reusable `ui/views` layer that can be hosted by both wizard and normal pages, and a job-search draft lifecycle that persists unfinished creation state per applicant. The design needs to preserve the existing autosave ergonomics for normal edit pages while redirecting wizard autosave into draft storage instead of final entities.

Constraints from the current codebase:

- UI architecture currently distinguishes `ui/components`, `ui/hooks`, `ui/layout`, `ui/data`, and `ui/pages/*`; `ui/views` does not exist yet and will require a new architecture boundary.
- Current page-level job-search views are route-aware and persistence-aware, so they cannot be reused directly by a pre-create wizard.
- Cover-letter generation currently loads a persisted job search by id, even though the prompt-building logic only needs applicant data plus job-search-like search context.
- `useAutoSave` currently flushes unsaved changes on unmount, which is useful for crash recovery but conflicts with explicit discard flows unless close reasons are handled deliberately.

## Goals / Non-Goals

**Goals:**

- Introduce a job-search creation wizard that does not create a real job search until the user finishes.
- Persist one job-search draft per applicant so unfinished work can be resumed after interruption.
- Reuse the same job-search editing views in both wizard and normal page contexts.
- Support cover-letter generation from draft state during the wizard.
- Keep persisted job searches on a simple default flow where the vacancy list is the main working view.

**Non-Goals:**

- Introduce a shared cross-domain draft repository; drafts remain domain-specific.
- Redesign vacancy list behavior beyond making it the destination after wizard completion.
- Build the future applicant creation wizard in this change.
- Replace existing autosave patterns across the rest of the app.

## Decisions

### 1. Add a dedicated `ui/views` layer for reusable, domain-scoped edit views

The change will introduce `src/ui/views/*` as a new architectural layer. Views in this layer will be domain-scoped, such as `ui/views/job-search/*`, and will host reusable form sections like search parameters, preferences, and cover-letter editing.

Rationale:

- The same domain edit surfaces need to be hosted by two different shells: route pages for persisted entities and modal wizards for drafts.
- Keeping these views outside `ui/pages/*` allows future applicant-creation work to follow the same pattern without coupling reuse to one page group.
- The views layer can depend on UI primitives and domain models, while page and wizard wrappers remain responsible for routing, loading, persistence targets, and navigation.

Alternatives considered:

- Keep shared pieces under `ui/pages/job-search/*`: rejected because the user intends to reuse the same pattern for applicant creation, and page-scoped reuse would not establish a reusable architectural seam.
- Reuse current route pages directly: rejected because current page files mix route params, autosave, and persistence logic with the view composition.

### 2. Make shared views strongly typed and host-adapted

The extracted job-search views will be built around a shared editor snapshot model and hosted through wrappers that choose the persistence target. Shared views should expose typed value and update contracts for the part of the editor they own, for example a snapshot slice plus an `onUpdate` callback that returns the updated typed object. Host-specific concerns such as autosave, persistence target, and wizard navigation remain outside the view contract.

Wrappers may still use `react-hook-form` internally if it remains useful for page-level or wizard-level state handling, but that form-library detail should stay inside the wrapper/adapter layer rather than becoming the public contract of `ui/views`.

Two wrapper types will exist:

- Normal page wrappers: load persisted job-search data plus cover-letter content, map them into the shared editor snapshot, and autosave back to normal job-search storage.
- Wizard wrappers: load or create an applicant-scoped draft snapshot and autosave back to draft storage.

The shared editor snapshot is the common shape between both hosts:

- search parameters,
- search preferences,
- cover-letter content.

Rationale:

- The same fields need different save targets, not different field behavior.
- Typed value/update contracts keep `ui/views` independent from a specific form-state library and avoid leaking too much implementation detail into the reusable layer.
- Explicit host action props keep persistence and workflow concerns visible instead of hiding them behind a generic persistence context.
- This keeps wizard-specific state like step navigation, cancel actions, and finish actions out of the shared views.

Alternatives considered:

- Expose `react-hook-form` directly through `FormProvider` as the primary `ui/views` contract: rejected because it is a weaker typed boundary and couples the reusable layer to one form implementation.
- Add `isWizard` or `mode` flags throughout each shared view: rejected because it would turn the views into mode-switching containers instead of reusable surfaces.
- Introduce a dedicated React persistence context immediately: rejected because the current need is adapter-style host injection, and explicit typed props are easier to reason about unless wiring becomes too deep.
- Use separate wizard-only and page-only forms with duplicated field composition: rejected because it would repeat labels, sections, and validation rules.

### 3. Keep drafts in the job-search persistence module with dedicated draft operations

Unfinished creation state will live alongside job-search persistence, but drafts will remain a distinct persistence path rather than being exposed as normal job-search ids. The persistence module will grow dedicated draft operations keyed by applicant id, for example loading, saving, deleting, and finalizing a draft.

The draft shape will be the shared editor snapshot rather than the raw `JobSearch` entity because wizard editing also includes cover-letter content, which is currently stored separately for persisted job searches.

Rationale:

- The editable search data closely matches normal job-search editing, so keeping draft support in the same persistence area avoids unnecessary repository splitting.
- The uniqueness rule is applicant-scoped, which fits the user requirement that each applicant has at most one in-progress job-search draft.
- Keeping draft access as dedicated methods prevents drafts from leaking into normal job-search lists, routes, or id-based flows.

Alternatives considered:

- Store drafts in a separate job-search draft repository: rejected because the storage concerns are tightly coupled to job-search persistence and cover-letter handling.
- Expose drafts as fake job-search ids: rejected because it would blur the boundary between drafts and real searches and increase the risk of drafts appearing in normal entity flows.
- Store drafts only in memory or route state: rejected because recovery after restart is a requirement.

### 4. Make finish one atomic draft-finalization operation inside the job-search repository

Finishing the wizard will call one draft-finalization operation owned by the job-search repository, with IPC/app layers acting only as thin wrappers. That repository operation will:

- load the applicant-scoped draft snapshot,
- create the real job search,
- persist the configured job-search data,
- persist the cover-letter template,
- delete the draft,
- return the created job-search id.

The UI will then navigate to the vacancy list and start the initial update.

Rationale:

- Finish is one business action with multiple persistence steps.
- Draft loading, job-search creation, cover-letter persistence, and draft cleanup are all job-search persistence concerns, so keeping them in the repository keeps the transaction boundary explicit.
- The caller should see this as one atomic operation, with app/IPC code delegating rather than orchestrating.
- This reduces partial-success states and keeps wizard logic simpler.

Alternatives considered:

- Have the UI call create, save, cover-letter save, and delete-draft separately: rejected because it spreads failure handling across multiple client mutations.
- Put the orchestration into a separate service despite all state living in the job-search persistence module: rejected because the repository is the clearer owner for this transactional behavior.
- Persist a real job search early and mutate it through the wizard: rejected because it reintroduces incomplete entities and makes cancel semantics ambiguous.

### 5. Add a draft generation entrypoint that reuses the normal cover-letter generation logic

Cover-letter generation during the wizard will use a draft-aware entrypoint that loads the applicant and the current draft snapshot, resolves them into the normal generation input, and reuses the existing prompt-building and LLM generation logic.

Rationale:

- The core generation logic already only needs applicant data plus job-search-like search context.
- This keeps generation available in the wizard without creating a real job search early.
- The new work is limited to draft-aware loading and mapping rather than duplicating generation behavior.

Alternatives considered:

- Remove generation from the wizard: rejected because generation is explicitly in scope.
- Duplicate the normal generation logic for drafts: rejected because the actual difference is data loading, not prompt behavior.
- Create a temporary real job search only to support generation: rejected because it conflicts with the goal of draft-first creation.

### 6. Keep autosave for drafts, but add an explicit discard-safe close path

Wizard editing will still autosave, but explicit cancel/discard flows must bypass the existing unmount flush semantics. The wizard close flow will distinguish between:

- continue editing,
- keep draft for later,
- discard draft.

Discard must prevent a final autosave flush from recreating the draft while the dialog is closing.

Rationale:

- Autosave is still the best fit for crash recovery and consistency with the rest of the app.
- Cancel is no longer a single destructive action; it is a decision point with user-controlled persistence.
- Without a discard-safe close path, the existing autosave-on-unmount behavior would fight the intended UX.

Alternatives considered:

- Turn autosave off in the wizard: rejected because it would weaken crash recovery and require more explicit save handling.
- Keep autosave but treat cancel as immediate close: rejected because it would either surprise users with preserved drafts or accidentally discard work.

### 7. Treat blank untouched drafts as non-resumable

The resume prompt shown on `Neue Suche` should only appear for meaningful drafts, not for empty wizard sessions that were opened and closed without real input.

Rationale:

- The autosave system can otherwise create noisy draft records from incidental opens.
- Resume prompts should indicate meaningful recoverable work, not accidental shell state.

Alternatives considered:

- Prompt for every stored draft row: rejected because it would quickly produce annoying false-positive resume prompts.

## Risks / Trade-offs

- [New architectural layer increases complexity] -> Keep `ui/views` domain-scoped and intentionally narrow: reusable edit surfaces only, no route or data loading logic.
- [Draft and final entity models can drift] -> Use one shared editor snapshot model and explicit mapping functions between draft storage, persisted job searches, cover letters, and view state.
- [Discard flow may conflict with autosave-on-unmount] -> Add a close/discard path that suppresses the final flush when the user chooses to discard.
- [Finalization may partially succeed if split across multiple client mutations] -> Use one atomic draft-finalization operation in the job-search repository behind the UI boundary.
- [Draft cover-letter generation may duplicate persisted generation logic] -> Reuse the existing prompt-generation path and only add a draft-specific loading entrypoint.
- [Resume prompts may become noisy] -> Only surface drafts that have meaningful user changes.

## Migration Plan

1. Add the new `ui/views` architecture boundary and extract job-search edit views without changing existing persisted behavior yet.
2. Introduce job-search draft operations in the job-search persistence module, draft IPC/data access, and a draft generation entrypoint.
3. Add the create wizard on the applicant overview and route its autosave into the job-search draft persistence path.
4. Add draft finalization, navigation to the vacancy list, and automatic crawl start after finish.
5. Switch the persisted job-search default entry flow to the vacancy list once wizard-based creation is active.

Rollback strategy:

- The wizard entry point can be disabled and creation can temporarily fall back to the current immediate-create flow.
- Draft persistence can remain unused without affecting existing persisted job searches.
- Because drafts are separate from real entities, rollback risk is isolated to the creation flow.

## Open Questions

- Should a draft be created lazily on the first meaningful field change, or eagerly when the wizard opens but only marked resumable after meaningful edits?
- Should the wizard finish path start the crawl directly inside the finalization flow or keep crawl start as a separate UI-triggered step after successful finalization?
- Should the resume/discard prompt be a lightweight confirmation dialog or a richer chooser that also shows when the draft was last updated?
- Will simple typed value/update contracts remain sufficient for host injection, or will a dedicated view-host context become worthwhile once applicant creation adopts the same pattern?
