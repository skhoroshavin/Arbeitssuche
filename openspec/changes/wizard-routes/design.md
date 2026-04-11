## Context

Both creation wizards (applicant and job search) are currently implemented as Headless UI `Dialog` modals that overlay the normal `AppLayout`. They share a `WizardModalShell` wrapper and `useDraftWizardLifecycle` hook. Each wizard is launched by state in its parent page (`list.tsx` / `overview.tsx`), which also hosts a separate resume-draft modal that must be dismissed before the wizard appears.

The `JobSearchWizardModal` is incorrectly located in `src/ui/pages/applicant/components/`, violating the architecture's domain isolation rules enforced by `eslint-plugin-unslop`.

## Goals / Non-Goals

**Goals:**
- Replace both wizard modals with full-screen route pages using a shared `WizardLayout`
- Integrate the resume-draft prompt into each wizard page's own initialisation phase
- Cancel navigates back to the semantically correct origin (applicant list / applicant overview)
- Move job search wizard into `src/ui/pages/job-search/` domain
- Simplify entry-point pages (`list.tsx`, `overview.tsx`) to a single `navigate()` call

**Non-Goals:**
- URL-per-step sub-routing (steps stay as local state)
- Any changes to draft storage, persistence, or the IPC layer
- Changes to wizard step content (the `shared-*.tsx` views and `JobSearchSearchConfigView` / `JobSearchCoverLetterView` are untouched)
- Changing when or how auto-save fires within a wizard

## Decisions

### 1. Steps as local state, not URL sub-routes

Steps remain a local `useState` in each wizard page, exactly as today.

Sub-routes (`/applicants/new/personal`, `/applicants/new/experience`, …) would add browser history within the wizard, but the value is low: deep-linking to an in-progress creation step is not meaningful, and the blocker logic needed to prevent mid-wizard back navigation would add significant complexity. The step label in the sidebar already communicates position clearly.

### 2. `WizardLayout` as a shared component, not a route wrapper

`WizardLayout` is a regular React component that each wizard page renders as its root element. It accepts `title`, `steps[]` (with `id`, `label`, and `state: "done" | "current" | "pending"`), `children`, and button handlers (`onCancel`, `onBack?`, `onNext?`, `onFinish?`, `finishDisabled?`).

The wizard routes in `app.tsx` are siblings to the `<Route element={<AppLayout />}>` wrapper — no shared parent layout route. This avoids introducing an `<Outlet>`-based layout route whose only purpose would be suppressing the sidebar/header.

```
<Routes>
  <Route element={<AppLayout />}>
    ... existing routes ...
  </Route>
  <Route path="/applicants/new"
         element={<ApplicantWizardPage />} />
  <Route path="/applicants/:applicantId/job-searches/new"
         element={<JobSearchWizardPage />} />
</Routes>
```

Alternative considered: `<Route element={<WizardLayout />}>` as a parent wrapper with `<Outlet>` for content — rejected because it forces step content through `<Outlet>`, which requires either context or route-level step state, adding indirection for no gain.

### 3. Return-to URL derived from the route shape

Each wizard's cancel destination is statically determined by its route:

- `/applicants/new` → returns to `/`
- `/applicants/:applicantId/job-searches/new` → returns to `/applicants/:applicantId`

The `onClose` callback passed to `useDraftWizardLifecycle` becomes `() => navigate(returnTo)` where `returnTo` is a constant at the wizard page level.

Alternative considered: passing `returnTo` via `location.state` (as the settings page does) — unnecessary here because the origin is always deterministic from the route structure itself.

### 4. Resume-draft as an initialisation phase within the wizard page

Each wizard page manages a `phase: "loading" | "resume-prompt" | "editing"` state. On mount it checks for an existing draft. If a meaningful draft exists, it shows a resume-or-discard UI inline (replacing the first step's content area). Once resolved, it enters the normal editing flow.

The `ApplicantResumeDraftModal`, `JobSearchResumeDraftModal`, and the shared `ResumeDraftModal` components are deleted. The `draft-launch.ts` helpers (`resumeDraftSnapshot`, `discardDraftAndOpen`, `closeDraftPrompt`) are also removed as they only served the old modal-launch pattern from the parent page.

### 5. `WizardCancelChoicesModal` stays as a dialog

When the user cancels a wizard with a meaningful draft, the choices dialog (continue / keep draft / discard) remains a `Dialog` overlay on top of the wizard page. This is semantically correct: it is an interruption that requires a decision, not a step in the flow.

### 6. `useDraftWizardLifecycle` unchanged

The hook's interface is unchanged. Only the call site changes: `onClose` becomes `() => navigate(returnTo)` instead of closing a modal. `onFinished` still calls `navigate()` to the newly created entity's page.

## Risks / Trade-offs

**Step state lost on page refresh** → The draft is auto-saved; only the current step index resets to step 1 on refresh. This matches current behaviour (the modal also loses step position on unmount). Risk: acceptable.

**Direct URL access to a wizard route** → Navigating to `/applicants/new` without prior navigation creates a fresh draft on mount. No meaningful broken state. Risk: none.

**`wizard-modal.test.tsx` imports from `wizard-modal.tsx`** → The test imports `canFinalizeApplicantWizard` and `createFreshApplicantWizardSnapshot`. These functions move to `wizard.tsx` and the test file must be renamed to `wizard.test.tsx` with its import updated. Risk: trivial.

**`no-false-sharing` lint rule** → `WizardLayout` must be consumed by at least 2 distinct entities to satisfy the shared-module rule. It will be used by `ApplicantWizardPage` and `JobSearchWizardPage`, satisfying the constraint.

## Migration Plan

No data migration. This is a pure UI/routing change. The draft storage layer is unaffected. Both wizards are migrated in a single changeset — partial migration (one wizard on routes, one still modal) is avoided because they share `WizardLayout` and the lifecycle hook interface.

Rollback: revert the changeset. No persistent state is affected.
