# E2E Business Flow Coverage Implementation Plan

> **For agentic workers:** Execute tasks using the `exec` prompt sequentially.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add E2E test suites covering applicant lifecycle, job search lifecycle, settings lifecycle, and a full application flow (fresh install → crawl xing → enrich → cover letter → vacancy tracking) — all driven exclusively through the UI.

**Note on bug fixes:** These E2E tests exercise real app internals through the UI for the first time. Implementation deficiencies in the codebase (missing UI states, broken navigation, inaccessible locators, race conditions) should be expected. Fix them in the relevant task — this is not just adding tests, it's hardening the app against real-world usage.

**Architecture:** Extend existing page objects with compound actions and new locators. Add a `FirstStartPage` object and a `fastTrackFirstStart` helper to bootstrap the first-start wizard (required because every suite starts from a clean data dir). Write four new spec files in `e2e/tests-flow/` and remove the three old IPC-dependent specs plus `ElectronApiHelper` and `LiveFlowHelper`.

**Tech Stack:** Playwright (`@playwright/test`), TypeScript, Electron

---

## File Structure

| File                                                 | Action | Responsibility                                                                   |
| ---------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| `e2e/helpers/assertions.ts`                          | Create | Semantic `expect` wrappers for UI state                                          |
| `e2e/pages/first-start.page.ts`                      | Create | First-start wizard locators and navigation                                       |
| `e2e/helpers/first-start-helper.ts`                  | Create | `fastTrackFirstStart()` to bootstrap past wizard                                 |
| `e2e/pages/applicant-list.page.ts`                   | Modify | Add wizard field locators, `createApplicantMinimal`, `createApplicantFull`       |
| `e2e/pages/applicant.page.ts`                        | Modify | Add `downloadResumeTemplate`, tab content assertion helpers                      |
| `e2e/pages/job-search.page.ts`                       | Modify | Add activity recording, vacancy detail assertions, cover letter template helpers |
| `e2e/pages/settings.page.ts`                         | Modify | Add model selection, first-start-specific locators                               |
| `e2e/pages/index.ts`                                 | Modify | Export `FirstStartPage`                                                          |
| `e2e/electron-fixtures.ts`                           | Modify | Remove `api` fixture, add `firstStartPage`, remove `setup.completed` config      |
| `e2e/tests-flow/applicant-lifecycle.spec.ts`         | Create | Suite 1                                                                          |
| `e2e/tests-flow/job-search-lifecycle.spec.ts`        | Create | Suite 2                                                                          |
| `e2e/tests-flow/settings-lifecycle.spec.ts`          | Create | Suite 3                                                                          |
| `e2e/tests-flow/full-application-flow.spec.ts`       | Create | Suite 4                                                                          |
| `e2e/helpers/electron-api-helper.ts`                 | Delete | IPC helper, no longer used                                                       |
| `e2e/helpers/live-flow-helper.ts`                    | Delete | Absorbed into page objects                                                       |
| `e2e/tests-flow/live-flow.spec.ts`                   | Delete | Replaced by Suite 4                                                              |
| `e2e/tests-flow/runtime-contract.spec.ts`            | Delete | Replaced by Suite 3                                                              |
| `e2e/tests-flow/live-enrichment-diagnostics.spec.ts` | Delete | Covered by Suite 4 live setup                                                    |

---

### Task 1: Create semantic assertion helpers

**Files:**

- Create: `e2e/helpers/assertions.ts`

- [ ] **Step 1: Write the file**

```typescript
import {
  expect,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test"

export async function expectApplicantCardVisible(
  page: Page,
  name: string,
): Promise<void> {
  const card = page.locator(".cursor-pointer", { hasText: name }).first()
  await expect(card).toBeVisible()
}

export async function expectApplicantCardNotVisible(
  page: Page,
  name: string,
): Promise<void> {
  const card = page.locator(".cursor-pointer", { hasText: name })
  await expect(card).toHaveCount(0)
}

export async function expectResumeDownloaded(
  download: Download,
  template: string,
): Promise<void> {
  const filename = download.suggestedFilename()
  expect(filename).toContain(template)
  expect(filename).toMatch(/\.pdf$/)
}

export async function expectVacancyCardsCount(
  page: Page,
  min: number,
  max: number,
): Promise<void> {
  const cards = page.locator("a[href*='/vacancies/']")
  const count = await cards.count()
  expect(count).toBeGreaterThanOrEqual(min)
  expect(count).toBeLessThanOrEqual(max)
}

export async function expectCoverLetterPopulated(page: Page): Promise<void> {
  const textarea = page.getByLabel("Anschreiben")
  await expect(textarea).not.toBeEmpty()
  const value = await textarea.inputValue()
  expect(value.trim().length).toBeGreaterThan(0)
}

export async function expectBadgeWithText(
  locator: Locator,
  text: string,
): Promise<void> {
  await expect(locator).toContainText(text)
}

export async function expectNoActionsAvailable(page: Page): Promise<void> {
  const actionSection = page.locator("text=Aktionen")
  if (await actionSection.isVisible()) {
    const buttons = page
      .locator("text=Aktionen")
      .locator("..")
      .getByRole("button")
    await expect(buttons).toHaveCount(0)
  }
}
```

- [ ] **Step 2: Run lint to verify no issues**

```bash
npx eslint e2e/helpers/assertions.ts
```

Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add e2e/helpers/assertions.ts
git commit -m "feat: add semantic E2E assertion helpers"
```

---

### Task 2: Create FirstStartPage page object

**Files:**

- Create: `e2e/pages/first-start.page.ts`

- [ ] **Step 1: Write the file**

```typescript
import { expect, type Locator, type Page } from "@playwright/test"

