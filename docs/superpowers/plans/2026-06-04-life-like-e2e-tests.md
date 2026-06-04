# Life-like E2E Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use /skill:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Playwright Electron E2E suite start from a real empty app state, configure live keys through the first-start wizard, and remove direct IPC usage from the active E2E path.

**Architecture:** Keep all changes inside the E2E harness, page objects, helpers, and specs. Add a dedicated first-start page object, move live-key setup to UI-only helpers, then rewrite the diagnostics, runtime-contract, and major-flow specs to observe only visible UI state. Do not change product behavior unless a stable semantic locator is genuinely missing.

**Tech Stack:** TypeScript, Electron, Playwright, React, React Router

**Roadmap:** None

**Phase:** Single-plan implementation

---

## File map

- `e2e/electron-fixtures.ts` — launches Electron, prepares temp data dirs, strips live env vars from the child process, and exposes Playwright fixtures.
- `e2e/pages/first-start.page.ts` — new page object for first-start wizard shell controls (`Weiter`, `Fertigstellen`, `Überspringen`, skip confirmation, current step assertions).
- `e2e/pages/settings.page.ts` — page object for AI/Maps secret controls and visible validation state (`Gültig`, `Ungültig`, masked secret, selected provider, model combobox values).
- `e2e/pages/applicant-list.page.ts` — applicant wizard helpers that work both from the normal list route and `/first-start/applicant`.
- `e2e/pages/applicant.page.ts` — job-search wizard helpers that work both from the normal applicant route and `/first-start/job-search/:applicantId`.
- `e2e/pages/job-search.page.ts` — vacancy-list/detail locators used for UI-only crawl/enrichment/cover-letter assertions.
- `e2e/pages/index.ts` — re-exports page objects.
- `e2e/helpers/live-e2e-setup.ts` — centralized live credential reader plus UI-only setup helpers for first-start and regular settings.
- `e2e/helpers/live-flow-helper.ts` — shared UI-only workflow helper for first-start applicant/job-search creation and vacancy flow waits.
- `e2e/helpers/electron-api-helper.ts` — delete once no active E2E path uses direct IPC.
- `e2e/tests-flow/first-start-wizard.spec.ts` — new narrow regression test for invalid then valid key validation in the first-start wizard.
- `e2e/tests-flow/live-enrichment-diagnostics.spec.ts` — diagnostics-style smoke test rewritten to visible UI assertions only.
- `e2e/tests-flow/runtime-contract.spec.ts` — isolation contract proving clean startup, missing-key warnings through real UI navigation, and clean isolation on the next run.
- `e2e/tests-flow/live-flow.spec.ts` — major live flow rewritten to use first-start setup plus UI-only crawl/enrichment/cover-letter assertions.

## Task 1: Start E2E from a real empty app state

**Files:**
- Create: `e2e/pages/first-start.page.ts`
- Modify: `e2e/electron-fixtures.ts`
- Modify: `e2e/pages/index.ts`
- Create: `e2e/tests-flow/first-start-wizard.spec.ts`

- [ ] **Step 1: Run the repo fixer before touching E2E files**

Run:
```bash
npm run fix
```

Expected: formatting/lint cleanup completes without touching behavior.

- [ ] **Step 2: Write a failing spec that proves the app now needs to open on the first-start wizard**

Create `e2e/tests-flow/first-start-wizard.spec.ts` with this initial test:

```ts
import { test } from "../fixtures.js"

test.describe("First-start wizard", () => {
  test("starts on the first-start wizard from an empty test profile", async ({
    firstStartPage,
  }) => {
    await firstStartPage.assertVisible()
  })
})
```

- [ ] **Step 3: Run the new spec and confirm it fails for the right reason**

Run:
```bash
electron-vite build && npx playwright test e2e/tests-flow/first-start-wizard.spec.ts --config=e2e/playwright.electron.config.ts
```

Expected: FAIL because `firstStartPage` does not exist yet and/or the fixture still prewrites `setup.completed: true` so the app bypasses first-start.

- [ ] **Step 4: Add a first-start page object and stop prewriting setup completion**

Create `e2e/pages/first-start.page.ts`:

