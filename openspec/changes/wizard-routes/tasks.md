## 1. WizardLayout component

- [x] 1.1 Create `src/ui/layout/wizard-layout.tsx` — two-column layout (step-list sidebar + scrollable content area) with fixed footer (Cancel, Back?, Next/Finish)
- [x] 1.2 Step list renders each step with done/current/pending visual states derived from the current step index
- [x] 1.3 Footer shows Back only when `onBack` is provided, Next only when `onNext` is provided, Finish only when `onFinish` is provided
- [x] 1.4 Export `WizardLayout` from `src/ui/layout/index.ts`

## 2. Applicant wizard page

- [x] 2.1 Create `src/ui/pages/applicant/views/wizard.tsx` with a `phase` state: `"loading" | "resume-prompt" | "editing"`
- [x] 2.2 On mount, check for an existing applicant draft via `useApplicantDraft`; if meaningful draft found set phase to `"resume-prompt"`, otherwise create fresh draft and set phase to `"editing"`
- [x] 2.3 Render inline resume/discard prompt when phase is `"resume-prompt"` (no modal — within the main content area of WizardLayout)
- [x] 2.4 Move `canFinalizeApplicantWizard` and `createFreshApplicantWizardSnapshot` from `wizard-modal.tsx` into `wizard.tsx`
- [x] 2.5 Wire `useDraftWizardLifecycle` with `onClose: () => navigate("/")` and `onFinished: (id) => navigate(\`/applicants/${id}\`)`
- [x] 2.6 Render `WizardLayout` with applicant steps: personal, experience, education, certifications, other

## 3. Job search wizard page

- [x] 3.1 Create `src/ui/pages/job-search/views/wizard.tsx` — port logic from `src/ui/pages/applicant/components/job-search-wizard-modal.tsx`
- [x] 3.2 Read `applicantId` from route params via `useParams`
- [x] 3.3 Add `phase` state (`"loading" | "resume-prompt" | "editing"`) with same draft-check-on-mount pattern as applicant wizard
- [x] 3.4 Wire `useDraftWizardLifecycle` with `onClose: () => navigate(\`/applicants/${applicantId}\`)` and `onFinished: (id) => navigate(\`/job-searches/${id}/vacancies\`, { state: { startInitialUpdate: true } })`
- [x] 3.5 Render `WizardLayout` with job search steps: parameters, mode, sources, preferences, cover-letter

## 4. Routes and entry points

- [x] 4.1 Add `<Route path="/applicants/new" element={<ApplicantWizardPage />} />` to `src/ui/app.tsx` as a sibling of the `AppLayout` wrapper (not nested inside it)
- [x] 4.2 Add `<Route path="/applicants/:applicantId/job-searches/new" element={<JobSearchWizardPage />} />` alongside it
- [x] 4.3 Export `ApplicantWizardPage` from `src/ui/pages/applicant/index.ts`
- [x] 4.4 Export `JobSearchWizardPage` from `src/ui/pages/job-search/index.ts`
- [x] 4.5 Re-export both from `src/ui/pages/index.ts`
- [x] 4.6 Simplify `src/ui/pages/applicant/views/list.tsx`: remove `wizardSnapshot` state, `showResumeDraftModal` state, and all draft-launch logic; replace `onCreateClick` with `navigate("/applicants/new")`
- [x] 4.7 Simplify `src/ui/pages/applicant/views/overview.tsx`: remove `wizardSnapshot` state, `showResumeDraftModal` state, and all draft-launch logic; replace `onCreateClick` with `navigate(\`/applicants/${id}/job-searches/new\`)`

## 5. Delete deprecated files

- [x] 5.1 Delete `src/ui/pages/applicant/views/wizard-modal.tsx` (replaced by `wizard.tsx`)
- [x] 5.2 Delete `src/ui/pages/applicant/components/job-search-wizard-modal.tsx` (replaced by `job-search/views/wizard.tsx`)
- [x] 5.3 Delete `src/ui/pages/applicant/components/wizard-modal-shell.tsx` (replaced by `WizardLayout`)
- [x] 5.4 Delete `src/ui/pages/applicant/components/applicant-resume-draft-modal.tsx`
- [x] 5.5 Delete `src/ui/pages/applicant/components/job-search-resume-draft-modal.tsx`
- [x] 5.6 Delete `src/ui/pages/applicant/components/resume-draft-modal.tsx` (shared base, no longer needed)
- [x] 5.7 Delete `src/ui/pages/applicant/hooks/draft-launch.ts` (helpers only served the modal-launch pattern)
- [x] 5.8 Remove deleted exports from `src/ui/pages/applicant/components/index.ts`
- [x] 5.9 Remove `draft-launch` exports from `src/ui/pages/applicant/hooks/index.ts`

## 6. Tests

- [x] 6.1 Rename `src/ui/pages/applicant/views/wizard-modal.test.tsx` to `wizard.test.tsx`
- [x] 6.2 Update import in `wizard.test.tsx` from `"./wizard-modal"` to `"./wizard"`

## 7. Verify

- [x] 7.1 Run `npm run fix` and resolve any lint or format issues
- [x] 7.2 Run `npm run verify` and confirm clean build and passing tests