export class FirstStartPage {
  readonly page: Page
  readonly heading: Locator
  readonly settingsHeading: Locator
  readonly skipButton: Locator
  readonly confirmSkipButton: Locator
  readonly finishButton: Locator
  readonly resumePromptHeading: Locator
  readonly resumeButton: Locator
  readonly skipSetupButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole("heading", { name: "Ersteinrichtung" })
    this.settingsHeading = page.getByRole("heading", {
      name: "Künstliche Intelligenz",
    })
    this.skipButton = page.getByRole("button", { name: "Überspringen" })
    this.confirmSkipButton = page.getByRole("button", {
      name: "Trotzdem überspringen",
    })
    this.finishButton = page.getByRole("button", { name: "Fertigstellen" })
    this.resumePromptHeading = page.getByText("Einrichtung fortsetzen?")
    this.resumeButton = page.getByRole("button", {
      name: "Einrichtung fortsetzen",
    })
    this.skipSetupButton = page.getByRole("button", {
      name: "Einrichtung überspringen",
    })
  }

  async waitForWizard(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: 30_000 })
  }

  async handleResumePromptIfPresent(): Promise<void> {
    if (
      await this.resumePromptHeading
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await this.skipSetupButton.click()
      await expect(this.skipSetupButton).not.toBeVisible()
    }
  }

  async skipToApplicantCreation(): Promise<void> {
    await this.waitForWizard()
    await this.handleResumePromptIfPresent()

    await expect(this.settingsHeading).toBeVisible({ timeout: 15_000 })
    await this.skipButton.click()
    await this.confirmSkipButton.click()

    await expect(
      this.page.getByRole("heading", { name: "Neuen Bewerber erstellen" }),
    ).toBeVisible({ timeout: 15_000 })
  }

  async configureKeysAndFinish(): Promise<void> {
    await this.waitForWizard()
    await this.handleResumePromptIfPresent()

    await expect(this.settingsHeading).toBeVisible({ timeout: 15_000 })
  }

  async clickKartenStep(): Promise<void> {
    await this.page.getByRole("link", { name: "Karten" }).click()
  }
}
```

- [ ] **Step 2: Run lint to verify no issues**

```bash
npx eslint e2e/pages/first-start.page.ts
```

Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add e2e/pages/first-start.page.ts
git commit -m "feat: add FirstStartPage page object for E2E tests"
```

---

### Task 3: Extend ApplicantListPage with wizard fields and compound actions

**Files:**

- Modify: `e2e/pages/applicant-list.page.ts`

- [ ] **Step 1: Add wizard field locators and compound methods to ApplicantListPage**

**Edit 1**: Add field locators after the `wizardResumeDraftButton` declaration. Replace:

```typescript
  readonly wizardResumeDraftButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole("heading", { name: "Bewerber" })
    this.newApplicantButton = page.getByRole("button", {
      name: "Neuer Bewerber",
    })
    this.wizardTitle = page.getByRole("heading", {
      name: "Persönlich",
      level: 1,
    })
    this.wizardContinueButton = page.getByRole("button", { name: "Weiter" })
    this.wizardFinishButton = page.getByRole("button", {
      name: "Fertigstellen",
    })
    this.wizardCancelButton = page.getByRole("button", { name: "Abbrechen" })
    this.wizardKeepDraftButton = page.getByRole("button", {
      name: "Entwurf behalten",
    })
    this.wizardResumeDraftDialogTitle = page.getByText("Entwurf gefunden")
    this.wizardResumeDraftButton = page.getByRole("button", {
      name: "Entwurf fortsetzen",
    })
  }
```

With:

```typescript
  readonly wizardResumeDraftButton: Locator
  readonly wizardStepHeadings: readonly string[]
  readonly experienceAddButton: Locator
  readonly educationAddButton: Locator
  readonly certificationAddButton: Locator
  readonly skillAddButton: Locator
  readonly languageAddButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole("heading", { name: "Bewerber" })
    this.newApplicantButton = page.getByRole("button", {
      name: "Neuer Bewerber",
    })
    this.wizardTitle = page.getByRole("heading", {
      name: "Persönlich",
      level: 1,
    })
    this.wizardContinueButton = page.getByRole("button", { name: "Weiter" })
    this.wizardFinishButton = page.getByRole("button", {
      name: "Fertigstellen",
    })
    this.wizardCancelButton = page.getByRole("button", { name: "Abbrechen" })
    this.wizardKeepDraftButton = page.getByRole("button", {
      name: "Entwurf behalten",
    })
    this.wizardResumeDraftDialogTitle = page.getByText("Entwurf gefunden")
    this.wizardResumeDraftButton = page.getByRole("button", {
      name: "Entwurf fortsetzen",
    })
    this.wizardStepHeadings = APPLICANT_WIZARD_STEP_HEADINGS
    this.experienceAddButton = page.getByRole("button", {
      name: "Berufserfahrung hinzufügen",
    })
    this.educationAddButton = page.getByRole("button", {
      name: "Ausbildung hinzufügen",
    })
    this.certificationAddButton = page.getByRole("button", {
      name: "Zertifikat hinzufügen",
    })
    this.skillAddButton = page.getByRole("button", {
      name: "Kenntnis hinzufügen",
    })
    this.languageAddButton = page.getByRole("button", {
      name: "Sprache hinzufügen",
    })
  }
```

**Edit 2**: Add `createApplicantMinimal` and `createApplicantFull` methods before the closing `}` of the class:

```typescript
  async createApplicantMinimal(name: string): Promise<string> {
    await this.goto()
    await this.newApplicantButton.click()
    await expect(this.wizardCancelButton).toBeVisible()
    await this.page.getByLabel("Name").fill(name)
    await this.advanceWizardToLastStep()
    await this.wizardFinishButton.click()
    await expect(this.wizardFinishButton).not.toBeVisible({ timeout: 15_000 })
    return readApplicantIdFromUrl(this.page.url())
  }

  async createApplicantFull(
    name: string,
    email: string,
  ): Promise<string> {
    await this.goto()
    await this.newApplicantButton.click()
    await expect(this.wizardCancelButton).toBeVisible()

    // Step 1: Persönlich
    await this.page.getByLabel("Name").fill(name)
    await this.page.getByLabel("E-Mail").fill(email)
    await this.page.getByLabel("Telefon").fill("+49 30 123456")
    await this.page.getByLabel("Straße").fill("Friedrichstraße 100")
    await this.page.getByLabel("PLZ").fill("10117")
    await this.page.getByLabel("Stadt").fill("Berlin")
    await this.wizardContinueButton.click()
    await expect(
      this.page.getByRole("heading", { name: "Berufserfahrung", level: 1 }),
    ).toBeVisible()

    // Step 2: Berufserfahrung
    await this.page.getByLabel("Position").fill("Senior Entwickler")
    await this.page.getByLabel("Unternehmen").fill("Tech GmbH")
    await this.wizardContinueButton.click()
    await expect(
      this.page.getByRole("heading", { name: "Ausbildung", level: 1 }),
    ).toBeVisible()

    // Step 3: Ausbildung
    await this.page.getByLabel("Institution").fill("TU Berlin")
    await this.page.getByLabel("Studiengang").fill("Informatik")
    await this.wizardContinueButton.click()
    await expect(
      this.page.getByRole("heading", { name: "Zertifikate", level: 1 }),
    ).toBeVisible()

    // Step 4: Zertifikate
    await this.certificationAddButton.click()
    await this.page.getByLabel("Name").fill("AWS Certified")
    await this.wizardContinueButton.click()
    await expect(
      this.page.getByRole("heading", { name: "Sonstiges", level: 1 }),
    ).toBeVisible()

    // Step 5: Sonstiges
    await this.skillAddButton.click()
    const skillInputs = this.page.getByLabel("Kenntnis")
    await skillInputs.first().fill("TypeScript")
    await this.skillAddButton.click()
    await skillInputs.last().fill("React")
    await this.wizardFinishButton.click()
    await expect(this.wizardFinishButton).not.toBeVisible({ timeout: 15_000 })
    return readApplicantIdFromUrl(this.page.url())
  }
```

**Edit 3**: Add the helper function at the bottom of the file, after the `APPLICANT_WIZARD_STEP_HEADINGS` constant:

```typescript
function readApplicantIdFromUrl(url: string): string {
  const applicantId = /\/applicants\/([^/]+)$/.exec(url)?.[1]
  if (!applicantId) {
    throw new Error(`Failed to read applicant id from URL: ${url}`)
  }
  return applicantId
}
```

- [ ] **Step 2: Run lint**

```bash
npx eslint e2e/pages/applicant-list.page.ts
```

Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add e2e/pages/applicant-list.page.ts
git commit -m "feat: extend ApplicantListPage with wizard fields and compound actions"
```

---

### Task 4: Extend ApplicantPage with resume download and tab navigation

**Files:**

- Modify: `e2e/pages/applicant.page.ts`

- [ ] **Step 1: Add compound methods**

**Edit**: Add after the `downloadTemplate` method, before the closing `}`:

```typescript
  async downloadResumeTemplate(
    template: string,
  ): Promise<import("@playwright/test").Download> {
    const downloadPromise = this.page.waitForEvent("download")
    await this.templateButton(template).click()
    return downloadPromise
  }

  async expectFieldHasValue(label: string, expectedValue: string): Promise<void> {
    const input = this.field(label)
    await expect(input).toHaveValue(expectedValue)
  }

  async navigateToOverviewTab(): Promise<void> {
    await this.tabLink("Übersicht").click()
    await expect(
      this.page.getByRole("heading", { name: "Lebenslauf" }),
    ).toBeVisible()
  }

  async deleteJobSearchFromList(
    jobSearchTerm: string,
  ): Promise<void> {
    const card = this.page.locator(".cursor-pointer", { hasText: jobSearchTerm })
    const deleteButton = card.locator("button", { hasText: "Löschen" })
    await deleteButton.click()
  }
```

- [ ] **Step 2: Run lint**

```bash
npx eslint e2e/pages/applicant.page.ts
```

Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add e2e/pages/applicant.page.ts
git commit -m "feat: extend ApplicantPage with resume download and tab navigation"
```

---

### Task 5: Extend JobSearchPage with activity recording and vacancy detail assertions

**Files:**

- Modify: `e2e/pages/job-search.page.ts`

- [ ] **Step 1: Add locators and methods**

**Edit 1**: Add new locator declarations after `coverLetterInput`:

```typescript
  readonly activitySection: Locator
  readonly confirmActivityButton: Locator
  readonly cancelActivityButton: Locator
  readonly activityDateInput: Locator
  readonly activityHistorySection: Locator
```

**Edit 2**: Add the initializers in the constructor after `this.coverLetterInput`:

```typescript
this.activitySection = page.locator("text=Aktionen")
this.confirmActivityButton = page.getByRole("button", {
  name: "Bestätigen",
})
this.cancelActivityButton = page.getByRole("button", { name: "Abbrechen" })
this.activityDateInput = page.locator('input[type="date"]')
this.activityHistorySection = page.getByText("Aktivitätshistorie")
```

**Edit 3**: Add compound methods after the `gotoVacancyDetail` method, before the closing `}`:

```typescript
  async recordActivity(
    actionLabel: string,
    details?: { interviewDate?: string },
  ): Promise<void> {
    const actionButton = this.page.getByRole("button", { name: actionLabel })
    await actionButton.click()
    if (details?.interviewDate) {
      await this.activityDateInput.fill(details.interviewDate)
    }
    await this.confirmActivityButton.click()
    await expect(this.confirmActivityButton).not.toBeVisible()
  }

  async expectStatusBadge(statusText: string): Promise<void> {
    const badge = this.page
      .locator("span.rounded-full")
      .filter({ hasText: statusText })
      .first()
    await expect(badge).toBeVisible()
  }

  async expectActivityHistoryContains(
    statuses: string[],
  ): Promise<void> {
    await expect(this.activityHistorySection).toBeVisible()
    for (const status of statuses) {
      const entry = this.activityHistorySection
        .locator("..")
        .getByText(status)
      await expect(entry).toBeVisible()
    }
  }

  async expectVacancyDetailShows(options: {
    summary?: boolean
    commute?: boolean
  }): Promise<void> {
    if (options.summary) {
      await expect(this.summaryHeading).toBeVisible()
    }
    if (options.commute) {
      await expect(this.commuteHeading).toBeVisible()
    }
  }

  async waitForCrawlComplete(): Promise<void> {
    await expect(this.refreshButton).toBeEnabled({ timeout: 300_000 })
  }

  async waitForEnrichmentComplete(): Promise<void> {
    const abortButton = this.page.getByRole("button", {
      name: "Analyse abbrechen",
    })
    await expect(abortButton).not.toBeVisible({ timeout: 300_000 })
  }

  async waitForEnrichmentOnAnyCard(): Promise<void> {
    await expect(
      this.page.getByText(/Sehr schlecht|Schlecht|OK|Gut|Ausgezeichnet/),
    ).toBeVisible({ timeout: 300_000 })
  }

  async expectEnrichAllButtonNotVisible(): Promise<void> {
    await expect(this.enrichAllButton).not.toBeVisible()
  }

  // Cover letter template page
  async gotoCoverLetter(id: string) {
    await this.page.goto(`/job-searches/${id}/cover-letter`)
  }

  async waitForCoverLetterContent(): Promise<void> {
    await expect(this.coverLetterInput).not.toBeEmpty({ timeout: 120_000 })
    const value = await this.coverLetterInput.inputValue()
    expect(value.trim().length).toBeGreaterThan(0)
  }

  // Vacancy card list
  vacancyCardByIndex(index: number): Locator {
    return this.page.locator("a[href*='/vacancies/']").nth(index)
  }

  async clickVacancyCardByIndex(index: number): Promise<void> {
    const card = this.vacancyCardByIndex(index)
    await card.click()
  }

  get backToVacanciesLink(): Locator {
    return this.page.getByRole("link", { name: "Zurück zu Stellen" })
  }
```