```ts
import { expect, type Locator, type Page } from "@playwright/test"

export class FirstStartPage {
  readonly page: Page
  readonly title: Locator
  readonly aiHeading: Locator
  readonly mapsHeading: Locator
  readonly continueButton: Locator
  readonly finishButton: Locator
  readonly skipButton: Locator
  readonly skipConfirmButton: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByText("Ersteinrichtung", { exact: true })
    this.aiHeading = page.getByRole("heading", {
      name: "Künstliche Intelligenz",
    })
    this.mapsHeading = page.getByRole("heading", { name: "Karten" })
    this.continueButton = page.getByRole("button", { name: "Weiter" })
    this.finishButton = page.getByRole("button", { name: "Fertigstellen" })
    this.skipButton = page.getByRole("button", { name: "Überspringen" })
    this.skipConfirmButton = page.getByRole("button", {
      name: "Trotzdem überspringen",
    })
  }

  async assertVisible(): Promise<void> {
    await expect(this.title).toBeVisible()
    await expect(this.aiHeading).toBeVisible()
    await expect(this.continueButton).toBeVisible()
  }
}
```

Update `e2e/pages/index.ts`:

```ts
export { ApplicantListPage } from "./applicant-list.page.js"
export { ApplicantPage } from "./applicant.page.js"
export { FirstStartPage } from "./first-start.page.js"
export { JobSearchPage } from "./job-search.page.js"
export { LayoutPage } from "./layout.page.js"
export { SettingsPage } from "./settings.page.js"
```

Update `e2e/electron-fixtures.ts` so it keeps the child environment stripping logic, stops prewriting config, **and removes the global live-env gate from the shared Electron fixture**. Live credential validation must happen only inside `readRequiredLiveCredentials()` when a live spec/helper actually asks for keys.

Use this shape:

```ts
import {
  test as base,
  _electron as electron,
  type ElectronApplication,
} from "@playwright/test"
import { resolve } from "node:path"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ElectronApiHelper } from "./helpers/electron-api-helper.js"
import { REQUIRED_E2E_ENV } from "./helpers/live-e2e-setup.js"
import {
  ApplicantListPage,
  ApplicantPage,
  FirstStartPage,
  JobSearchPage,
  LayoutPage,
  SettingsPage,
} from "./pages/index.js"

type Fixtures = {
  electronApp: ElectronApplication
  api: ElectronApiHelper
  firstStartPage: FirstStartPage
  applicantListPage: ApplicantListPage
  applicantPage: ApplicantPage
  jobSearchPage: JobSearchPage
  layoutPage: LayoutPage
  settingsPage: SettingsPage
}

export const test = base.extend<Fixtures>({
  electronApp: async ({}, use) => {
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

  firstStartPage: async ({ page }, use) => {
    await use(new FirstStartPage(page))
  },

  api: async ({ page }, use) => {
    await use(new ElectronApiHelper(page))
  },
})

function createElectronEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env }
  for (const key of Object.keys(REQUIRED_E2E_ENV)) {
    delete environment[key]
  }
  return environment
}

// Delete the old assertRequiredE2eEnvironment() helper entirely.
```

- [ ] **Step 5: Re-run the first-start spec and confirm it passes**

Run:
```bash
electron-vite build && npx playwright test e2e/tests-flow/first-start-wizard.spec.ts --config=e2e/playwright.electron.config.ts
```

Expected: PASS. The app should now open on the first-start wizard with no prewritten config, and this spec should no longer require live credentials just to launch Electron.

- [ ] **Step 6: Commit the clean-start harness change**

Run:
```bash
git add e2e/electron-fixtures.ts e2e/pages/index.ts e2e/pages/first-start.page.ts e2e/tests-flow/first-start-wizard.spec.ts
git commit -m "test: start e2e from first-start wizard"
```

## Task 2: Add the focused invalid/valid key wizard regression test

**Files:**
- Modify: `e2e/helpers/live-e2e-setup.ts`
- Modify: `e2e/pages/first-start.page.ts`
- Modify: `e2e/pages/settings.page.ts`
- Modify: `e2e/tests-flow/first-start-wizard.spec.ts`

- [ ] **Step 1: Expand the first-start spec to cover invalid then valid keys on both wizard steps**

Replace the spec body in `e2e/tests-flow/first-start-wizard.spec.ts` with:

