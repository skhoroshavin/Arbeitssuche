import { expect, type Locator, type Page } from "@playwright/test"

export class JobSearchPage {
  readonly page: Page
  readonly configHeading: Locator
  readonly searchModeHeading: Locator
  readonly festanstellungButton: Locator
  readonly berufseinsteigerButton: Locator
  readonly ausbildungButton: Locator
  readonly coverLetterHeading: Locator
  readonly generateButton: Locator
  readonly vacanciesHeading: Locator
  readonly refreshButton: Locator
  readonly enrichAllButton: Locator
  readonly sortDatum: Locator
  readonly sortUnternehmen: Locator
  readonly sortFahrtzeit: Locator
  readonly sortBewertung: Locator
  readonly contactSection: Locator
  readonly summaryHeading: Locator
  readonly commuteHeading: Locator
  readonly coverLetterInput: Locator
  readonly activitySection: Locator
  readonly confirmActivityButton: Locator
  readonly cancelActivityButton: Locator
  readonly activityDateInput: Locator
  readonly activityHistorySection: Locator

  constructor(page: Page) {
    this.page = page
    this.configHeading = page.getByRole("heading", {
      name: "Suchkonfiguration",
    })
    this.searchModeHeading = page.getByRole("heading", {
      name: "Suchmodus",
      exact: true,
    })
    this.festanstellungButton = page.getByRole("button", {
      name: "Festanstellung",
      exact: true,
    })
    this.berufseinsteigerButton = page.getByRole("button", {
      name: "Berufseinsteiger",
    })
    this.ausbildungButton = page.getByRole("button", { name: "Ausbildung" })
    this.coverLetterHeading = page.getByRole("heading", {
      name: "Anschreiben-Vorlage",
    })
    this.generateButton = page.getByRole("button", { name: "Generieren" })
    this.vacanciesHeading = page.getByRole("heading", { name: /Stellen/ })
    this.refreshButton = page.getByRole("button", { name: "Aktualisieren" })
    this.enrichAllButton = page.getByRole("button", {
      name: "Alle analysieren",
    })
    this.sortDatum = page.getByRole("button", { name: "Datum" })
    this.sortUnternehmen = page.getByRole("button", { name: "Unternehmen" })
    this.sortFahrtzeit = page.getByRole("button", { name: "Fahrtzeit" })
    this.sortBewertung = page.getByRole("button", { name: "Bewertung" })
    this.contactSection = page.getByText("Ansprechpartner")
    this.summaryHeading = page.getByRole("heading", { name: "Zusammenfassung" })
    this.commuteHeading = page.getByRole("heading", { name: "Fahrtweg" })
    this.coverLetterInput = page.getByLabel("Anschreiben")
    this.activitySection = page.locator("text=Aktionen")
    this.confirmActivityButton = page.getByRole("button", {
      name: "Bestätigen",
    })
    this.cancelActivityButton = page.getByRole("button", { name: "Abbrechen" })
    this.activityDateInput = page.locator('input[type="date"]')
    this.activityHistorySection = page.getByText("Aktivitätshistorie")
  }

  filterButton(label: string): Locator {
    return this.page.getByRole("button", { name: label, exact: true })
  }

  vacancyCard(title: string): Locator {
    return this.page.getByRole("link", { name: title })
  }

  get backLink(): Locator {
    return this.page.getByRole("link", { name: "Zurück zu Stellen" })
  }

  navLink(name: string): Locator {
    return this.page.locator("aside nav").getByRole("link", { name })
  }

  sourceLink(site: string): Locator {
    return this.page.getByRole("link", { name: site, exact: true })
  }

  contactLink(text: string): Locator {
    return this.page.getByRole("link", { name: text })
  }

  async gotoConfig(id: string) {
    await this.page.goto(`/job-searches/${id}/config`)
  }

  async gotoCoverLetter(id: string) {
    await this.page.goto(`/job-searches/${id}/cover-letter`)
  }

  async gotoVacancies(id: string) {
    await this.page.goto(`/job-searches/${id}/vacancies`)
  }

  get missingKeyNote(): Locator {
    return this.page.locator("text=Ohne KI-Schlüssel").first()
  }

  get missingMapsKeyNote(): Locator {
    return this.page.locator("text=Ohne Maps-Schlüssel").first()
  }

  get settingsLink(): Locator {
    return this.page.getByRole("link", { name: "KI-Einstellungen" })
  }

  get llmRequiredNotice(): Locator {
    return this.page.locator("text=KI-Schlüssel erforderlich").first()
  }

  async gotoVacancyDetail(id: string, hash: string) {
    await this.page.goto(`/job-searches/${id}/vacancies/${hash}`)
  }

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

  async expectActivityHistoryContains(statuses: string[]): Promise<void> {
    await expect(this.activityHistorySection).toBeVisible()
    for (const status of statuses) {
      const entry = this.activityHistorySection.locator("..").getByText(status)
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
}
