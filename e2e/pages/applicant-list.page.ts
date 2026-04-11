import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"

export class ApplicantListPage {
  readonly page: Page
  readonly heading: Locator
  readonly newApplicantButton: Locator
  readonly wizardTitle: Locator
  readonly wizardContinueButton: Locator
  readonly wizardFinishButton: Locator
  readonly wizardCancelButton: Locator
  readonly wizardKeepDraftButton: Locator
  readonly wizardResumeDraftDialogTitle: Locator
  readonly wizardResumeDraftButton: Locator
  readonly wizardStartOverButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole("heading", { name: "Bewerber" })
    this.newApplicantButton = page.getByRole("button", {
      name: "Neuer Bewerber",
    })
    this.wizardTitle = page.getByText("Schritt 1 von 5: Persönlich")
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
    this.wizardStartOverButton = page.getByRole("button", {
      name: "Neu starten",
    })
  }

  applicantCard(name: string): Locator {
    return this.page.locator(".cursor-pointer", { hasText: name }).first()
  }

  async goto() {
    await this.page.goto("/")
  }

  async openCreateForm() {
    await this.newApplicantButton.click()
  }

  async createApplicant(name: string) {
    await this.openWizard()
    await this.page.getByLabel("Name").fill(name)
    await this.advanceWizardToLastStep()
    await this.wizardFinishButton.click()
    await expect(this.wizardFinishButton).not.toBeVisible({ timeout: 15000 })
  }

  async createApplicantViaEnter(name: string) {
    await this.createApplicant(name)
  }

  async openAndDismissForm(name: string) {
    await this.openWizard()
    await this.page.getByLabel("Name").fill(name)
    await this.wizardCancelButton.click()
  }

  async openWizard() {
    await this.newApplicantButton.click()
    await expect(this.wizardTitle).toBeVisible()
  }

  async advanceWizardToLastStep() {
    for (const step of [2, 3, 4, 5] as const) {
      await this.wizardContinueButton.click()
      await expect(
        this.page.getByText(`Schritt ${step} von 5`, { exact: false }),
      ).toBeVisible()
    }
  }

  async navigateToApplicant(name: string): Promise<string> {
    await this.applicantCard(name).click()
    const url = this.page.url()
    return url.split("/applicants/")[1]?.split("/")[0] ?? ""
  }
}
