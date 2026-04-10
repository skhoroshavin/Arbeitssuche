## Context

Job search creation currently persists a new job search immediately from the applicant overview and then relies on route-based pages for configuration and cover-letter editing. This works for simple creation, but it makes the first-run experience fragmented, leaves no clean way to cancel before persistence, and provides no recovery path when the app or wizard is closed before setup is finished.

This change introduces two new architectural patterns at once: a reusable `ui/views` layer that can be hosted by both wizard and normal pages, and a job-search draft lifecycle that persists unfinished creation state per applicant. The design needs to preserve the existing autosave ergonomics for normal edit pages while redirecting wizard autosave into drafts instead of final entities.

Constraints from the current codebase:

- UI architecture currently distinguishes `ui/components`, `ui/hooks`, `ui/layout`, `ui/data`, and `ui/pages/*`; `ui/views` does not exist yet and will require a new architecture boundary.
- Current page-level job-search views are route-aware and persistence-aware, so they cannot be reused directly by a pre-create wizard.
- Cover-letter generation currently loads a persisted job search by id, so draft generation needs a new path that operates on draft-backed data.
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

### 2. Make shared views form-driven but persistence-agnostic

The extracted job-search views will be built around a shared form-value model and hosted through wrappers that choose the persistence target.

Two wrapper types will exist:

- Normal page wrappers: load persisted job-search data and autosave back to the real job search and cover-letter storage.
- Wizard wrappers: load or create an applicant-scoped draft and autosave back to draft storage.

Rationale:

- The same fields need different save targets, not different field behavior.
- This keeps wizard-specific state like step navigation, cancel actions, and finish actions out of the shared views.
- The same view can be rendered with autosave to a final entity, autosave to a draft, or potentially no autosave in future contexts.

Alternatives considered:

- Add `isWizard` or `mode` flags throughout each shared view: rejected because it would turn the views into mode-switching containers instead of reusable surfaces.
- Use separate wizard-only and page-only forms with duplicated field composition: rejected because it would repeat labels, sections, and validation rules.

### 3. Add a separate job-search draft repository with one draft per applicant

Unfinished creation state will be stored in a dedicated job-search draft repository keyed by applicant id. The draft will contain the editable job-search fields needed by the wizard, including search parameters, preferences, and cover-letter content.

Rationale:

- The draft must survive unexpected close and support explicit resume/discard flows.
- A dedicated repository matches the decision to keep draft persistence domain-specific.
- The uniqueness rule is applicant-scoped, which fits the user requirement that each applicant has at most one in-progress job-search draft.

Alternatives considered:

- Store drafts only in memory or route state: rejected because recovery after restart is a requirement.
- Store drafts in a generic cross-domain draft table: rejected because the chosen direction is separate repositories per domain.
- Infer an unfinished draft from a partially created real job search: rejected because it pollutes normal entity state and keeps the cancellation problem unsolved.

### 4. Create a draft finalization service instead of orchestrating finish in the UI

Finishing the wizard will call a single app/service-level finalization path that:

- loads the applicant-scoped draft,
- creates the real job search,
- persists the configured job-search data,
- persists the cover-letter template,
- deletes the draft,
- returns the created job-search id.

The UI will then navigate to the vacancy list and start the initial update.

Rationale:

- Finish is one business action with multiple persistence steps.
- A single finalization boundary reduces partial-success states and keeps the wizard logic simpler.
- This pattern can be mirrored later for applicant draft finalization without sharing repositories.

Alternatives considered:

- Have the UI call create, save, cover-letter save, and delete-draft separately: rejected because it spreads failure handling across multiple client mutations.
- Persist a real job search early and mutate it through the wizard: rejected because it reintroduces incomplete entities and makes cancel semantics ambiguous.

### 5. Add draft-based cover-letter generation instead of requiring a real job-search id

Cover-letter generation during the wizard will use a draft-aware path that loads the applicant and the current job-search draft, resolves them into the shape needed by the existing generation logic, and returns generated cover-letter content to the draft-backed form.

Rationale:

- The current generation prompt only needs applicant data plus job-search-like search context.
- This keeps generation available in the wizard without creating a real job search early.
- It preserves one consistent cover-letter generation capability across draft and persisted contexts.

Alternatives considered:

- Remove generation from the wizard: rejected because generation is explicitly in scope.
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
- [Draft and final entity models can drift] -> Use a shared form-value model and explicit mapping functions between drafts, persisted job searches, and view state.
- [Discard flow may conflict with autosave-on-unmount] -> Add a close/discard path that suppresses the final flush when the user chooses to discard.
- [Finalization may partially succeed if split across multiple client mutations] -> Use a single service-level finalize operation.
- [Draft cover-letter generation may duplicate persisted generation logic] -> Reuse the existing prompt-generation path and only add draft-specific loading/resolution logic.
- [Resume prompts may become noisy] -> Only surface drafts that have meaningful user changes.

## Migration Plan

1. Add the new `ui/views` architecture boundary and extract job-search edit views without changing existing persisted behavior yet.
2. Introduce job-search draft persistence, draft IPC/data access, and draft-aware cover-letter generation.
3. Add the create wizard on the applicant overview and route its autosave into the draft repository.
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
