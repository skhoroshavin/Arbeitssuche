## 1. WizardLayout component

- [ ] 1.1 Create `src/ui/layout/wizard-layout.tsx` — two-column layout (step-list sidebar + scrollable content area) with fixed footer (Cancel, Back?, Next/Finish)
- [ ] 1.2 Step list renders each step with done/current/pending visual states derived from the current step index
- [ ] 1.3 Footer shows Back only when `onBack` is provided, Next only when `onNext` is provided, Finish only when `onFinish` is provided
- [ ] 1.4 Export `WizardLayout` from `src/ui/layout/index.ts`

## 2. Applicant wizard page

- [ ] 2.1 Create `src/ui/pages/applicant/views/wizard.tsx` with a `phase` state: `"loading" | "resume-prompt" | "editing"`
- [ ] 2.2 On mount, check for an existing applicant draft via `useApplicantDraft`; if meaningful draft found set phase to `"resume-prompt"`, otherwise create fresh draft and set phase to `"editing"`
- [ ] 2.3 Render inline resume/discard prompt when phase is `"resume-prompt"` (no modal — within the main content area of WizardLayout)
- [ ] 2.4 Move `canFinalizeApplicantWizard` and `createFreshApplicantWizardSnapshot` from `wizard-modal.tsx` into `wizard.tsx`
- [ ] 2.5 Wire `useDraftWizardLifecycle` with `onClose: () => navigate("/")` and `onFinished: (id) => navigate(\`/applicants/${id}\`)`
- [ ] 2.6 Render `WizardLayout` with applicant steps: personal, experience, education, certifications, other

## 3. Job search wizard page

- [ ] 3.1 Create `src/ui/pages/job-search/views/wizard.tsx` — port logic from `src/ui/pages/applicant/components/job-search-wizard-modal.tsx`
- [ ] 3.2 Read `applicantId` from route params via `useParams`
- [ ] 3.3 Add `phase` state (`"loading" | "resume-prompt" | "editing"`) with same draft-check-on-mount pattern as applicant wizard
- [ ] 3.4 Wire `useDraftWizardLifecycle` with `onClose: () => navigate(\`/applicants/${applicantId}\`)` and `onFinished: (id) => navigate(\`/job-searches/${id}/vacancies\`, { state: { startInitialUpdate: true } })`
- [ ] 3.5 Render `WizardLayout` with job search steps: parameters, mode, sources, preferences, cover-letter

## 4. Routes and entry points

- [ ] 4.1 Add `<Route path="/applicants/new" element={<ApplicantWizardPage />} />` to `src/ui/app.tsx` as a sibling of the `AppLayout` wrapper (not nested inside it)
- [ ] 4.2 Add `<Route path="/applicants/:applicantId/job-searches/new" element={<JobSearchWizardPage />} />` alongside it
- [ ] 4.3 Export `ApplicantWizardPage` from `src/ui/pages/applicant/index.ts`
- [ ] 4.4 Export `JobSearchWizardPage` from `src/ui/pages/job-search/index.ts`
- [ ] 4.5 Re-export both from `src/ui/pages/index.ts`
- [ ] 4.6 Simplify `src/ui/pages/applicant/views/list.tsx`: remove `wizardSnapshot` state, `showResumeDraftModal` state, and all draft-launch logic; replace `onCreateClick` with `navigate("/applicants/new")`
- [ ] 4.7 Simplify `src/ui/pages/applicant/views/overview.tsx`: remove `wizardSnapshot` state, `showResumeDraftModal` state, and all draft-launch logic; replace `onCreateClick` with `navigate(\`/applicants/${id}/job-searches/new\`)`

## 5. Delete deprecated files

- [ ] 5.1 Delete `src/ui/pages/applicant/views/wizard-modal.tsx` (replaced by `wizard.tsx`)
- [ ] 5.2 Delete `src/ui/pages/applicant/components/job-search-wizard-modal.tsx` (replaced by `job-search/views/wizard.tsx`)
- [ ] 5.3 Delete `src/ui/pages/applicant/components/wizard-modal-shell.tsx` (replaced by `WizardLayout`)
- [ ] 5.4 Delete `src/ui/pages/applicant/components/applicant-resume-draft-modal.tsx`
- [ ] 5.5 Delete `src/ui/pages/applicant/components/job-search-resume-draft-modal.tsx`
- [ ] 5.6 Delete `src/ui/pages/applicant/components/resume-draft-modal.tsx` (shared base, no longer needed)
- [ ] 5.7 Delete `src/ui/pages/applicant/hooks/draft-launch.ts` (helpers only served the modal-launch pattern)
- [ ] 5.8 Remove deleted exports from `src/ui/pages/applicant/components/index.ts`
- [ ] 5.9 Remove `draft-launch` exports from `src/ui/pages/applicant/hooks/index.ts`

## 6. Tests

- [ ] 6.1 Rename `src/ui/pages/applicant/views/wizard-modal.test.tsx` to `wizard.test.tsx`
- [ ] 6.2 Update import in `wizard.test.tsx` from `"./wizard-modal"` to `"./wizard"`

## 7. Verify

- [ ] 7.1 Run `npm run fix` and resolve any lint or format issues
- [ ] 7.2 Run `npm run verify` and confirm clean build and passing tests