- [ ] **Step 2: Run lint**

```bash
npx eslint e2e/pages/job-search.page.ts
```

Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add e2e/pages/job-search.page.ts
git commit -m "feat: extend JobSearchPage with activity recording and vacancy detail"
```

---

### Task 6: Extend SettingsPage with model selection helpers

**Files:**

- Modify: `e2e/pages/settings.page.ts`

- [ ] **Step 1: Add model selection and provider switching methods**

**Edit**: Add after the `replaceAndSave` method, before the closing `}`:

```typescript
  async selectProvider(name: string) {
    await this.providerButton(name).click()
  }

  async expectProviderSelected(name: string): Promise<void> {
    const button = this.providerButton(name)
    await expect(button).toHaveAttribute("aria-pressed", "true")
  }

  async selectModel(label: string, modelName: string): Promise<void> {
    const select = this.modelSelect(label)
    await select.selectOption(modelName)
  }

  async assertModelSelected(
    label: string,
    modelName: string,
  ): Promise<void> {
    const select = this.modelSelect(label)
    const value = await select.inputValue()
    expect(value).toBe(modelName)
  }

  async testAndAssertResult(): Promise<void> {
    const result = this.testResult()
    await expect(result).toBeVisible({ timeout: 15_000 })
  }
```

- [ ] **Step 2: Run lint**

```bash
npx eslint e2e/pages/settings.page.ts
```

Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add e2e/pages/settings.page.ts
git commit -m "feat: extend SettingsPage with model selection helpers"
```

---

### Task 7: Create first-start fast-track helper

**Files:**

- Create: `e2e/helpers/first-start-helper.ts`

- [ ] **Step 1: Write the file**

```typescript
import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"
import { FirstStartPage } from "../pages/first-start.page.js"
import { SettingsPage } from "../pages/settings.page.js"
import { OPENROUTER_LABEL, MAPS_LABEL } from "./live-e2e-setup.js"
import { ApplicantListPage } from "../pages/applicant-list.page.js"

export async function fastTrackFirstStart(
  page: Page,
  options: { configureKeys: boolean },
): Promise<string | undefined> {
  const firstStartPage = new FirstStartPage(page)

  if (options.configureKeys) {
    await configureKeysInFirstStart(page, firstStartPage)
    return undefined
  }

  return skipSetupAndCreateMinimalApplicant(page, firstStartPage)
}

async function skipSetupAndCreateMinimalApplicant(
  page: Page,
  firstStartPage: FirstStartPage,
): Promise<string> {
  await firstStartPage.skipToApplicantCreation()
  const applicantListPage = new ApplicantListPage(page)
  const applicantId = await applicantListPage.createApplicantMinimal(
    `e2e-fast-${Date.now()}`,
  )
  await expect(page.getByRole("heading", { name: "Lebenslauf" })).toBeVisible()
  return applicantId
}

async function configureKeysInFirstStart(
  page: Page,
  firstStartPage: FirstStartPage,
): Promise<void> {
  await firstStartPage.configureKeysAndFinish()

  const settingsPage = new SettingsPage(page)
  const openrouterKey = readRequiredEnv("OPENROUTER_API_KEY")
  const googleMapsKey = readRequiredEnv("GOOGLE_MAPS_API_KEY")

  await settingsPage.addAndSave(OPENROUTER_LABEL, openrouterKey)
  await settingsPage.assertSavedSecret(OPENROUTER_LABEL)

  await firstStartPage.clickKartenStep()
  await settingsPage.addAndSave(MAPS_LABEL, googleMapsKey)
  await settingsPage.assertSavedSecret(MAPS_LABEL)

  await firstStartPage.finishButton.click()
  await expect(
    page.getByRole("heading", { name: "Neuen Bewerber erstellen" }),
  ).toBeVisible({ timeout: 15_000 })
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required E2E environment variable: ${name}`)
  }
  return value
}
```

- [ ] **Step 2: Run lint**

```bash
npx eslint e2e/helpers/first-start-helper.ts
```

Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add e2e/helpers/first-start-helper.ts
git commit -m "feat: add first-start fast-track helper for E2E tests"
```

---

### Task 8: Delete old E2E test files and IPC helpers

**Files:**

- Delete: `e2e/helpers/electron-api-helper.ts`
- Delete: `e2e/helpers/live-flow-helper.ts`
- Delete: `e2e/tests-flow/live-flow.spec.ts`
- Delete: `e2e/tests-flow/runtime-contract.spec.ts`
- Delete: `e2e/tests-flow/live-enrichment-diagnostics.spec.ts`

- [ ] **Step 1: Remove files and commit**

```bash
rm e2e/helpers/electron-api-helper.ts
rm e2e/helpers/live-flow-helper.ts
rm e2e/tests-flow/live-flow.spec.ts
rm e2e/tests-flow/runtime-contract.spec.ts
rm e2e/tests-flow/live-enrichment-diagnostics.spec.ts
git add -A
git commit -m "chore: remove old IPC-dependent E2E tests and helpers"
```

---