```ts
import { test } from "../fixtures.js"
import {
  MAPS_LABEL,
  OPENROUTER_LABEL,
  readRequiredLiveCredentials,
} from "../helpers/live-e2e-setup.js"

test.describe("First-start wizard", () => {
  test("fills invalid keys first, then valid live keys, and sees the test buttons react through UI only", async ({
    firstStartPage,
    settingsPage,
  }) => {
    const credentials = readRequiredLiveCredentials()

    await firstStartPage.assertVisible()

    await settingsPage.addAndSave(OPENROUTER_LABEL, "invalid-openrouter-key")
    await settingsPage.testButton(OPENROUTER_LABEL).click()
    await settingsPage.expectTestFailure()

    await settingsPage.replaceAndSave(
      OPENROUTER_LABEL,
      credentials.openrouterApiKey,
    )
    await settingsPage.testButton(OPENROUTER_LABEL).click()
    await settingsPage.expectTestSuccess()

    await firstStartPage.continueToMaps()

    await settingsPage.addAndSave(MAPS_LABEL, "invalid-google-maps-key")
    await settingsPage.testButton(MAPS_LABEL).click()
    await settingsPage.expectTestFailure()

    await settingsPage.replaceAndSave(
      MAPS_LABEL,
      credentials.googleMapsApiKey,
    )
    await settingsPage.testButton(MAPS_LABEL).click()
    await settingsPage.expectTestSuccess()
  })
})
```

- [ ] **Step 2: Run the spec and confirm the missing helper methods/locators fail first**

Run:
```bash
electron-vite build && npx playwright test e2e/tests-flow/first-start-wizard.spec.ts --config=e2e/playwright.electron.config.ts
```

Expected: FAIL because `readRequiredLiveCredentials`, `continueToMaps`, `expectTestFailure`, and `expectTestSuccess` are not implemented yet.

- [ ] **Step 3: Implement UI-only credential reading and first-start/settings assertions**

Export the env reader from `e2e/helpers/live-e2e-setup.ts` and remove the old IPC assertion helper:

```ts
import type { FirstStartPage, SettingsPage } from "../pages/index.js"

export const OPENROUTER_LABEL = "OpenRouter API-Schlüssel"
export const MAPS_LABEL = "Google Maps API-Schlüssel"

export function readRequiredLiveCredentials(): LiveCredentials {
  return {
    openrouterApiKey: readRequiredEnvironmentVariable("OPENROUTER_API_KEY"),
    googleMapsApiKey: readRequiredEnvironmentVariable("GOOGLE_MAPS_API_KEY"),
  }
}

export async function finishFirstStartSettingsWithLiveCredentials(
  firstStartPage: FirstStartPage,
  settingsPage: SettingsPage,
): Promise<void> {
  const credentials = readRequiredLiveCredentials()

  await firstStartPage.assertVisible()
  await settingsPage.addAndSave(OPENROUTER_LABEL, credentials.openrouterApiKey)
  await settingsPage.assertSavedSecret(OPENROUTER_LABEL)
  await settingsPage.testButton(OPENROUTER_LABEL).click()
  await settingsPage.expectTestSuccess()

  await firstStartPage.continueToMaps()
  await settingsPage.addAndSave(MAPS_LABEL, credentials.googleMapsApiKey)
  await settingsPage.assertSavedSecret(MAPS_LABEL)
  await settingsPage.testButton(MAPS_LABEL).click()
  await settingsPage.expectTestSuccess()

  await firstStartPage.finishSettings()
}
```

Extend `e2e/pages/first-start.page.ts`:

```ts
  async continueToMaps(): Promise<void> {
    await this.continueButton.click()
    await expect(this.mapsHeading).toBeVisible()
  }

  async finishSettings(): Promise<void> {
    await expect(this.finishButton).toBeVisible()
    await this.finishButton.click()
  }
```

Extend `e2e/pages/settings.page.ts` so it can assert visible validation results from the UI:

```ts
  testResult(): Locator {
    return this.page
      .locator("[class*='text-green'], [class*='text-red']")
      .filter({
        hasText: /(Ungültig|Gültig|HTTP|API-Status|Kein Schlüssel)/,
      })
  }

  async expectTestSuccess() {
    await expect(this.testResult()).toHaveText(/Gültig/)
  }

  async expectTestFailure() {
    await expect(this.testResult()).toHaveText(
      /Ungültig|HTTP|API-Status|Kein Schlüssel/,
    )
  }
```

- [ ] **Step 4: Re-run the focused wizard spec and confirm it passes**

