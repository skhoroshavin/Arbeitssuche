# E2E Business Flow Coverage Design

## Purpose

Expand E2E test coverage to cover every main business flow of the app at least once. Tests must drive through the UI exclusively (clicks, typing, reading visible text) — no IPC shortcuts. Tests use real app internals with real external services (no fakes or mocks). Avoid unnecessary complexity with the least amount of shortcuts.

## Current State

The E2E suite (`e2e/tests-flow/`) has three test files, all dependent on live API keys:

- `live-flow.spec.ts` — single golden-path test: crawl arbeitsagentur → enrich → compute commute → generate cover letter. Heavily leans on `ElectronApiHelper` (IPC) for state seeding and assertions.
- `runtime-contract.spec.ts` — verifies the E2E environment starts clean and can configure live provider keys through the Settings UI.
- `live-enrichment-diagnostics.spec.ts` — verifies live provider setup works (LLM models, commute provider).

Gaps: no E2E tests exist for applicant CRUD, job search CRUD, settings lifecycle, first-start wizard, resume download, or vacancy activity tracking (apply → reject/accept). The entire suite tests one crawl site (arbeitsagentur).

Infrastructure is solid: Playwright fixtures launch a clean Electron instance with a temp data dir, page objects cover most UI surfaces, and `ElectronApiHelper` exposes the full IPC surface for direct backend manipulation.

## Design Decisions

1. **UI-only**: All assertions read from the DOM — text content, button states, heading visibility, badge text. No `api.getVacancyList()` or similar IPC peeks. This proves the full stack renders correctly.

2. **No fakes or mocks**: Tests use real app internals (real repositories, real crawl engine, real LLM clients, real Maps client). The crawl/enrich/cover-letter suite requires `OPENROUTER_API_KEY` and `GOOGLE_MAPS_API_KEY` environment variables.

3. **Serial within suites, independent across suites**: Tests that share state (e.g., create → edit → delete an applicant) run serially within a `test.describe`. Each suite starts from a clean Electron instance (fresh data dir from fixture). No suite depends on another suite's test data.

4. **Readability over compactness**: Compound page object methods (`createApplicantFull()`, `recordActivity()`) and semantic assertion helpers (`expectCoverLetterPopulated()`) make tests read like user stories. Tests remain thin orchestrators calling named methods.

5. **German text for UI assertions**: Status badges, button labels, and headings are asserted in German (`"Beworben"`, `"Eingeladen"`, `"Einladen"`) since that's what the user sees.

6. **One crawl site in scope**: Xing only, with max 5 results for speed. Removing the per-site crawl matrix from scope (different sites share the same crawl→enrich→cover-letter code paths; testing every site adds ~12 min without proportional value).

## Test Suite Organization

```
e2e/tests-flow/
├── applicant-lifecycle.spec.ts    # Suite 1 — CRUD, tabs, resume download
├── job-search-lifecycle.spec.ts   # Suite 2 — wizard, config, delete
├── settings-lifecycle.spec.ts     # Suite 3 — providers, keys, models
└── full-application-flow.spec.ts  # Suite 4 — fresh install → accept (xing)
```

Suites 1–3 require no API keys and run in ~30–60 seconds total. Suite 4 requires live API keys and runs in ~5–8 minutes.

## Page Object & Helper Architecture

Three layers, from bottom to top:

### Layer 1: Locators + Primitives (on page objects)

Page objects own Playwright locators and simple navigation/click actions. This layer already exists and is well-structured. Extensions needed:

- `ApplicantListPage` — wizard step form field locators (all labels for all 5 steps), draft dialog controls
- `ApplicantPage` — resume template buttons, tab content assertion helpers
- `JobSearchPage` — activity form controls (status buttons, date inputs, confirm/cancel), vacancy detail content (summary heading, commute heading, cover letter textarea), cover letter template page (generate button, content area)
- `SettingsPage` — model select dropdown, provider switching
- New: `FirstStartPage` — setup wizard steps (KI, Karten), skip prompt, provider configuration within first-start context

### Layer 2: Compound Actions (on page objects)

Methods that represent a complete user task, built from primitives. They **do not assert** — assertions stay in the test or in assertion helpers.

