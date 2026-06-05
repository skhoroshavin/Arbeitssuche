import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"

export class ApplicantPage {
  readonly page: Page
  readonly checkboxes: Locator
  readonly newSearchButton: Locator
  readonly searchTermInput: Locator
  readonly createButton: Locator
  readonly savedStatus: Locator
  readonly unsavedStatus: Locator
  readonly jobSearchHeading: Locator
  readonly wizardStepOneHeading: Locator
  readonly wizardStepTwoHeading: Locator
  readonly wizardStepThreeHeading: Locator
  readonly wizardStepFourHeading: Locator
  readonly wizardStepFiveHeading: Locator
  readonly coverLetterTemplateField: Locator
  readonly wizardContinueButton: Locator
  readonly wizardFinishButton: Locator
  readonly wizardCancelButton: Locator
  readonly wizardKeepDraftButton: Locator
  readonly resumeDraftDialogTitle: Locator
  readonly resumeDraftButton: Locator
  readonly discardDraftButton: Locator

  constructor(page: Page) {
    this.page = page
    this.checkboxes = page.getByRole("checkbox")
    this.newSearchButton = page.getByRole("button", { name: "Neue Suche" })
    this.searchTermInput = page.getByPlaceholder(
      "Suchbegriff (z.B. React Entwickler)",
    )
    this.createButton = page.getByRole("button", { name: "Erstellen" })
    this.savedStatus = page.getByText("Gespeichert", { exact: true })
    this.unsavedStatus = page.getByText("Ungespeicherte Änderungen")
    this.jobSearchHeading = page.getByRole("heading", { name: "Jobsuchen" })
    this.wizardStepOneHeading = page.getByRole("heading", {
      name: "Suchparameter",
    })
    this.wizardStepTwoHeading = page.getByRole("heading", { name: "Suchmodus" })
    this.wizardStepThreeHeading = page.getByRole("heading", {
      name: /Jobboersen/,
    })
    this.wizardStepFourHeading = page.getByRole("heading", {
      name: "Praferenzen",
    })
    this.wizardStepFiveHeading = page.getByLabel("Anschreiben")
    this.coverLetterTemplateField = page.getByLabel("Anschreiben")
    this.wizardContinueButton = page.getByRole("button", { name: "Weiter" })
    this.wizardFinishButton = page.getByRole("button", {
      name: "Fertigstellen",
    })
    this.wizardCancelButton = page.getByRole("button", { name: "Abbrechen" })
    this.wizardKeepDraftButton = page.getByRole("button", {
      name: "Entwurf behalten",
    })
    this.resumeDraftDialogTitle = page.getByText("Entwurf gefunden")
    this.resumeDraftButton = page.getByRole("button", {
      name: "Entwurf fortsetzen",
    })
    this.discardDraftButton = page.getByRole("button", {
      name: "Entwurf verwerfen",
    })
  }

  sourceButton(name: string): Locator {
    return this.page.getByRole("button", { name, exact: true })
  }

  async assertJobSearchWizardVisible() {
    await expect(this.wizardStepHeading(1)).toBeVisible()
    await expect(this.wizardContinueButton).toBeVisible()
  }

  tabLink(name: string): Locator {
    return this.page.getByRole("link", { name })
  }

  heading(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true })
  }

  field(label: string): Locator {
    return this.page.getByLabel(label)
  }

  templateButton(name: string): Locator {
    return this.page.getByRole("button", { name: new RegExp(name) })
  }

  async goto(id: string) {
    await this.page.goto(`/applicants/${id}`)
  }

  async gotoTab(id: string, tab: string) {
    await this.page.goto(`/applicants/${id}/${tab}`)
  }

  async expectAllTabsVisible() {
    const tabs = [
      "Übersicht",
      "Persönlich",
      "Erfahrung",
      "Ausbildung",
      "Zertifikate",
      "Sonstiges",
    ]
    for (const tab of tabs) {
      await expect(this.tabLink(tab)).toBeVisible()
    }
  }

  async navigateToTab(name: string, expectedHeading: string) {
    await this.tabLink(name).click()
    await expect(this.heading(expectedHeading)).toBeVisible()
  }

  async createJobSearch(term: string) {
    await this.openWizard()
    if (term.length > 0) {
      await this.field("Suchbegriff").fill(term)
    }
  }

  wizardStepHeading(step: 1 | 2 | 3 | 4 | 5): Locator {
    if (step === 1) return this.wizardStepOneHeading
    if (step === 2) return this.wizardStepTwoHeading
    if (step === 3) return this.wizardStepThreeHeading
    if (step === 4) return this.wizardStepFourHeading
    return this.wizardStepFiveHeading
  }

  async openWizard() {
    await this.newSearchButton.click()
    await expect(this.wizardStepHeading(1)).toBeVisible()
  }

  async advanceWizardToCoverLetter() {
    for (const step of JOB_SEARCH_WIZARD_STEPS.slice(1)) {
      await this.wizardContinueButton.click()
      await expect(this.wizardStepHeading(step)).toBeVisible()
    }
  }

  async finishWizard(searchTerm: string) {
    await this.openWizard()
    if (searchTerm.length > 0) {
      await this.field("Suchbegriff").fill(searchTerm)
    }
    await this.advanceWizardToCoverLetter()
    await this.wizardFinishButton.click()
  }

  async openAndDismissSearchForm(term: string) {
    await this.newSearchButton.click()
    await this.searchTermInput.fill(term)
    await this.page.keyboard.press("Escape")
  }

  async downloadTemplate(name: string) {
    await this.templateButton(name).click()
  }

  async continueToWizardStep(step: 2 | 3 | 4 | 5) {
    await this.wizardContinueButton.click()
    await expect(this.wizardStepHeading(step)).toBeVisible()
  }

  async fillSearchParameters(seed: {
    searchTerm: string
    maxResultsPerSource: string
  }) {
    await this.field("Suchbegriff").fill(seed.searchTerm)
    await this.field("Max. Ergebnisse").fill(seed.maxResultsPerSource)
  }

  async enableOnlySources(sources: readonly string[]) {
    for (const source of sources) {
      await this.sourceButton(source).click()
    }

    await expect(this.page.locator("button.bg-zinc-700")).toHaveCount(
      sources.length,
    )
    for (const source of sources) {
      await expect(this.sourceButton(source)).toHaveClass(/bg-zinc-700/)
    }
  }
}

const JOB_SEARCH_WIZARD_STEPS = [1, 2, 3, 4, 5] as const
