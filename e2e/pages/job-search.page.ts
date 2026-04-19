import type { Locator, Page } from "@playwright/test"

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
    this.enrichAllButton = page.getByRole("button", { name: "Alle analysieren" })
    this.sortDatum = page.getByRole("button", { name: "Datum" })
    this.sortUnternehmen = page.getByRole("button", { name: "Unternehmen" })
    this.sortFahrtzeit = page.getByRole("button", { name: "Fahrtzeit" })
    this.sortBewertung = page.getByRole("button", { name: "Bewertung" })
    this.contactSection = page.getByText("Ansprechpartner")
    this.summaryHeading = page.getByRole("heading", { name: "Zusammenfassung" })
    this.commuteHeading = page.getByRole("heading", { name: "Fahrtweg" })
    this.coverLetterInput = page.getByLabel("Anschreiben")
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
}