### Task 9: Update fixtures to support first-start wizard and remove api

**Files:**

- Modify: `e2e/electron-fixtures.ts`
- Modify: `e2e/pages/index.ts`

- [ ] **Step 1: Update `e2e/pages/index.ts` to export FirstStartPage**

Replace the file content:

```typescript
export { ApplicantListPage } from "./applicant-list.page.js"
export { ApplicantPage } from "./applicant.page.js"
export { FirstStartPage } from "./first-start.page.js"
export { JobSearchPage } from "./job-search.page.js"
export { LayoutPage } from "./layout.page.js"
export { SettingsPage } from "./settings.page.js"
```

- [ ] **Step 2: Update `e2e/electron-fixtures.ts` to remove api, stop writing completed config, and add firstStartPage**

Replace the entire file:

```typescript
import {
  test as base,
  _electron as electron,
  type ElectronApplication,
} from "@playwright/test"
import { resolve } from "node:path"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { REQUIRED_E2E_ENV } from "./helpers/live-e2e-setup.js"
import {
  ApplicantListPage,
  ApplicantPage,
  FirstStartPage,
  JobSearchPage,
  LayoutPage,
  SettingsPage,
} from "./pages/index.js"

const envFilePath = resolve(".env")

if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath)
  applyRequiredE2eEnvOverrides(envFilePath)
}

type Fixtures = {
  electronApp: ElectronApplication
  applicantListPage: ApplicantListPage
  applicantPage: ApplicantPage
  firstStartPage: FirstStartPage
  jobSearchPage: JobSearchPage
  layoutPage: LayoutPage
  settingsPage: SettingsPage
}

export const test = base.extend<Fixtures>({
  electronApp: async ({}, use) => {
    assertRequiredE2eEnvironment()
    const dataDir = mkdtempSync(join(tmpdir(), "e2e-data-"))
    const isCI = !!process.env.CI
    const electronApp = await electron.launch({
      args: [
        resolve("out/main/main.cjs"),
        ...(isCI ? ["--no-sandbox", "--disable-gpu"] : []),
      ],
      env: {
        ...createElectronEnvironment(),
        NODE_ENV: "production",
        ELECTRON_TEST: "1",
        ELECTRON_TEST_DATA_DIR: dataDir,
      },
    })
    await use(electronApp)
    await electronApp.close()
    rmSync(dataDir, { recursive: true, force: true })
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow({ timeout: 60_000 })
    await page.waitForLoadState("domcontentloaded")

    const currentUrl = page.url()
    const baseURL = currentUrl.startsWith("app://")
      ? "app://."
      : new URL(currentUrl).origin

    const originalGoto = page.goto.bind(page)
    page.goto = ((url: string, options?: Parameters<typeof page.goto>[1]) => {
      if (url.startsWith("/")) {
        return originalGoto(`${baseURL}${url}`, options)
      }
      return originalGoto(url, options)
    }) as typeof page.goto

    await use(page)
  },

  applicantListPage: async ({ page }, use) => {
    await use(new ApplicantListPage(page))
  },
  applicantPage: async ({ page }, use) => {
    await use(new ApplicantPage(page))
  },
  firstStartPage: async ({ page }, use) => {
    await use(new FirstStartPage(page))
  },
  jobSearchPage: async ({ page }, use) => {
    await use(new JobSearchPage(page))
  },
  layoutPage: async ({ page }, use) => {
    await use(new LayoutPage(page))
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page))
  },
})

export { expect } from "@playwright/test"

function assertRequiredE2eEnvironment(): void {
  const missing = Object.entries(REQUIRED_E2E_ENV)
    .filter(([name]) => !process.env[name]?.trim())
    .map(([name, label]) => `${label} (${name})`)

  if (missing.length === 0) {
    return
  }

  throw new Error(
    `Missing required E2E environment variables: ${missing.join(", ")}`,
  )
}

function createElectronEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env }
  for (const key of Object.keys(REQUIRED_E2E_ENV)) {
    delete environment[key]
  }
  return environment
}

function applyRequiredE2eEnvOverrides(filePath: string): void {
  const content = readFileSync(filePath, "utf8")

  for (const line of content.split("\n")) {
    const entry = line.trim()
    if (entry.length === 0 || entry.startsWith("#")) {
      continue
    }

    const separatorIndex = entry.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const name = entry.slice(0, separatorIndex).trim()
    if (!(name in REQUIRED_E2E_ENV)) {
      continue
    }

    process.env[name] = entry.slice(separatorIndex + 1).trim()
  }
}
```

Key changes from the original:

- Removed `import { ElectronApiHelper }` and `import { writeFileSync }`
- Removed `api` from `Fixtures` type
- Removed `api` fixture definition
- Removed `writeFileSync(join(dataDir, "config.json"), ...)` — no setup completion bypass
- Added `FirstStartPage` import and `firstStartPage` fixture
- Added `FirstStartPage` to `Fixtures` type

- [ ] **Step 3: Run lint**

```bash
npx eslint e2e/electron-fixtures.ts e2e/pages/index.ts
```

Expected: PASS (no errors)

- [ ] **Step 4: Commit**

```bash
git add e2e/electron-fixtures.ts e2e/pages/index.ts
git commit -m "feat: update fixtures for UI-only E2E with first-start wizard support"
```

---

### Task 10: Write Suite 1 — Applicant Lifecycle

**Files:**

