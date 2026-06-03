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

  applicantCard(name: string): Locator {
    return this.page.locator(".cursor-pointer", { hasText: name }).first()
  }

  async goto() {
    await this.page.goto("/")
  }

  async openCreateForm() {
    await this.newApplicantButton.click()
    await expect(this.wizardCancelButton).toBeVisible()
  }

  async createApplicant(name: string) {
    await this.openCreateForm()
    await this.page.getByLabel("Name").fill(name)
    await this.advanceWizardToLastStep()
    await this.wizardFinishButton.click()
    await expect(this.wizardFinishButton).not.toBeVisible({ timeout: 15000 })
  }

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

  async openWizard() {
    await this.newApplicantButton.click()
    await expect(this.wizardTitle).toBeVisible()
  }

  async advanceWizardToLastStep() {
    for (const heading of APPLICANT_WIZARD_STEP_HEADINGS.slice(1)) {
      await this.wizardContinueButton.click()
      await expect(
        this.page.getByRole("heading", { name: heading, level: 1 }),
      ).toBeVisible()
    }
  }

  async navigateToApplicant(name: string): Promise<string> {
    await this.applicantCard(name).click()
    const url = this.page.url()
    return url.split("/applicants/")[1]?.split("/")[0] ?? ""
  }
}

const APPLICANT_WIZARD_STEP_HEADINGS = [
  "Persönlich",
  "Berufserfahrung",
  "Ausbildung",
  "Zertifikate",
  "Sonstiges",
] as const