Run:
```bash
electron-vite build && npx playwright test e2e/tests-flow/first-start-wizard.spec.ts --config=e2e/playwright.electron.config.ts
```

Expected: PASS. The test should prove invalid keys fail and valid env-backed keys succeed on both steps.

- [ ] **Step 5: Commit the focused wizard validation coverage**

Run:
```bash
git add e2e/helpers/live-e2e-setup.ts e2e/pages/first-start.page.ts e2e/pages/settings.page.ts e2e/tests-flow/first-start-wizard.spec.ts
git commit -m "test: validate live keys through first-start wizard"
```

## Task 3: Rewrite diagnostics coverage to visible UI assertions only

**Files:**
- Modify: `e2e/pages/settings.page.ts`
- Modify: `e2e/tests-flow/live-enrichment-diagnostics.spec.ts`

- [ ] **Step 1: Rewrite the diagnostics spec so it checks only visible state on the first-start settings screens**

Replace `e2e/tests-flow/live-enrichment-diagnostics.spec.ts` with:

```ts
import { test } from "../fixtures.js"
import {
  MAPS_LABEL,
  OPENROUTER_LABEL,
  readRequiredLiveCredentials,
} from "../helpers/live-e2e-setup.js"

test.describe("Live enrichment diagnostics", () => {
  test("shows configured provider state, masked secrets, successful tests, and non-empty model selections through visible UI only", async ({
    firstStartPage,
    settingsPage,
  }) => {
    const credentials = readRequiredLiveCredentials()

    await firstStartPage.assertVisible()
    await settingsPage.expectProviderSelected("OpenRouter")

    await settingsPage.addAndSave(OPENROUTER_LABEL, credentials.openrouterApiKey)
    await settingsPage.assertSavedSecret(OPENROUTER_LABEL)
    await settingsPage.testButton(OPENROUTER_LABEL).click()
    await settingsPage.expectTestSuccess()

    await settingsPage.expectModelSelected("Bewertungsmodell")
    await settingsPage.expectModelSelected("Anschreibenmodell")
    await settingsPage.expectModelSelected("Beratungsmodell")

    await firstStartPage.continueToMaps()

    await settingsPage.addAndSave(MAPS_LABEL, credentials.googleMapsApiKey)
    await settingsPage.assertSavedSecret(MAPS_LABEL)
    await settingsPage.testButton(MAPS_LABEL).click()
    await settingsPage.expectTestSuccess()
  })
})
```

- [ ] **Step 2: Run the diagnostics spec and confirm it fails because the page object cannot yet assert selection state**

Run:
```bash
electron-vite build && npx playwright test e2e/tests-flow/live-enrichment-diagnostics.spec.ts --config=e2e/playwright.electron.config.ts
```

Expected: FAIL because `expectProviderSelected` and `expectModelSelected` do not exist yet.

- [ ] **Step 3: Teach the settings page object how to assert selected provider cards and non-empty model combobox values**

Extend `e2e/pages/settings.page.ts` with:

```ts
  async expectProviderSelected(name: string) {
    await expect(this.providerButton(name)).toHaveClass(/border-blue-500/)
  }

  async expectModelSelected(label: string) {
    await expect(this.modelSelect(label)).toHaveValue(/\S/)
  }
```

- [ ] **Step 4: Re-run the diagnostics spec and confirm it passes without IPC**

Run:
```bash
electron-vite build && npx playwright test e2e/tests-flow/live-enrichment-diagnostics.spec.ts --config=e2e/playwright.electron.config.ts
```

Expected: PASS. No `api` fixture or direct config/model inspection should be needed.

- [ ] **Step 5: Commit the diagnostics rewrite**

Run:
```bash
git add e2e/pages/settings.page.ts e2e/tests-flow/live-enrichment-diagnostics.spec.ts
git commit -m "test: rewrite diagnostics spec around visible ui state"
```

## Task 4: Rewrite the runtime contract around real first-start navigation

**Files:**
- Modify: `e2e/pages/first-start.page.ts`
- Modify: `e2e/pages/applicant-list.page.ts`
- Modify: `e2e/pages/applicant.page.ts`
- Modify: `e2e/tests-flow/runtime-contract.spec.ts`

- [ ] **Step 1: Rewrite the runtime-contract spec so it skips setup through the wizard, reaches missing-key warnings through the UI, then proves the next run starts clean again**

