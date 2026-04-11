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
    this.wizardStepOneHeading = page.getByText(
      "Schritt 1 von 5: Suchkonfiguration",
    )
    this.wizardStepTwoHeading = page.getByText(
      "Schritt 2 von 5: Suchkonfiguration",
    )
    this.wizardStepThreeHeading = page.getByText(
      "Schritt 3 von 5: Suchkonfiguration",
    )
    this.wizardStepFourHeading = page.getByText(
      "Schritt 4 von 5: Suchkonfiguration",
    )
    this.wizardStepFiveHeading = page.getByText("Schritt 5 von 5: Anschreiben")
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
    const headingText =
      step === 5
        ? "Schritt 5 von 5: Anschreiben"
        : `Schritt ${step} von 5: Suchkonfiguration`
    return this.page.getByText(headingText)
  }

  async openWizard() {
    await this.newSearchButton.click()
    await expect(this.wizardStepHeading(1)).toBeVisible()
  }

  async advanceWizardToCoverLetter() {
    for (const step of [2, 3, 4, 5] as const) {
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
}
