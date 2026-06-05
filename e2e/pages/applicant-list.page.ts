import { expect, type Locator, type Page } from "@playwright/test"

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

  wizardStepHeading(step: ApplicantWizardStep): Locator {
    return this.page.getByRole("heading", { name: step, level: 1 })
  }

  async assertListVisible() {
    await expect(this.heading).toBeVisible()
    await expect(this.newApplicantButton).toBeVisible()
  }

  async continueToStep(step: ApplicantWizardStep) {
    await this.wizardContinueButton.click()
    await expect(this.wizardStepHeading(step)).toBeVisible()
  }

  async fillPersonalStep(seed: {
    name: string
    email: string
    phone: string
    birthdate: string
    gender: string
    street: string
    zip: string
    city: string
  }) {
    await expect(
      this.page.getByRole("heading", { name: "Persönlich", level: 1 }),
    ).toBeVisible({ timeout: 15_000 })
    await this.page.getByLabel("Name").fill(seed.name)
    await this.page.getByLabel("E-Mail").fill(seed.email)
    await this.page.getByLabel("Telefon").fill(seed.phone)
    await this.page.getByLabel("Geburtsdatum").fill(seed.birthdate)
    await this.page.getByLabel("Geschlecht").fill(seed.gender)
    await this.page.getByLabel("Straße").fill(seed.street)
    await this.page.getByLabel("PLZ").fill(seed.zip)
    await this.page.getByLabel("Stadt").fill(seed.city)
  }

  async fillExperienceStep(seed: {
    role: string
    company: string
    startDate: string
    endDate: string
    location: string
    highlights: string
  }) {
    await this.page
      .getByRole("button", { name: "Erfahrung hinzufügen" })
      .click()
    await this.page.getByLabel("Position").fill(seed.role)
    await this.page.getByLabel("Unternehmen").fill(seed.company)
    await this.page.getByLabel("Von").fill(seed.startDate)
    await this.page.getByLabel("Bis").fill(seed.endDate)
    await this.page.getByLabel("Ort").fill(seed.location)
    await this.page
      .getByLabel("Highlights (eine pro Zeile)")
      .fill(seed.highlights)
  }

  async fillEducationStep(seed: {
    institution: string
    course: string
    startDate: string
    endDate: string
    location: string
    highlights: string
  }) {
    await this.page
      .getByRole("button", { name: "Ausbildung hinzufügen" })
      .click()
    await this.page.getByLabel("Institution").fill(seed.institution)
    await this.page.getByLabel("Studiengang").fill(seed.course)
    await this.page.getByLabel("Von").fill(seed.startDate)
    await this.page.getByLabel("Bis").fill(seed.endDate)
    await this.page.getByLabel("Ort").fill(seed.location)
    await this.page
      .getByLabel("Highlights (eine pro Zeile)")
      .fill(seed.highlights)
  }

  async fillCertificationStep(seed: {
    name: string
    issuer: string
    date: string
    description: string
  }) {
    await this.page
      .getByRole("button", { name: "Zertifikat hinzufügen" })
      .click()
    await this.page.getByLabel("Name").fill(seed.name)
    await this.page.getByLabel("Aussteller").fill(seed.issuer)
    await this.page.getByRole("textbox", { name: "Datum" }).fill(seed.date)
    await this.page.getByLabel("Beschreibung").fill(seed.description)
  }

  async fillOtherStep(seed: {
    skill: string
    language: string
    level: string
    hobbies: string
    personalNote: string
  }) {
    await this.page
      .getByRole("button", { name: "Kenntnis hinzufügen" })
      .click()
    await this.page.getByLabel("Kenntnis").fill(seed.skill)

    await this.page
      .getByRole("button", { name: "Sprache hinzufügen" })
      .click()
    await this.page.getByLabel("Sprache").fill(seed.language)
    await this.page.getByLabel("Niveau").fill(seed.level)

    await this.page.getByLabel("Hobbys (kommagetrennt)").fill(seed.hobbies)
    await this.page.getByLabel("Notizen (eine pro Zeile)").fill(seed.personalNote)
  }

  async openFirstApplicant() {
    await this.page.locator("div[role='button'].cursor-pointer").first().click()
  }
}

const APPLICANT_WIZARD_STEP_HEADINGS = [
  "Persönlich",
  "Berufserfahrung",
  "Ausbildung",
  "Zertifikate",
  "Sonstiges",
] as const

type ApplicantWizardStep =
  | "Persönlich"
  | "Berufserfahrung"
  | "Ausbildung"
  | "Zertifikate"
  | "Sonstiges"