Replace `e2e/tests-flow/runtime-contract.spec.ts` with:

```ts
import { test, expect } from "../fixtures.js"
import { configureLiveProviders } from "../helpers/live-e2e-setup.js"

test.describe("Live E2E runtime contract", () => {
  test.describe.configure({ mode: "serial" })

  test("starts clean, reaches missing-key warnings through real first-start navigation, and can then configure keys through Settings", async ({
    applicantListPage,
    applicantPage,
    firstStartPage,
    jobSearchPage,
    layoutPage,
    settingsPage,
  }) => {
    await firstStartPage.assertVisible()
    await firstStartPage.skipSettings()

    await applicantListPage.assertWizardVisible()
    await applicantListPage.fillPersonalDetails({
      name: `e2e-runtime-${Date.now()}`,
      street: "Friedrichstraße 100",
      zip: "10117",
      city: "Berlin",
    })
    await applicantListPage.advanceWizardToLastStep()
    await applicantListPage.wizardFinishButton.click()

    await applicantPage.assertJobSearchWizardVisible()
    await applicantPage.field("Suchbegriff").fill("Softwareentwickler")
    await applicantPage.field("Max. Ergebnisse").fill("5")
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardContinueButton.click()
    await applicantPage.sourceButton("arbeitsagentur").click()
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardFinishButton.click()

    const jobSearchId = /\/job-searches\/([^/]+)\/vacancies/
      .exec(jobSearchPage.page.url())?.[1]
    if (!jobSearchId) {
      throw new Error(`Could not parse job search id from ${jobSearchPage.page.url()}`)
    }

    await expect(jobSearchPage.missingKeyNote).toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).toBeVisible()

    await layoutPage.sidebarSettingsLink.click()
    await configureLiveProviders(settingsPage)

    await jobSearchPage.gotoVacancies(jobSearchId)
    await expect(jobSearchPage.missingKeyNote).not.toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).not.toBeVisible()
  })

  test("starts clean again for the next isolated run", async ({
    firstStartPage,
  }) => {
    await firstStartPage.assertVisible()
  })
})
```

- [ ] **Step 2: Run the runtime-contract spec and confirm it fails because the page objects cannot yet drive this first-start flow**

Run:
```bash
electron-vite build && npx playwright test e2e/tests-flow/runtime-contract.spec.ts --config=e2e/playwright.electron.config.ts
```

Expected: FAIL because `skipSettings`, `assertWizardVisible`, `fillPersonalDetails`, and `sourceButton` do not exist yet.

- [ ] **Step 3: Add the first-start skip and shared applicant/job-search wizard helpers**

Extend `e2e/pages/first-start.page.ts`:

```ts
  async skipSettings(): Promise<void> {
    await this.skipButton.click()
    await expect(this.skipConfirmButton).toBeVisible()
    await this.skipConfirmButton.click()
  }
```

Extend `e2e/pages/applicant-list.page.ts`:

```ts
  async assertWizardVisible() {
    await expect(this.wizardCancelButton).toBeVisible()
    await expect(this.wizardTitle).toBeVisible()
  }

  async fillPersonalDetails({
    name,
    street,
    zip,
    city,
  }: {
    name: string
    street: string
    zip: string
    city: string
  }) {
    await this.page.getByLabel("Name").fill(name)
    await this.page.getByLabel("Straße").fill(street)
    await this.page.getByLabel("PLZ").fill(zip)
    await this.page.getByLabel("Stadt").fill(city)
  }
```

Extend `e2e/pages/applicant.page.ts`:

```ts
  sourceButton(name: string): Locator {
    return this.page.getByRole("button", { name, exact: true })
  }

  async assertJobSearchWizardVisible() {
    await expect(this.wizardStepHeading(1)).toBeVisible()
    await expect(this.wizardContinueButton).toBeVisible()
  }
```

- [ ] **Step 4: Re-run the runtime-contract spec and confirm it passes**

Run:
```bash
electron-vite build && npx playwright test e2e/tests-flow/runtime-contract.spec.ts --config=e2e/playwright.electron.config.ts
```

Expected: PASS. Test 1 should skip settings, surface missing-key notes on the vacancies page, then remove them through the real settings UI. Test 2 should start clean again.

