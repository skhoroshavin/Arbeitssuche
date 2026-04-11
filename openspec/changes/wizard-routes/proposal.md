## Why

Wizard dialogs currently overlay the normal app layout as modal dialogs, wasting screen space and creating a poor user experience. Converting them to dedicated full-screen route pages gives wizards the full viewport, makes navigation intent explicit in the URL, and simplifies the entry-point code that currently manages modal and draft state.

## What Changes

- New `WizardLayout` component shared by both wizard routes: two-column layout with a step-list sidebar (showing done/current/pending states), a scrollable content area, and a fixed navigation footer with Cancel, Back, and Next/Finish actions.
- Applicant creation wizard becomes a dedicated route at `/applicants/new` instead of a modal overlay launched from `list.tsx`.
- Job search creation wizard becomes a dedicated route at `/applicants/:applicantId/job-searches/new` instead of a modal overlay launched from `overview.tsx`.
- Resume-draft prompt (currently a modal-before-modal) is absorbed into each wizard page's own initial render state — no separate modal needed.
- Cancelling a wizard navigates back to the originating page rather than closing an overlay. Applicant wizard returns to `/` (applicant list); job search wizard returns to `/applicants/:id` (applicant overview).
- `list.tsx` and `overview.tsx` simplified: wizard state removed, entry point becomes a plain `navigate()` call.
- Job search wizard files move from `src/ui/pages/applicant/` to `src/ui/pages/job-search/` where they belong architecturally.
- Deleted: `wizard-modal-shell.tsx`, `applicant-resume-draft-modal.tsx`, `job-search-resume-draft-modal.tsx`, `wizard-modal.tsx` (replaced by wizard page), `job-search-wizard-modal.tsx` (replaced by wizard page).

## Capabilities

### New Capabilities

- `wizard-layout`: Shared full-screen layout for wizard route pages — step list sidebar, content area, navigation footer with Cancel/Back/Next/Finish.

### Modified Capabilities

- `applicant-creation-wizard`: Cancel now navigates back to the applicant list. Resume-draft prompt is integrated into the wizard page rather than shown as a pre-modal on the list page.
- `job-search-creation-wizard`: Cancel now navigates back to the applicant overview. Resume-draft prompt is integrated into the wizard page. Wizard has its own route rather than being modal-over-overview.

## Impact

- `src/ui/app.tsx`: Two new routes added outside the `AppLayout` wrapper.
- `src/ui/layout/`: New `wizard-layout.tsx` and updated `index.ts`.
- `src/ui/pages/applicant/views/`: `wizard-modal.tsx` replaced by `wizard.tsx` (page component); `list.tsx` simplified.
- `src/ui/pages/applicant/components/`: Several files deleted (modal shell, resume modals, job search wizard modal).
- `src/ui/pages/job-search/views/`: New `wizard.tsx` (job search wizard page, moved from applicant domain).
- `src/ui/pages/index.ts`, `src/ui/pages/applicant/index.ts`, `src/ui/pages/job-search/index.ts`: Export surfaces updated.
- No backend or IPC changes. No new dependencies.