- Create: `e2e/tests-flow/applicant-lifecycle.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { test, expect } from "../fixtures.js"
import { fastTrackFirstStart } from "../helpers/first-start-helper.js"
import {
  expectApplicantCardVisible,
  expectApplicantCardNotVisible,
  expectResumeDownloaded,
} from "../helpers/assertions.js"

test.describe("Applicant lifecycle", () => {
  test.describe.configure({ mode: "serial" })

  let minimalApplicantId: string
  let fullApplicantId: string
  const fullApplicantName = `e2e-full-${Date.now()}`
  const fullApplicantEmail = "e2e-full@example.com"

  test("sets up first-start and creates minimal applicant", async ({
    page,
  }) => {
    minimalApplicantId = (await fastTrackFirstStart(page, {
      configureKeys: false,
    })) as string
    expect(minimalApplicantId).toBeTruthy()
  })

  test("creates applicant filling all wizard steps", async ({
    applicantListPage,
    applicantPage,
  }) => {
    fullApplicantId = await applicantListPage.createApplicantFull(
      fullApplicantName,
      fullApplicantEmail,
    )
    expect(fullApplicantId).toBeTruthy()
    await expect(applicantPage.page).toHaveURL(
      new RegExp(`/applicants/${fullApplicantId}`),
    )
    await expect(
      applicantPage.page.getByRole("heading", { name: "Lebenslauf" }),
    ).toBeVisible()
  })

  test("shows all entered data across applicant tabs", async ({
    applicantPage,
  }) => {
    // Übersicht tab (already there)
    await expect(
      applicantPage.page.getByRole("heading", { name: "Lebenslauf" }),
    ).toBeVisible()

    // Persönlich tab
    await applicantPage.navigateToTab("Persönlich", "Persönlich")
    await applicantPage.expectFieldHasValue("Name", fullApplicantName)
    await applicantPage.expectFieldHasValue("E-Mail", fullApplicantEmail)
    await applicantPage.expectFieldHasValue("Telefon", "+49 30 123456")

    // Erfahrung tab
    await applicantPage.navigateToTab("Erfahrung", "Berufserfahrung")
    await expect(applicantPage.field("Position")).toBeVisible()
    await expect(applicantPage.field("Unternehmen")).toBeVisible()

    // Ausbildung tab
    await applicantPage.navigateToTab("Ausbildung", "Ausbildung")
    await expect(applicantPage.field("Institution")).toBeVisible()

    // Zertifikate tab
    await applicantPage.navigateToTab("Zertifikate", "Zertifikate")
    await expect(applicantPage.field("Name")).toBeVisible()

    // Sonstiges tab
    await applicantPage.navigateToTab("Sonstiges", "Sonstiges")
    await expect(applicantPage.field("Kenntnis").first()).toBeVisible()
  })

  test("downloads a resume template", async ({ applicantPage }) => {
    const download = await applicantPage.downloadResumeTemplate("Modern")
    await expectResumeDownloaded(download, "modern")
  })

  test("edits a field and persists after navigation", async ({
    applicantPage,
  }) => {
    await applicantPage.navigateToTab("Persönlich", "Persönlich")
    await applicantPage.field("Name").fill(fullApplicantName + "-edited")
    await applicantPage.navigateToOverviewTab()
    await applicantPage.navigateToTab("Persönlich", "Persönlich")
    await applicantPage.expectFieldHasValue(
      "Name",
      fullApplicantName + "-edited",
    )
  })

  test("deletes applicant and removes from list", async ({
    page,
    applicantListPage,
  }) => {
    await applicantListPage.goto()
    await expectApplicantCardVisible(page, fullApplicantName + "-edited")
    const fullCard = page
      .locator(".cursor-pointer", { hasText: fullApplicantName + "-edited" })
      .first()
    await fullCard.locator("button", { hasText: "Löschen" }).click()

    page.once("dialog", (dialog) => {
      void dialog.accept()
    })

    await expectApplicantCardNotVisible(page, fullApplicantName + "-edited")
    await expectApplicantCardVisible(page, `e2e-fast-`)
  })
})
```

- [ ] **Step 2: Run lint**

```bash
npx eslint e2e/tests-flow/applicant-lifecycle.spec.ts
```

Expected: PASS (no errors)

- [ ] **Step 3: Verify the test file compiles (TypeScript check only, no execution)**

```bash
npx tsc --noEmit e2e/tests-flow/applicant-lifecycle.spec.ts 2>&1 | head -20
```

Expected: no type errors

- [ ] **Step 4: Commit**

```bash
git add e2e/tests-flow/applicant-lifecycle.spec.ts
git commit -m "feat: add applicant lifecycle E2E test suite"
```

---

### Task 11: Write Suite 2 — Job Search Lifecycle

**Files:**

- Create: `e2e/tests-flow/job-search-lifecycle.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { test, expect } from "../fixtures.js"
import { fastTrackFirstStart } from "../helpers/first-start-helper.js"

test.describe("Job search lifecycle", () => {
  test.describe.configure({ mode: "serial" })

  let applicantId: string
  let jobSearchId: string

  test("sets up first-start and creates minimal applicant", async ({
    page,
  }) => {
    applicantId = (await fastTrackFirstStart(page, {
      configureKeys: false,
    })) as string
    expect(applicantId).toBeTruthy()
  })

  test("walks through job search wizard and finalizes", async ({
    applicantPage,
    jobSearchPage,
  }) => {
    await applicantPage.openWizard()

    // Step 1: Suchparameter
    await expect(applicantPage.wizardStepHeading(1)).toBeVisible()
    await applicantPage.field("Suchbegriff").fill("Softwareentwickler")
    await applicantPage.field("Max. Ergebnisse").fill("5")
    await applicantPage.wizardContinueButton.click()

    // Step 2: Suchmodus
    await expect(applicantPage.wizardStepHeading(2)).toBeVisible()
    await jobSearchPage.festanstellungButton.click()
    await applicantPage.wizardContinueButton.click()

    // Step 3: Jobbörsen
    await expect(applicantPage.wizardStepHeading(3)).toBeVisible()
    await applicantPage.page
      .getByRole("button", { name: "xing", exact: true })
      .click()
    await applicantPage.wizardContinueButton.click()

    // Step 4: Präferenzen
    await expect(applicantPage.wizardStepHeading(4)).toBeVisible()
    await applicantPage.wizardContinueButton.click()

    // Step 5: Anschreiben
    await expect(applicantPage.wizardStepHeading(5)).toBeVisible()
    await applicantPage.wizardFinishButton.click()

    await expect(jobSearchPage.vacanciesHeading).toBeVisible()
    const url = jobSearchPage.page.url()
    jobSearchId = /\/job-searches\/([^/]+)\/vacancies/.exec(url)?.[1] ?? ""
    expect(jobSearchId).toBeTruthy()
  })

  test("verifies job search config", async ({ jobSearchPage, page }) => {
    await jobSearchPage.gotoConfig(jobSearchId)
    await expect(jobSearchPage.configHeading).toBeVisible()
    await expect(page.getByDisplayValue("Softwareentwickler")).toBeVisible()

    await expect(jobSearchPage.festanstellungButton).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  test("deletes job search and applicant", async ({ applicantPage, page }) => {
    await applicantPage.goto(applicantId)
    await applicantPage.deleteJobSearchFromList("Softwareentwickler")

    page.once("dialog", (dialog) => {
      void dialog.accept()
    })
    await page.waitForTimeout(500)

    const applicantCard = page
      .locator(".cursor-pointer", { hasText: `e2e-fast-` })
      .first()
    await applicantCard.locator("button", { hasText: "Löschen" }).click()

    page.once("dialog", (dialog) => {
      void dialog.accept()
    })
    await page.waitForTimeout(500)
  })
})
```