- [ ] **Step 5: Commit the runtime-contract rewrite**

Run:
```bash
git add e2e/pages/first-start.page.ts e2e/pages/applicant-list.page.ts e2e/pages/applicant.page.ts e2e/tests-flow/runtime-contract.spec.ts
git commit -m "test: route runtime contract through first-start ui"
```

## Task 5: Rewrite the major live flow to UI-only and remove the IPC helper path

**Files:**
- Modify: `e2e/electron-fixtures.ts`
- Modify: `e2e/helpers/live-e2e-setup.ts`
- Modify: `e2e/helpers/live-flow-helper.ts`
- Delete: `e2e/helpers/electron-api-helper.ts`
- Modify: `e2e/pages/job-search.page.ts`
- Modify: `e2e/tests-flow/live-flow.spec.ts`

- [ ] **Step 1: Rewrite the live-flow spec so it finishes first-start settings through the UI and never destructures the `api` fixture**

Replace `e2e/tests-flow/live-flow.spec.ts` with:

```ts
import { test, expect } from "../fixtures.js"
import { finishFirstStartSettingsWithLiveCredentials } from "../helpers/live-e2e-setup.js"
import { LiveFlowHelper } from "../helpers/live-flow-helper.js"

test.describe("Live major flow", () => {
  test.describe.configure({ timeout: 300_000 })

  test("crawls arbeitsagentur, enriches vacancies, computes commute, and generates a cover letter", async ({
    applicantListPage,
    applicantPage,
    firstStartPage,
    jobSearchPage,
    page,
    settingsPage,
  }) => {
    const consoleErrors: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text())
      }
    })

    const helper = new LiveFlowHelper(
      applicantListPage,
      applicantPage,
      jobSearchPage,
    )

    await finishFirstStartSettingsWithLiveCredentials(
      firstStartPage,
      settingsPage,
    )

    await helper.completeFirstStartApplicantWithCity(`e2e-live-${Date.now()}`)
    const jobSearchId =
      await helper.completeFirstStartJobSearchWithBoundedResults(
        "Softwareentwickler",
      )

    await expect(jobSearchPage.missingKeyNote).not.toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).not.toBeVisible()

    const vacancyCount = await helper.startCrawlAndWaitForVacancies()
    expect(vacancyCount).toBeGreaterThanOrEqual(1)
    expect(vacancyCount).toBeLessThanOrEqual(5)

    await helper.enrichAllVisibleVacancies()
    expect(consoleErrors).toEqual([])

    await helper.openVacancyWithCommute(jobSearchId)

    await expect(jobSearchPage.summaryHeading).toBeVisible()
    await expect(jobSearchPage.commuteHeading).toBeVisible()
    await expect(jobSearchPage.sourceLink("arbeitsagentur")).toBeVisible()
    await expect(jobSearchPage.coverLetterInput).toBeVisible()

    await jobSearchPage.generateButton.click()

    await expect
      .poll(
        async () => {
          return (await jobSearchPage.coverLetterInput.inputValue())
            .trim()
            .length
        },
        {
          timeout: 120_000,
          intervals: [1_000, 2_000, 5_000],
        },
      )
      .toBeGreaterThan(0)

    await expect(jobSearchPage.coverLetterInput).toHaveValue(/\S/)
  })
})
```

- [ ] **Step 2: Run the live-flow spec and confirm it fails because the helper still depends on the IPC backdoor**

Run:
```bash
electron-vite build && npx playwright test e2e/tests-flow/live-flow.spec.ts --config=e2e/playwright.electron.config.ts
```

Expected: FAIL because `LiveFlowHelper` still expects `ElectronApiHelper` and still polls hidden state.

- [ ] **Step 3: Refactor the helper/page objects to visible UI waits only, then remove the IPC helper fixture and file**

Update `e2e/helpers/live-flow-helper.ts` to become page-object only:

```ts
import { expect } from "@playwright/test"
import type {
  ApplicantListPage,
  ApplicantPage,
  JobSearchPage,
} from "../pages/index.js"

export class LiveFlowHelper {
  constructor(
    private readonly applicantListPage: ApplicantListPage,
    private readonly applicantPage: ApplicantPage,
    private readonly jobSearchPage: JobSearchPage,
  ) {}

  async completeFirstStartApplicantWithCity(
    name: string,
    city = "Berlin",
  ): Promise<string> {
    await this.applicantListPage.assertWizardVisible()
    await this.applicantListPage.fillPersonalDetails({
      name,
      street: "Friedrichstraße 100",
      zip: "10117",
      city,
    })
    await this.applicantListPage.advanceWizardToLastStep()
    await this.applicantListPage.wizardFinishButton.click()
    await expect(this.applicantPage.page).toHaveURL(/\/first-start\/job-search\/[^/]+$/)

    const applicantId = /\/first-start\/job-search\/([^/]+)$/
      .exec(this.applicantPage.page.url())?.[1]
    if (!applicantId) {
      throw new Error(`Failed to read applicant id from URL: ${this.applicantPage.page.url()}`)
    }
    return applicantId
  }

  async completeFirstStartJobSearchWithBoundedResults(
    searchTerm: string,
  ): Promise<string> {
    await this.applicantPage.assertJobSearchWizardVisible()
    await this.applicantPage.field("Suchbegriff").fill(searchTerm)
    await this.applicantPage.field("Max. Ergebnisse").fill("5")

    await this.applicantPage.wizardContinueButton.click()
    await this.applicantPage.wizardContinueButton.click()
    await this.applicantPage.sourceButton("arbeitsagentur").click()
    await this.applicantPage.wizardContinueButton.click()
    await this.applicantPage.wizardContinueButton.click()
    await this.applicantPage.wizardFinishButton.click()

    await expect(this.jobSearchPage.page).toHaveURL(
      /\/job-searches\/[^/]+\/vacancies/,
    )

    const jobSearchId = /\/job-searches\/([^/]+)\/vacancies/
      .exec(this.jobSearchPage.page.url())?.[1]
    if (!jobSearchId) {
      throw new Error(`Failed to read job search id from URL: ${this.jobSearchPage.page.url()}`)
    }
    return jobSearchId
  }

  async startCrawlAndWaitForVacancies(): Promise<number> {
    await expect(this.jobSearchPage.refreshButton).toBeEnabled()
    await this.jobSearchPage.refreshButton.click()

    let latestCardCount = 0
    let latestSourceCount = 0
    let latestCommuteCardCount = 0

    try {
      await expect
        .poll(
          async () => {
            latestCardCount = await this.jobSearchPage.vacancyCardCount()
            latestSourceCount =
              await this.jobSearchPage.sourceChipCount("arbeitsagentur")
            latestCommuteCardCount =
              await this.jobSearchPage.vacancyCardCountWithCommute()
            const refreshEnabled =
              await this.jobSearchPage.refreshButton.isEnabled()

            return (
              refreshEnabled &&
              latestCardCount >= 1 &&
              latestCardCount <= 5 &&
              latestSourceCount === latestCardCount &&
              latestCommuteCardCount >= 1
            )
          },
          {
            timeout: 180_000,
            intervals: [1_000, 2_000, 5_000],
          },
        )
        .toBe(true)
    } catch {
      throw new Error(
        `Crawl did not finish with 1-5 arbeitsagentur cards and a visible commute result. cards=${latestCardCount}, sources=${latestSourceCount}, commuteCards=${latestCommuteCardCount}`,
      )
    }

    return latestCardCount
  }

  async enrichAllVisibleVacancies(): Promise<void> {
    if (await this.jobSearchPage.isEnrichAllButtonVisible()) {
      await this.jobSearchPage.enrichAllButton.click()
    }

    let latestCardCount = 0

    try {
      await expect
        .poll(
          async () => {
            latestCardCount = await this.jobSearchPage.vacancyCardCount()
            const enrichVisible =
              await this.jobSearchPage.isEnrichAllButtonVisible()
            return latestCardCount > 0 && !enrichVisible
          },
          {
            timeout: 180_000,
            intervals: [1_000, 2_000, 5_000],
          },
        )
        .toBe(true)
    } catch {
      throw new Error(
        `Enrichment did not finish in time. cards=${latestCardCount}`,
      )
    }
  }

  async openVacancyWithCommute(jobSearchId: string): Promise<void> {
    await this.jobSearchPage.firstVacancyCardWithCommute().click()
    await expect(this.jobSearchPage.page).toHaveURL(
      new RegExp(`/job-searches/${jobSearchId}/vacancies/[^/]+$`),
    )
  }
}
```

Extend `e2e/pages/job-search.page.ts` with the locators the helper needs:

