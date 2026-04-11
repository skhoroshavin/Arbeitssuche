## Context

Applicant creation currently starts on the root applicant list, persists an applicant record immediately from a single name field, and then relies on the existing applicant edit tabs to fill in the rest of the profile. This differs from the newer job-search creation flow, which opens a wizard, autosaves draft state, offers resume and discard choices, and only persists a real record on finish.

This change crosses the applicant list UI, applicant editor UI, React Query data hooks, IPC handlers, and applicant repositories. It also introduces a new persistence concept for applicants: an in-progress draft that exists before any persisted applicant record is created.

## Goals / Non-Goals

**Goals:**
- Make applicant creation an exact lifecycle analogue of the job-search wizard: draft first, persist on finish.
- Prevent abandoned applicant setup from leaving behind incomplete persisted applicants.
- Reuse the existing applicant editing sections so the wizard and persisted editor stay behaviorally aligned.
- Support resume, keep-draft, and discard flows for meaningful applicant drafts.
- Keep the normal persisted applicant routes and editing workflow intact after finalization.

**Non-Goals:**
- Redesign the applicant data model beyond what draft persistence requires.
- Add new applicant fields or validation rules unrelated to the wizard lifecycle.
- Change existing persisted applicant editing semantics outside the shared editor extraction needed for reuse.
- Support multiple concurrent applicant drafts.

## Decisions

### Use one global applicant draft
Applicant creation starts from the root applicant list and has no parent entity to key drafts by. The system will therefore maintain at most one in-progress applicant draft globally.

Why this decision:
- It preserves the exact job-search-wizard behavior of "resume existing draft or start over" while fitting the root-level applicant entry point.
- It avoids creating a draft-management UX for multiple unnamed applicants.

Alternatives considered:
- Multiple applicant drafts: rejected because the applicant list has no natural draft identity before `personal.name` is stable, and the UX becomes a draft browser instead of an exact analogue.
- Persist immediately and mark applicants incomplete: rejected because it breaks the core invariant of PR #55.

### Finalize the draft into a real applicant only on finish
The applicant repository will gain `loadDraft`, `saveDraft`, `deleteDraft`, and `finalizeDraft` operations. Finalization will resolve the draft snapshot, derive the final applicant id from the applicant name, save the applicant, delete the draft, and return the new id.

Why this decision:
- It matches the job-search repository lifecycle directly.
- It keeps the existing persisted applicant model and routes unchanged once creation is complete.

Alternatives considered:
- Create a placeholder applicant row and mutate it through the wizard: rejected because it would reintroduce abandoned partial records.

### Extract shared applicant section views from the current live editor pages
The current applicant edit pages are route wrappers that depend on `useApplicantForm()` and a persisted `:id`. The wizard should reuse the same section rendering without depending on route params or live persistence, so the section UI should be extracted into shared applicant editor views that accept form bindings as props.

Why this decision:
- It prevents the wizard and persisted editor from drifting apart.
- It keeps field behavior, labels, and arrays consistent between creation and later editing.

Alternatives considered:
- Duplicate the applicant section UI inside the wizard: rejected because it creates parallel forms that will diverge.
- Reuse the route pages directly: rejected because they are coupled to persisted-applicant loading and autosave-by-id.

### Keep the wizard as a modal launched from the applicant list
The job-search flow introduced a modal wizard from an existing page instead of a separate route tree. To keep the applicant flow an exact analogue, the applicant list should launch a modal wizard with step navigation, cancel handling, and finish behavior.

Why this decision:
- It preserves the same interaction pattern the user explicitly requested.
- It keeps the create action anchored to the current applicant list view.

Alternatives considered:
- Routed wizard pages under `/applicants/new/*`: rejected because it is a different interaction model, even if technically viable.

### Use meaningful-draft detection against a default applicant snapshot
Applicant draft persistence will store both the draft snapshot and whether it is meaningful. Meaningfulness should be computed by comparing the normalized draft snapshot against the default blank applicant state, with a typed name or any non-default field counting as meaningful progress.

Why this decision:
- It mirrors the existing job-search draft behavior of suppressing resume prompts for untouched drafts.
- It keeps cancel behavior predictable for users who opened the wizard and closed it without editing.

Alternatives considered:
- Prompt on any stored draft, even blank ones: rejected because it creates noisy resume prompts.

## Risks / Trade-offs

- [Shared view extraction touches multiple applicant pages] -> Mitigation: keep route wrappers thin and move only rendering logic into shared section components or views.
- [Global draft identity may block starting a second applicant intentionally] -> Mitigation: make the resume/discard dialog explicit and fast so users can intentionally discard and restart.
- [Finalization depends on applicant name for id generation] -> Mitigation: require a non-empty name before finishing or keep the finish action disabled until the personal step contains a valid name.
- [Autosave semantics may diverge between wizard draft mode and persisted edit mode] -> Mitigation: keep one form-value mapping layer and separate only the save target.
- [Repository changes add new persistence state] -> Mitigation: mirror the job-search repository contract and cover SQLite and stub repositories with round-trip tests.

## Migration Plan

1. Add applicant draft types and repository operations in stub and SQLite implementations.
2. Expose applicant draft lifecycle through IPC and React Query hooks.
3. Extract shared applicant editor section views from the current route-bound edit pages.
4. Replace the applicant-list inline create form with the applicant wizard modal and resume/discard dialogs.
5. Add finish navigation into the persisted applicant overview and keep existing `/applicants/:id/*` routes unchanged.
6. Update E2E and repository tests to cover draft recovery, discard, and finalize behavior.

Rollback strategy:
- Revert the applicant list to immediate `applicants:create` behavior and remove draft IPC/repository paths.
- Shared section extraction is low-risk to keep if needed because it does not alter persisted applicant requirements on its own.

## Open Questions

- Should the finish action be enabled only on the final step, or earlier once a valid name exists?
- Should the wizard open directly to the first step after discarding an existing draft, or return to the applicant list first?
- Should the applicant list show any passive indication that a draft exists before the user clicks `Neuer Bewerber`, or only surface it in the resume prompt?
