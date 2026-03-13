import type { Locator, Page } from "@playwright/test";

export class JobSearchPage {
  readonly page: Page;
  readonly configHeading: Locator;
  readonly searchModeHeading: Locator;
  readonly festanstellungButton: Locator;
  readonly berufseinsteigerButton: Locator;
  readonly ausbildungButton: Locator;
  readonly coverLetterHeading: Locator;
  readonly generateButton: Locator;
  readonly generatingButton: Locator;
  readonly vacanciesHeading: Locator;
  readonly refreshButton: Locator;
  readonly sortDatum: Locator;
  readonly sortUnternehmen: Locator;
  readonly sortFahrtzeit: Locator;
  readonly sortBewertung: Locator;
  readonly contactSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.configHeading = page.getByRole("heading", {
      name: "Suchkonfiguration",
    });
    this.searchModeHeading = page.getByRole("heading", {
      name: "Suchmodus",
      exact: true,
    });
    this.festanstellungButton = page.getByRole("button", {
      name: "Festanstellung",
      exact: true,
    });
    this.berufseinsteigerButton = page.getByRole("button", {
      name: "Berufseinsteiger",
    });
    this.ausbildungButton = page.getByRole("button", { name: "Ausbildung" });
    this.coverLetterHeading = page.getByRole("heading", {
      name: "Anschreiben-Vorlage",
    });
    this.generateButton = page.getByRole("button", { name: "Generieren" });
    this.generatingButton = page.getByRole("button", { name: "Generiere..." });
    this.vacanciesHeading = page.getByRole("heading", { name: /Stellen/ });
    this.refreshButton = page.getByRole("button", { name: "Aktualisieren" });
    this.sortDatum = page.getByRole("button", { name: "Datum" });
    this.sortUnternehmen = page.getByRole("button", { name: "Unternehmen" });
    this.sortFahrtzeit = page.getByRole("button", { name: "Fahrtzeit" });
    this.sortBewertung = page.getByRole("button", { name: "Bewertung" });
    this.contactSection = page.getByText("Ansprechpartner");
  }

  navLink(name: string): Locator {
    return this.page.locator("aside nav").getByRole("link", { name });
  }

  sourceLink(site: string): Locator {
    return this.page.getByRole("link", { name: site, exact: true });
  }

  contactLink(text: string): Locator {
    return this.page.getByRole("link", { name: text });
  }

  async gotoConfig(id: string) {
    await this.page.goto(`/job-searches/${id}`);
  }

  async gotoCoverLetter(id: string) {
    await this.page.goto(`/job-searches/${id}/cover-letter`);
  }

  async gotoVacancies(id: string) {
    await this.page.goto(`/job-searches/${id}/vacancies`);
  }

  async gotoVacancyDetail(id: string, hash: string) {
    await this.page.goto(`/job-searches/${id}/vacancies/${hash}`);
  }
}