```ts
  vacancyCards(): Locator {
    return this.page.locator("a[href*='/vacancies/']").filter({
      has: this.page.locator("span.font-mono"),
    })
  }

  vacancyCardsWithCommute(): Locator {
    return this.vacancyCards().filter({
      hasText: /\d+ min \(.+\)/,
    })
  }

  firstVacancyCardWithCommute(): Locator {
    return this.vacancyCardsWithCommute().first()
  }

  async vacancyCardCount(): Promise<number> {
    return this.vacancyCards().count()
  }

  async vacancyCardCountWithCommute(): Promise<number> {
    return this.vacancyCardsWithCommute().count()
  }

  async sourceChipCount(site: string): Promise<number> {
    return this.page.getByRole("link", { name: site, exact: true }).count()
  }

  async isEnrichAllButtonVisible(): Promise<boolean> {
    return this.enrichAllButton.isVisible().catch(() => false)
  }
```

Now remove the IPC-only helper path:

- delete `e2e/helpers/electron-api-helper.ts`
- remove `api` from `Fixtures` in `e2e/electron-fixtures.ts`
- remove the `api` fixture block from `e2e/electron-fixtures.ts`
- remove the `ElectronApiHelper` import from `e2e/electron-fixtures.ts`
- remove the now-unused `assertLiveProvidersReady()` export from `e2e/helpers/live-e2e-setup.ts`

The relevant `e2e/electron-fixtures.ts` type block should end up like this:

```ts
type Fixtures = {
  electronApp: ElectronApplication
  firstStartPage: FirstStartPage
  applicantListPage: ApplicantListPage
  applicantPage: ApplicantPage
  jobSearchPage: JobSearchPage
  layoutPage: LayoutPage
  settingsPage: SettingsPage
}
```

- [ ] **Step 4: Re-run the live-flow spec and confirm it passes without IPC**

Run:
```bash
electron-vite build && npx playwright test e2e/tests-flow/live-flow.spec.ts --config=e2e/playwright.electron.config.ts
```

Expected: PASS. The flow should configure keys in first-start, create applicant/job-search through the real wizards, crawl 1-5 Arbeitsagentur vacancies, enrich them, and generate a non-empty vacancy cover letter.

- [ ] **Step 5: Commit the UI-only live-flow rewrite and IPC helper removal**

Run:
```bash
git add e2e/electron-fixtures.ts e2e/helpers/live-e2e-setup.ts e2e/helpers/live-flow-helper.ts e2e/pages/job-search.page.ts e2e/tests-flow/live-flow.spec.ts
git rm e2e/helpers/electron-api-helper.ts
git commit -m "test: remove ipc shortcuts from live e2e flow"
```

## Task 6: Verify no active E2E path still uses direct IPC and run the full suite

**Files:**
- Modify only if `npm run fix` produces follow-up formatting/import cleanup.

- [ ] **Step 1: Search the E2E tree for leftover direct IPC usage**

Run:
```bash
rg -n "ElectronApiHelper|window\.electronAPI\.invoke|\bapi,?$" e2e
```

Expected: no matches inside active tests/helpers/fixtures. If a stray import or destructured `api` remains, remove it before continuing.

- [ ] **Step 2: Run the fixer one last time**

Run:
```bash
npm run fix
```

Expected: PASS. Any touched files are formatting/import-only cleanup.

- [ ] **Step 3: Run the focused E2E specs directly**

Run:
```bash
electron-vite build && npx playwright test e2e/tests-flow/first-start-wizard.spec.ts e2e/tests-flow/live-enrichment-diagnostics.spec.ts e2e/tests-flow/runtime-contract.spec.ts e2e/tests-flow/live-flow.spec.ts --config=e2e/playwright.electron.config.ts
```

Expected: PASS. All four targeted live specs should pass using only visible UI interactions.

- [ ] **Step 4: Run the repository’s required full verification command**

Run:
```bash
npm run test:all
```

Expected: PASS. Unit, integration, and E2E suites all succeed.

- [ ] **Step 5: Commit any final fix-only cleanup**

Run:
```bash
git add -A
git commit -m "test: finalize life-like e2e coverage"
```

Expected: if `npm run fix` changed nothing, there may be nothing left to commit; in that case, skip this step and leave the previous task’s commit as the final code commit.