```
// On ApplicantListPage:
createApplicantMinimal(name: string): Promise<string>   // fills name, clicks through to finish, returns ID
createApplicantFull(details: ApplicantDetails): Promise<string>  // fills all 5 wizard steps

// On ApplicantPage:
downloadResumeTemplate(template: string): Promise<Download>  // clicks template, waits for download event
expectFieldValue(label: string, expectedValue: string): Promise<void>
navigateTab(name: string): Promise<void>

// On JobSearchPage:
createJobSearchViaWizard(config: JobSearchConfig): Promise<string>  // walks 5-step wizard
recordActivity(type: string, details?: ActivityDetails): Promise<void>  // fills activity form, confirms
expectActivityHistoryContains(entries: string[]): Promise<void>
expectVacancyDetailShows(options: { summary?: boolean, commute?: boolean, coverLetter?: boolean }): Promise<void>
```

### Layer 3: Assertion Helpers (standalone functions)

Thin wrappers around Playwright `expect` with semantic names:

```typescript
// e2e/helpers/assertions.ts
async function expectApplicantCardVisible(
  page: Page,
  name: string,
): Promise<void>
async function expectResumeDownloaded(
  download: Download,
  template: string,
): Promise<void>
async function expectVacancyCardsCount(
  page: Page,
  min: number,
  max: number,
): Promise<void>
async function expectCoverLetterPopulated(page: Page): Promise<void>
```

### File Layout

```
e2e/
├── pages/
│   ├── index.ts                        # exports all page objects
│   ├── applicant-list.page.ts          # modified: wizard fields, createFull/createMinimal
│   ├── applicant.page.ts               # modified: tab navigation, resume download, field assertions
│   ├── job-search.page.ts              # modified: activity recording, vacancy detail, cover letter template
│   ├── settings.page.ts                # modified: model select, provider switching
│   ├── layout.page.ts                  # unchanged
│   └── first-start.page.ts             # new: setup wizard page object
├── helpers/
│   ├── assertions.ts                   # new: semantic expect wrappers
│   ├── first-start-helper.ts           # new: fastTrackFirstStart()
│   └── live-e2e-setup.ts               # kept: env var management (not IPC)
├── fixtures.ts                         # re-exports from electron-fixtures
├── electron-fixtures.ts                # modified: remove api, add firstStartPage fixture
└── tests-flow/
    ├── applicant-lifecycle.spec.ts
    ├── job-search-lifecycle.spec.ts
    ├── settings-lifecycle.spec.ts
    └── full-application-flow.spec.ts
```

### Removed Files

- `e2e/helpers/electron-api-helper.ts` — IPC helper, no longer used (UI-only)
- `e2e/helpers/live-flow-helper.ts` — absorbed into page object compound actions
- `e2e/tests-flow/live-flow.spec.ts` — replaced by `full-application-flow.spec.ts`
- `e2e/tests-flow/runtime-contract.spec.ts` — replaced by `settings-lifecycle.spec.ts`
- `e2e/tests-flow/live-enrichment-diagnostics.spec.ts` — diagnostic test, covered by live setup in Suite 4

## First-Start Fast-Track Helper

Since every suite starts with a clean data dir, the first-start wizard always appears. A helper gets past it with minimal UI interactions.

### `fastTrackFirstStart(page: Page, { configureKeys }: { configureKeys: boolean }): Promise<string>`

Location: `e2e/helpers/first-start-helper.ts`

**When `configureKeys: false`** (Suites 1–3):

1. First-start wizard loads. If a resume prompt appears ("Einrichtung fortsetzen?"), click "Einrichtung überspringen".
2. On KI settings step: click "Überspringen" → confirm "Trotzdem überspringen" in the confirmation dialog.
3. Navigated to applicant creation wizard. Fill "Name" field, click "Weiter" through all 5 steps, click "Fertigstellen".
4. Returns the created `applicantId`.

**When `configureKeys: true`** (Suite 4):

1. On KI settings step: add OpenRouter key from `process.env.OPENROUTER_API_KEY`, test it, assert valid.
2. Click "Karten" step: add Google Maps key from `process.env.GOOGLE_MAPS_API_KEY`, test it.
3. Click "Fertigstellen" → navigated to applicant creation wizard.
4. Does NOT auto-create applicant — returns `undefined`. Caller creates the applicant with full data.

This helper uses existing `SettingsPage` page object methods (`addAndSave`, `assertSavedSecret`, `testButton`, `testResult`) and will be expanded as needed during implementation.

## Test Specifications

### Suite 1: Applicant Lifecycle (`applicant-lifecycle.spec.ts`)

Serial. No API keys. Starts from clean state, fast-tracks through first-start.

**Test 1: "sets up first-start and creates minimal applicant"**

