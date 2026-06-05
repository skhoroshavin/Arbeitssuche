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
  readonly scanProgressLabel: Locator
  readonly enrichProgressLabel: Locator
  readonly interviewDateInput: Locator
  readonly confirmActivityButton: Locator

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
    this.scanProgressLabel = page.getByText("Wird gescannt...")
    this.enrichProgressLabel = page.getByText("Wird analysiert...")
    this.interviewDateInput = page.getByPlaceholder("Vorstellungstermin")
    this.confirmActivityButton = page.getByRole("button", {
      name: "Bestätigen",
      exact: true,
    })
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

  async waitForProgressToAppear(): Promise<void> {
    await expect
      .poll(
        async () => {
          const scanVisible = await this.scanProgressLabel
            .isVisible()
            .catch(() => false)
          const enrichVisible = await this.enrichProgressLabel
            .isVisible()
            .catch(() => false)
          return scanVisible || enrichVisible
        },
        {
          timeout: 30_000,
          intervals: [500, 1_000, 2_000],
        },
      )
      .toBe(true)
  }

  async waitForProgressToDisappearAndRequireVacancies(): Promise<void> {
    let latestVacancyCount = 0

    await expect
      .poll(
        async () => {
          const scanVisible = await this.scanProgressLabel
            .isVisible()
            .catch(() => false)
          const enrichVisible = await this.enrichProgressLabel
            .isVisible()
            .catch(() => false)
          latestVacancyCount = await this.vacancyCardCount()
          return !scanVisible && !enrichVisible && latestVacancyCount >= 1
        },
        {
          timeout: 240_000,
          intervals: [1_000, 2_000, 5_000],
        },
      )
      .toBe(true)

    expect(latestVacancyCount).toBeGreaterThanOrEqual(1)
  }

  async openFirstVacancy(): Promise<void> {
    await this.vacancyCards().first().click()
  }

  activityButton(label: string): Locator {
    return this.page.getByRole("button", { name: label, exact: true })
  }

  statusBadge(label: string): Locator {
    return this.page.getByText(label, { exact: true }).first()
  }

  async generateCoverLetterAndWaitForContent(): Promise<void> {
    await this.generateButton.click()

    await expect
      .poll(
        async () => {
          return (await this.coverLetterInput.inputValue()).trim().length
        },
        {
          timeout: 120_000,
          intervals: [1_000, 2_000, 5_000],
        },
      )
      .toBeGreaterThan(0)
  }

  async recordActivity(
    actionLabel: string,
    extra?: { interviewDate?: string },
  ): Promise<void> {
    await this.activityButton(actionLabel).click()

    if (extra?.interviewDate) {
      await this.interviewDateInput.fill(extra.interviewDate)
    }

    await this.confirmActivityButton.click()
  }
}
