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
}

const APPLICANT_WIZARD_STEP_HEADINGS = [
  "Persönlich",
  "Berufserfahrung",
  "Ausbildung",
  "Zertifikate",
  "Sonstiges",
] as const

function readApplicantIdFromUrl(url: string): string {
  const applicantId = /\/applicants\/([^/]+)$/.exec(url)?.[1]
  if (!applicantId) {
    throw new Error(`Failed to read applicant id from URL: ${url}`)
  }
  return applicantId
}