- Calls `fastTrackFirstStart()` → stores `minimalApplicantId`
- This unlocks the app so the remaining tests can navigate freely.

**Test 2: "creates applicant filling all wizard steps"**

- Navigate to `/` (applicant list)
- Click "Neuer Bewerber"
- Fill all 5 wizard steps (Persönlich, Berufserfahrung, Ausbildung, Zertifikate, Sonstiges) with complete data
- Click "Fertigstellen" → assert navigated to `/applicants/:id`
- Store this `fullApplicantId` for subsequent tests
- Assert applicant name visible in header

**Test 3: "shows all entered data across applicant tabs"**

- Already on the full applicant page. Click "Übersicht" tab → assert "Lebenslauf" heading visible, template buttons visible
- Click "Persönlich" tab → assert name, email, phone fields contain entered values
- Click "Erfahrung" tab → assert position, company fields visible
- Click "Ausbildung" tab → assert institution, course fields visible
- Click "Zertifikate" tab → assert certificate name visible
- Click "Sonstiges" tab → assert skills, languages visible

**Test 4: "downloads a resume template"**

- From Übersicht tab, click a template button (e.g., "Modern")
- Assert download event fires with filename matching the template

**Test 5: "edits a field and persists after navigation"**

- Navigate to Persönlich tab, change Name field
- Navigate to Übersicht tab, then back to Persönlich
- Assert Name field still shows the changed value

**Test 6: "deletes applicant and removes from list"**

- Navigate to `/` (applicant list)
- Assert the full applicant's card is visible
- Click "Löschen" on the full applicant's card → confirm dialog
- Assert the full applicant's card is gone
- Assert the minimal applicant's card (from test 1) is still present

### Suite 2: Job Search Lifecycle (`job-search-lifecycle.spec.ts`)

Serial. No API keys. Starts from clean state.

**Test 1: "sets up first-start and creates minimal applicant"**

- Calls `fastTrackFirstStart()` → stores `applicantId`

**Test 2: "walks through job search wizard and finalizes"**

- From applicant page, click "Neue Suche"
- "Suchparameter": fill "Suchbegriff" = "Softwareentwickler", "Max. Ergebnisse" = 5
- "Suchmodus": select "Festanstellung"
- "Jobbörsen": select "xing"
- "Präferenzen": skip (click "Weiter")
- "Anschreiben": skip (click "Fertigstellen")
- Assert navigated to vacancy list with "Stellen" heading

**Test 3: "verifies job search config"**

- Navigate to config tab
- Assert search term, mode, and source selections are reflected in the UI

**Test 4: "deletes job search and applicant"**

- Navigate to applicant page, delete job search from list → confirm
- Delete applicant → confirm

### Suite 3: Settings Lifecycle (`settings-lifecycle.spec.ts`)

Serial. No API keys. Starts from clean state.

**Test 1: "sets up first-start and creates minimal applicant"**

- Calls `fastTrackFirstStart()` → stores `applicantId`

**Test 2: "switches provider and selects a model"**

- Navigate to `/settings`, assert "KI" tab active
- Click alternate provider button, assert visual change
- Open model dropdown, select different model, assert selection changes

**Test 3: "manages an LLM API key through full lifecycle"**

- Assert add button visible, secret shows "Nicht gesetzt"
- Add a test key → save → assert "ersetzen" and "löschen" buttons visible, secret shows dots
- Click test → assert result text appears
- Replace with new key → assert save confirmed
- Clear → assert back to "Nicht gesetzt"

**Test 4: "manages a Maps API key through add and clear"**

- Click "Karten" nav link
- Add test key → save → assert secret shows dots
- Clear → assert back to unset

### Suite 4: Full Application Flow (`full-application-flow.spec.ts`)

Single test. Requires `OPENROUTER_API_KEY` and `GOOGLE_MAPS_API_KEY`. Timeout: 8 minutes.

**Phase 1: Fresh Install & Setup**

- App starts with first-start wizard (clean data dir from fixture)
- KI step: add OpenRouter key, test, assert valid result text
- Karten step: add Google Maps key, test
- Click "Fertigstellen" → navigated to applicant creation

**Phase 2: Create Applicant (all fields)**

- Fill all 5 wizard steps. Name = `e2e-full-{Date.now()}`
- Finish → navigated to applicant overview
- Download resume template "Modern" → assert download event
- Assert "Lebenslauf" heading visible

**Phase 3: Create Job Search (xing, max 5)**