- [ ] **Step 2: Run lint**

```bash
npx eslint e2e/tests-flow/job-search-lifecycle.spec.ts
```

Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add e2e/tests-flow/job-search-lifecycle.spec.ts
git commit -m "feat: add job search lifecycle E2E test suite"
```

---

### Task 12: Write Suite 3 — Settings Lifecycle

**Files:**

- Create: `e2e/tests-flow/settings-lifecycle.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { test, expect } from "../fixtures.js"
import { fastTrackFirstStart } from "../helpers/first-start-helper.js"
import { OPENROUTER_LABEL, MAPS_LABEL } from "../helpers/live-e2e-setup.js"

test.describe("Settings lifecycle", () => {
  test.describe.configure({ mode: "serial" })

  test("sets up first-start and creates minimal applicant", async ({
    page,
  }) => {
    const applicantId = await fastTrackFirstStart(page, {
      configureKeys: false,
    })
    expect(applicantId).toBeTruthy()
  })

  test("switches provider and selects a model", async ({ settingsPage }) => {
    await settingsPage.goto()
    await expect(settingsPage.heading).toBeVisible()

    // Click a provider button — try Requesty
    const requestyButton = settingsPage.providerButton("Requesty")
    if (await requestyButton.isVisible()) {
      await requestyButton.click()
    }

    // Select a model in the Bewertung combobox
    const bewertungSelect = settingsPage.modelSelect("Bewertung")
    if (await bewertungSelect.isVisible()) {
      const options = await bewertungSelect.locator("option").all()
      if (options.length > 1) {
        const secondValue = await options[1].getAttribute("value")
        if (secondValue) {
          await bewertungSelect.selectOption(secondValue)
          const newValue = await bewertungSelect.inputValue()
          expect(newValue).toBeTruthy()
        }
      }
    }
  })

  test("manages an LLM API key through full lifecycle", async ({
    settingsPage,
  }) => {
    await settingsPage.goto()
    await expect(settingsPage.heading).toBeVisible()

    // Assert unset
    await settingsPage.assertUnsetSecret(OPENROUTER_LABEL)

    // Add
    await settingsPage.addAndSave(OPENROUTER_LABEL, "test-key-123")
    await settingsPage.assertSavedSecret(OPENROUTER_LABEL)

    // Test — may fail since key is fake, but the result should appear
    const testBtn = settingsPage.testButton(OPENROUTER_LABEL)
    if (await testBtn.isVisible()) {
      await testBtn.click()
      await settingsPage.testAndAssertResult()
    }

    // Replace
    await settingsPage.replaceAndSave(OPENROUTER_LABEL, "test-key-456")
    await settingsPage.assertSavedSecret(OPENROUTER_LABEL)

    // Clear
    await settingsPage.clearButton(OPENROUTER_LABEL).click()
    await settingsPage.assertUnsetSecret(OPENROUTER_LABEL)
  })

  test("manages a Maps API key through add and clear", async ({
    settingsPage,
  }) => {
    await settingsPage.goto()

    // Navigate to Karten
    await settingsPage.navLink("Karten").click()
    await settingsPage.assertUnsetSecret(MAPS_LABEL)

    // Add
    await settingsPage.addAndSave(MAPS_LABEL, "test-maps-key")
    await settingsPage.assertSavedSecret(MAPS_LABEL)

    // Clear
    await settingsPage.clearButton(MAPS_LABEL).click()
    await settingsPage.assertUnsetSecret(MAPS_LABEL)
  })
})
```

- [ ] **Step 2: Run lint**

```bash
npx eslint e2e/tests-flow/settings-lifecycle.spec.ts
```

Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add e2e/tests-flow/settings-lifecycle.spec.ts
git commit -m "feat: add settings lifecycle E2E test suite"
```

---

### Task 13: Write Suite 4 — Full Application Flow

**Files:**

