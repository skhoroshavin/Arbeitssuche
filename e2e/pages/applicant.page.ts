import {
  expect,
  type Locator,
  type Page,
  type Download,
} from "@playwright/test"

export class ApplicantPage {
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
    this.wizardStepHeadings = {
      1: this.wizardStepOneHeading,
      2: this.wizardStepTwoHeading,
      3: this.wizardStepThreeHeading,
      4: this.wizardStepFourHeading,
      5: this.wizardStepFiveHeading,
    }
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

  readonly wizardStepHeadings: Record<number, Locator>

  readonly wizardContinueButton: Locator

  readonly wizardFinishButton: Locator

  readonly wizardCancelButton: Locator

  readonly wizardKeepDraftButton: Locator

  readonly resumeDraftDialogTitle: Locator

  readonly resumeDraftButton: Locator

  readonly discardDraftButton: Locator

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

  heading(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true })
  }

  async createJobSearch(term: string) {
    await this.openWizard()
    if (term.length > 0) {
      await this.field("Suchbegriff").fill(term)
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

  wizardStepHeading(step: 1 | 2 | 3 | 4 | 5): Locator {
    return this.wizardStepHeadings[step]
  }

  async openAndDismissSearchForm(term: string) {
    await this.newSearchButton.click()
    await this.searchTermInput.fill(term)
    await this.page.keyboard.press("Escape")
  }

  async downloadTemplate(name: string) {
    await this.templateButton(name).click()
  }

  async downloadResumeTemplate(template: string): Promise<Download> {
    const downloadPromise = this.page.waitForEvent("download")
    await this.templateButton(template).click()
    return downloadPromise
  }

  templateButton(name: string): Locator {
    return this.page.getByRole("button", { name: new RegExp(name) })
  }

  async expectFieldHasValue(
    label: string,
    expectedValue: string,
  ): Promise<void> {
    const input = this.field(label)
    await expect(input).toHaveValue(expectedValue)
  }

  field(label: string): Locator {
    return this.page.getByLabel(label)
  }

  async navigateToOverviewTab(): Promise<void> {
    await this.tabLink("Übersicht").click()
    await expect(
      this.page.getByRole("heading", { name: "Lebenslauf" }),
    ).toBeVisible()
  }

  tabLink(name: string): Locator {
    return this.page.getByRole("link", { name })
  }

  async deleteJobSearchFromList(jobSearchTerm: string): Promise<void> {
    const card = this.page.locator(".cursor-pointer", {
      hasText: jobSearchTerm,
    })
    const deleteButton = card.locator("button", { hasText: "Löschen" })
    await deleteButton.click()
  }
}