- Click "Neue Suche"
- Parameters: "Softwareentwickler", max 5
- Mode: "Festanstellung"
- Sources: select only "xing"
- Preferences: skip
- Cover letter: skip
- Finish → navigated to vacancy list
- Assert no missing-key warnings (keys are configured)

**Phase 4: Crawl, Batch Enrich, Cover Letter Template**

- Click "Aktualisieren" → button becomes disabled (crawling)
- Wait for button to re-enable → assert ≥1 and ≤5 vacancy cards visible
- Click "Alle analysieren" → wait for enrichment to complete (button changes back)
- Assert at least one vacancy card shows match score text (not "Nicht analysiert")
- Navigate to cover letter tab for the job search
- Click "Generieren" → wait for content in textarea → assert non-empty

**Phase 5: Vacancy 1 Lifecycle (apply → invited → interviewed → offered → rejected)**

- Navigate to first vacancy detail
- Assert "Zusammenfassung" section with content visible
- Assert "Fahrtweg" section visible
- Scroll to "Anschreiben", click "Generieren", assert textarea populated
- In "Aktionen", click "Bewerben" → confirm → assert "Beworben" badge text visible
- Click "Einladen" → fill interview date → confirm → assert "Eingeladen" badge
- Click "Gespräch" → confirm → assert "Gespräch" badge
- Click "Angebot" → confirm → assert "Angebot" badge
- Click "Ablehnen" → confirm → assert "Abgelehnt" badge, no further actions available
- Assert activity history shows 5 entries (applied, invited, interviewed, offered, rejected) by badge text

**Phase 6: Vacancy 2 Lifecycle (apply → invited → interviewed → offered)**

- Navigate back to vacancy list
- Click second vacancy card
- Click "Bewerben" → confirm → assert "Beworben" badge
- Click "Einladen" → fill date → confirm → assert "Eingeladen" badge
- Click "Gespräch" → confirm → assert "Gespräch" badge
- Click "Angebot" → confirm → assert "Angebot" badge
- Assert activity history shows 4 entries (applied, invited, interviewed, offered)

## Edge Cases & Error Handling

- **No network during crawl**: Crawl will fail or time out. Test should fail with a clear assertion message rather than hang on a `waitFor` timeout. The `waitFor` timeout on crawl completion should be generous (3 minutes) but bounded.
- **API key invalid during enrichment**: Enrichment fails, vacancy card shows error state ("Neu analysieren" with red border). Test should fail at the enrichment assertion with descriptive output showing which vacancies failed.
- **No vacancies found**: Xing may return 0 results for "Softwareentwickler" in some regions or at some times. The test should fail with `"Expected ≥1 vacancies, got 0"` rather than timing out.
- **First-start already completed**: The fixture creates a fresh temp data dir on every `electronApp` fixture invocation, so this shouldn't happen. If it somehow does, `fastTrackFirstStart()` should detect the "completed" state and navigate directly to `/`.
- **German umlauts in test data**: Use ASCII-only test values in locators to avoid encoding oddities. Umlauts in expected UI text assertions are fine since they match exact DOM content.
- **Suite 4 environment variables missing**: Same as current behavior — `assertRequiredE2eEnvironment()` throws at fixture startup with a clear message listing which variables are missing.

## CI / Scripts

No new npm scripts needed. Existing infrastructure works as-is:

```bash
npm run test:e2e                                    # all flow tests (build + run)
npm run test:e2e -- --grep "applicant-lifecycle"    # single suite
npm run test:e2e -- --grep "full-application-flow"  # live suite only
```

Suites 1–3 run in any environment. Suite 4 requires `OPENROUTER_API_KEY` and `GOOGLE_MAPS_API_KEY` in the environment (or `.env` file), same as the current live tests.

The `test:e2e` script runs `electron-vite build` before Playwright, so the app is always built fresh.

## Execution Constraints

- Page object files stay under 200 lines. If a page object exceeds this, split compound actions into a separate helper file (e.g., `applicant-page-actions.ts`).
- Tests stay under 150 lines. A test that exceeds this should be decomposed.
- Follow existing naming conventions: kebab-case filenames, `.spec.ts` suffix for test files.
- Use existing Playwright fixtures pattern (`electron-fixtures.ts` → `fixtures.ts`) for page object injection.
- Assertions use `expect` from `@playwright/test`, not Vitest. This is already the pattern.
- No `import type` from `@/` paths in test files — tests import from `../fixtures.js` and `../pages/index.js`. This matches current import patterns.