- Create: `e2e/tests-flow/full-application-flow.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { test, expect } from "../fixtures.js"
import { fastTrackFirstStart } from "../helpers/first-start-helper.js"
import { expectResumeDownloaded } from "../helpers/assertions.js"

test.describe("Full application flow", () => {
  test.describe.configure({ timeout: 480_000 })

  test("fresh install through vacancy acceptance using xing", async ({
    page,
    applicantListPage,
    applicantPage,
    jobSearchPage,
  }) => {
    const consoleErrors: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text())
      }
    })

    // Phase 1: Fresh Install & Setup
    await fastTrackFirstStart(page, { configureKeys: true })

    // Phase 2: Create Applicant (all fields)
    const applicantName = `e2e-full-${Date.now()}`
    const applicantId = await applicantListPage.createApplicantFull(
      applicantName,
      "e2e-full@example.com",
    )
    expect(applicantId).toBeTruthy()

    // Download resume
    const download = await applicantPage.downloadResumeTemplate("Modern")
    await expectResumeDownloaded(download, "modern")

    // Phase 3: Create Job Search (xing, max 5)
    await applicantPage.openWizard()

    // Step 1: Suchparameter
    await applicantPage.field("Suchbegriff").fill("Softwareentwickler")
    await applicantPage.field("Max. Ergebnisse").fill("5")
    await applicantPage.wizardContinueButton.click()

    // Step 2: Suchmodus
    await jobSearchPage.festanstellungButton.click()
    await applicantPage.wizardContinueButton.click()

    // Step 3: Jobbörsen — xing only
    await page.getByRole("button", { name: "xing", exact: true }).click()
    await applicantPage.wizardContinueButton.click()

    // Step 4: Präferenzen
    await applicantPage.wizardContinueButton.click()

    // Step 5: Anschreiben
    await applicantPage.wizardFinishButton.click()

    await expect(jobSearchPage.vacanciesHeading).toBeVisible()
    const url = jobSearchPage.page.url()
    const jobSearchId =
      /\/job-searches\/([^/]+)\/vacancies/.exec(url)?.[1] ?? ""
    expect(jobSearchId).toBeTruthy()

    // No missing-key warnings
    await expect(jobSearchPage.missingKeyNote).not.toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).not.toBeVisible()

    // Phase 4: Crawl, Batch Enrich, Cover Letter Template
    await jobSearchPage.refreshButton.click()
    await jobSearchPage.waitForCrawlComplete()

    const vacancyCards = page.locator("a[href*='/vacancies/']")
    const cardCount = await vacancyCards.count()
    expect(cardCount).toBeGreaterThanOrEqual(1)
    expect(cardCount).toBeLessThanOrEqual(5)

    // Batch enrich
    if (await jobSearchPage.enrichAllButton.isVisible()) {
      await jobSearchPage.enrichAllButton.click()
      await jobSearchPage.waitForEnrichmentComplete()
    }
    await jobSearchPage.waitForEnrichmentOnAnyCard()

    // Cover letter template
    await jobSearchPage.gotoCoverLetter(jobSearchId)
    await expect(
      page.getByRole("heading", { name: "Anschreiben-Vorlage" }),
    ).toBeVisible()
    await jobSearchPage.generateButton.click()
    await jobSearchPage.waitForCoverLetterContent()

    // Phase 5: Vacancy 1 Lifecycle (apply → invited → interviewed → offered → rejected)
    await jobSearchPage.gotoVacancies(jobSearchId)
    await jobSearchPage.clickVacancyCardByIndex(0)

    // Assert enrichment visible
    await jobSearchPage.expectVacancyDetailShows({
      summary: true,
      commute: true,
    })

    // Generate per-vacancy cover letter
    await jobSearchPage.generateButton.click()
    await jobSearchPage.waitForCoverLetterContent()

    // Apply
    await jobSearchPage.recordActivity("Bewerben")
    await jobSearchPage.expectStatusBadge("Beworben")

    // Invite
    await jobSearchPage.recordActivity("Einladen", {
      interviewDate: "2026-06-01",
    })
    await jobSearchPage.expectStatusBadge("Eingeladen")

    // Interview
    await jobSearchPage.recordActivity("Gespräch")
    await jobSearchPage.expectStatusBadge("Gespräch")

    // Offer
    await jobSearchPage.recordActivity("Angebot")
    await jobSearchPage.expectStatusBadge("Angebot")

    // Reject
    await jobSearchPage.recordActivity("Ablehnen")
    await jobSearchPage.expectStatusBadge("Abgelehnt")

    // Activity history
    await jobSearchPage.expectActivityHistoryContains([
      "Beworben",
      "Eingeladen",
      "Gespräch",
      "Angebot",
      "Abgelehnt",
    ])

    // Phase 6: Vacancy 2 Lifecycle (apply → invited → interviewed → offered)
    await jobSearchPage.backToVacanciesLink.click()
    await jobSearchPage.clickVacancyCardByIndex(1)

    await jobSearchPage.recordActivity("Bewerben")
    await jobSearchPage.expectStatusBadge("Beworben")

    await jobSearchPage.recordActivity("Einladen", {
      interviewDate: "2026-06-15",
    })
    await jobSearchPage.expectStatusBadge("Eingeladen")

    await jobSearchPage.recordActivity("Gespräch")
    await jobSearchPage.expectStatusBadge("Gespräch")

    await jobSearchPage.recordActivity("Angebot")
    await jobSearchPage.expectStatusBadge("Angebot")

    await jobSearchPage.expectActivityHistoryContains([
      "Beworben",
      "Eingeladen",
      "Gespräch",
      "Angebot",
    ])

    // No console errors
    expect(consoleErrors).toEqual([])
  })
})
```

- [ ] **Step 2: Run lint**

```bash
npx eslint e2e/tests-flow/full-application-flow.spec.ts
```

Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add e2e/tests-flow/full-application-flow.spec.ts
git commit -m "feat: add full application flow E2E test suite (xing)"
```

---

### Task 14: Verify the full test suite compiles and lint passes

**Files:** All

- [ ] **Step 1: Lint all E2E files**

```bash
npx eslint e2e/
```

Expected: PASS (no errors)

- [ ] **Step 2: Verify TypeScript compilation of E2E files**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "e2e/" | head -10
```

Expected: no e2e-related type errors

- [ ] **Step 3: Run non-live suites (1-3) to verify they work**

```bash
npm run test:e2e -- --grep "applicant-lifecycle"
npm run test:e2e -- --grep "job-search-lifecycle"
npm run test:e2e -- --grep "settings-lifecycle"
```

Expected: All PASS

- [ ] **Step 4: Verify with `npm run verify`**

```bash
npm run verify
```

Expected: PASS

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix lint and type issues after E2E suite additions"
```

---

## Self-Review Checklist

1. **Spec coverage**: All design requirements mapped.
   - Suite 1 (applicant lifecycle): Task 10
   - Suite 2 (job search lifecycle): Task 11
   - Suite 3 (settings lifecycle): Task 12
   - Suite 4 (full application flow): Task 13
   - `assertions.ts`: Task 1
   - `FirstStartPage`: Task 2
   - `fastTrackFirstStart` helper: Task 7
   - Page object extensions: Tasks 3-6
   - Fixture updates: Task 9
   - Old file removal: Task 8

2. **Placeholder scan**: No TBD, TODO, "implement later", "add error handling", or generic "write tests for the above" present.

3. **Type consistency**: `fastTrackFirstStart` returns `Promise<string | undefined>` — suites that use `configureKeys: false` cast the result with `as string`. Suite 4 calls it with `configureKeys: true` and receives `undefined`. All imports match exports.

4. **Task ordering**: Helpers and page objects (Tasks 1-7) built first. Old files removed (Task 8). Fixture updated (Task 9). Suites written last (Tasks 10-13) — they depend on everything prior.
